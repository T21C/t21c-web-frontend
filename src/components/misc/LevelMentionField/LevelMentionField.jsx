// tuf-search: #LevelMentionField #levelMention
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Portal } from '@/components/common/Portal';
import { PORTALED_PANEL_CLASS } from '@/hooks/usePortaledPanelAnchor';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { usePopoverRoot } from '@/utils/portalRoot';
import { normalizeLevelSearchQuery } from '@/utils/normalizeEntitySearchQuery';
import { getArtistDisplayName, getSongDisplayName } from '@/utils/levelHelpers';
import { ICON_SIZE, selectIconSize } from '@/utils/Utility';
import { collectLevelReferenceIds, getLevelReferences, peekLevelReferences } from '@/utils/levelReferences';
import { navbarOffsetPx } from './textareaCaretCoordinates';
import {
  createLevelChip,
  findComposerMention,
  getMentionAnchorRect,
  hydrateEditor,
  insertChipAtMention,
  insertEditorLineBreak,
  insertPlainTextAtCaret,
  normalizeEditorChips,
  placeCaretAfterChip,
  placeCaretAtTokenEnd,
  refreshEditorChips,
  serializeEditor,
  serializeSelection,
  deleteSelection,
  deleteChipAtCaret,
  selectionIntersectsChip,
} from './levelMentionEditor';
import './levelMentionField.css';

const SEARCH_DELAY_MS = 200;
const SEARCH_LIMIT = 8;
const PANEL_WIDTH = 288;
const PANEL_GAP = 6;
const PANEL_MARGIN = 8;

function mergePinId(idHits, textHits, id) {
  const all = [...(idHits || []), ...(textHits || [])];
  const seen = new Set();
  const out = [];
  const pin = all.find((level) => Number(level.id) === id);
  if (pin) {
    out.push(pin);
    seen.add(id);
  }
  for (const level of all) {
    const lid = Number(level.id);
    if (!Number.isInteger(lid) || lid <= 0 || seen.has(lid)) continue;
    seen.add(lid);
    out.push(level);
    if (out.length >= SEARCH_LIMIT) break;
  }
  return out;
}

function emitChange(onChange, name, value) {
  if (!onChange) return;
  onChange({
    target: { name: name || '', value },
    currentTarget: { name: name || '', value },
  });
}

function mentionKey(token) {
  if (!token) return '';
  return `${token.kind}:${token.query}:${token.start}:${token.end}`;
}

export function LevelMentionField({
  as = 'textarea',
  value,
  onChange,
  onKeyDown,
  onKeyUp,
  onClick,
  onSelect,
  onFocus,
  onBlur,
  onCompositionStart,
  onCompositionEnd,
  onPaste,
  onCopy,
  onCut,
  onInput,
  disabled,
  name,
  type: _type,
  className,
  style,
  id,
  placeholder,
  maxLength,
  rows,
  autoFocus,
  autoComplete: _autoComplete,
  spellCheck,
  readOnly,
  ...rest
}) {
  const { t } = useTranslation('common');
  const { difficultyDict } = useDifficultyContext();
  const portalRoot = usePopoverRoot();
  const listDomId = `level-mention-${useId().replace(/:/g, '')}`;
  const editorRef = useRef(null);
  const popupRef = useRef(null);
  const searchInputRef = useRef(null);
  const dismissedRef = useRef(false);
  const tokenIdRef = useRef('');
  const tokenRef = useRef(null);
  const composingRef = useRef(false);
  const cancelRef = useRef([]);
  const searchGenRef = useRef(0);
  const lastEmittedRef = useRef(null);
  const hydratedRef = useRef(false);
  const focusedSearchRef = useRef(false);
  const [mention, setMention] = useState(null);
  const [open, setOpen] = useState(false);
  const [popupQuery, setPopupQuery] = useState('');
  const [results, setResults] = useState([]);
  const [resultsQuery, setResultsQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelStyle, setPanelStyle] = useState(undefined);
  const [caretTick, setCaretTick] = useState(0);
  const [isEmpty, setIsEmpty] = useState(!value);

  const isSingleLine = as === 'input';
  const isLocked = Boolean(disabled || readOnly);
  const textValue = value == null ? '' : String(value);
  const showSearch = Boolean(open && mention?.kind === 'search');
  const chipIds = useMemo(() => collectLevelReferenceIds(textValue), [textValue]);
  const [levelsById, setLevelsById] = useState(() => peekLevelReferences(chipIds) || {});
  const levelsByIdRef = useRef(levelsById);
  const difficultyDictRef = useRef(difficultyDict);
  levelsByIdRef.current = levelsById;
  difficultyDictRef.current = difficultyDict;

  const cancelSearches = useCallback(() => {
    cancelRef.current.forEach((source) => source.cancel('New search initiated'));
    cancelRef.current = [];
  }, []);

  const closeMention = useCallback(() => {
    tokenRef.current = null;
    tokenIdRef.current = '';
    dismissedRef.current = true;
    setMention(null);
    setOpen(false);
    setPopupQuery('');
  }, []);

  const closeList = useCallback(() => {
    dismissedRef.current = true;
    setOpen(false);
  }, []);

  const applyToken = useCallback((next) => {
    if (!next) {
      tokenRef.current = null;
      tokenIdRef.current = '';
      dismissedRef.current = false;
      setMention(null);
      setOpen(false);
      setPopupQuery('');
      return;
    }

    const key = mentionKey(next);
    if (key !== tokenIdRef.current) {
      tokenIdRef.current = key;
      dismissedRef.current = false;
      if (next.kind === 'search') setPopupQuery('');
      setResults([]);
      setResultsQuery('');
      setActiveIndex(0);
    }
    if (dismissedRef.current) {
      tokenRef.current = next;
      setMention({ kind: next.kind, query: next.query });
      setOpen(false);
      return;
    }
    tokenRef.current = next;
    setMention({ kind: next.kind, query: next.query });
    setOpen(true);
  }, []);

  const refreshToken = useCallback(() => {
    if (composingRef.current) return;
    applyToken(findComposerMention(editorRef.current));
  }, [applyToken]);

  const emitSerialized = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return '';
    let next = serializeEditor(editor);
    if (maxLength && next.length > maxLength) {
      next = next.slice(0, maxLength);
    }
    lastEmittedRef.current = next;
    setIsEmpty(next === '');
    emitChange(onChange, name, next);
    return next;
  }, [maxLength, name, onChange]);

  const insertLevel = useCallback((level) => {
    const editor = editorRef.current;
    const currentToken = tokenRef.current;
    if (!editor || !currentToken || !level || isLocked) return;
    const chip = createLevelChip(level.id, { level, difficultyDict });
    const inserted = insertChipAtMention(editor, currentToken, chip);
    if (!inserted) return;
    editor.focus();
    placeCaretAfterChip(inserted);
    emitSerialized();
    closeMention();
    setResults([]);
  }, [closeMention, difficultyDict, emitSerialized, isLocked]);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (textValue === lastEmittedRef.current && hydratedRef.current) return;
    lastEmittedRef.current = textValue;
    hydratedRef.current = true;
    hydrateEditor(editor, textValue, (id) => createLevelChip(id, {
      level: levelsById[id],
      difficultyDict,
    }));
    setIsEmpty(textValue === '');
    // Chip cards are filled in a later effect so caret is not reset when they load.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate only when the stored value changes
  }, [textValue]);

  useEffect(() => {
    if (chipIds.length === 0) {
      setLevelsById({});
      return undefined;
    }
    const cached = peekLevelReferences(chipIds);
    if (cached) {
      setLevelsById(cached);
      return undefined;
    }
    let cancelled = false;
    getLevelReferences(chipIds).then((map) => {
      if (!cancelled) setLevelsById(map);
    });
    return () => {
      cancelled = true;
    };
  }, [chipIds]);

  useEffect(() => {
    refreshEditorChips(editorRef.current, levelsById, difficultyDict);
  }, [difficultyDict, levelsById]);

  useEffect(() => () => cancelSearches(), [cancelSearches]);

  useEffect(() => {
    if (autoFocus && !isLocked) editorRef.current?.focus();
  }, [autoFocus, isLocked]);

  useEffect(() => {
    if (!open || isLocked) {
      cancelSearches();
      setSearching(false);
      return undefined;
    }

    if (mention?.kind === 'id') {
      const id = Number(mention.query);
      if (!Number.isInteger(id) || id <= 0) {
        setResults([]);
        setResultsQuery('');
        setSearching(false);
        return undefined;
      }
      const queryKey = mention.query;
      setSearching(true);
      const gen = ++searchGenRef.current;
      let cancelled = false;
      getLevelReferences([id]).then((map) => {
        if (cancelled || gen !== searchGenRef.current) return;
        const level = map[id];
        setResults(level ? [level] : []);
        setResultsQuery(queryKey);
        setActiveIndex(0);
        setSearching(false);
      });
      return () => {
        cancelled = true;
        searchGenRef.current += 1;
      };
    }

    if (mention?.kind !== 'search') {
      cancelSearches();
      setSearching(false);
      return undefined;
    }

    const query = popupQuery;
    const searchText = query.trim();
    if (!searchText) {
      cancelSearches();
      setResults([]);
      setResultsQuery('');
      setSearching(false);
      return undefined;
    }

    setSearching(true);
    const timer = setTimeout(() => {
      const gen = ++searchGenRef.current;
      cancelSearches();
      const run = async () => {
        const fetchChunk = async (q) => {
          const normalized = normalizeLevelSearchQuery(q);
          if (!normalized) return [];
          const source = api.CancelToken.source();
          cancelRef.current.push(source);
          const { data } = await api.get(routes.database.levels.root(), {
            params: { query: normalized, limit: SEARCH_LIMIT, offset: 0 },
            cancelToken: source.token,
          });
          return Array.isArray(data?.results) ? data.results : [];
        };

        try {
          let next;
          if (/^\d+$/.test(searchText)) {
            const [idHits, textHits] = await Promise.all([
              fetchChunk(`#${searchText}`),
              fetchChunk(searchText),
            ]);
            next = mergePinId(idHits, textHits, Number(searchText));
          } else {
            next = (await fetchChunk(searchText)).slice(0, SEARCH_LIMIT);
          }
          if (gen !== searchGenRef.current) return;
          setResults(next);
          setResultsQuery(query);
          setActiveIndex(0);
        } catch (error) {
          if (api.isCancel(error)) return;
          if (gen !== searchGenRef.current) return;
          console.error('Failed to search levels for mention', error);
          setResults([]);
          setResultsQuery(query);
        } finally {
          if (gen === searchGenRef.current) setSearching(false);
        }
      };
      void run();
    }, SEARCH_DELAY_MS);

    return () => {
      clearTimeout(timer);
      cancelSearches();
      searchGenRef.current += 1;
    };
  }, [cancelSearches, isLocked, mention?.kind, mention?.query, open, popupQuery]);

  useEffect(() => {
    if (!open) {
      focusedSearchRef.current = false;
      return;
    }
    if (mention?.kind !== 'search' || focusedSearchRef.current) return;
    focusedSearchRef.current = true;
    searchInputRef.current?.focus();
  }, [mention?.kind, open]);

  useEffect(() => {
    if (!open) return undefined;
    const bump = () => setCaretTick((n) => n + 1);
    const el = editorRef.current;
    window.addEventListener('resize', bump);
    window.addEventListener('scroll', bump, true);
    el?.addEventListener('scroll', bump);
    return () => {
      window.removeEventListener('resize', bump);
      window.removeEventListener('scroll', bump, true);
      el?.removeEventListener('scroll', bump);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !mention || !editorRef.current) {
      setPanelStyle(undefined);
      return;
    }
    const caret = getMentionAnchorRect(tokenRef.current, editorRef.current);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const minTop = navbarOffsetPx() + PANEL_MARGIN;
    const width = Math.min(PANEL_WIDTH, vw - PANEL_MARGIN * 2);
    let left = caret.left;
    left = Math.min(Math.max(left, PANEL_MARGIN), Math.max(PANEL_MARGIN, vw - PANEL_MARGIN - width));
    const measured = popupRef.current?.offsetHeight || 0;
    const panelHeight = measured || (results.length > 0 ? 240 : 48);
    let top = caret.top - PANEL_GAP - panelHeight;
    if (top < minTop) {
      top = caret.bottom + PANEL_GAP;
    }
    if (top + panelHeight > vh - PANEL_MARGIN) {
      top = Math.max(minTop, vh - PANEL_MARGIN - panelHeight);
    }
    setPanelStyle((prev) => {
      if (prev && prev.top === top && prev.left === left && prev.width === width) return prev;
      return { top, left, width };
    });
  }, [open, mention, results, searching, popupQuery, caretTick, showSearch]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (editorRef.current?.contains(event.target)) return;
      if (popupRef.current?.contains(event.target)) return;
      closeList();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [closeList, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      closeList();
      editorRef.current?.focus();
      placeCaretAtTokenEnd(tokenRef.current);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [closeList, open]);

  useEffect(() => {
    if (!open) return;
    const node = popupRef.current?.querySelector('[data-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open, results]);

  const resultsKey = mention?.kind === 'id' ? mention.query : popupQuery;
  const listReady = Boolean(open && results.length > 0 && resultsQuery === resultsKey);
  const canInsert = Boolean(listReady && results[activeIndex]);
  const showLoading = Boolean(
    open && (
      (mention?.kind === 'id' && resultsQuery !== mention.query)
      || (mention?.kind === 'search' && popupQuery.trim() && resultsQuery !== popupQuery)
    ),
  );
  const showEmpty = Boolean(
    open
    && !searching
    && (
      (mention?.kind === 'id' && resultsQuery === mention.query && results.length === 0)
      || (mention?.kind === 'search' && popupQuery.trim() && resultsQuery === popupQuery && results.length === 0)
    ),
  );
  const showList = listReady;
  const activeId = showList ? `${listDomId}-${activeIndex}` : undefined;

  const moveActive = (delta) => {
    if (!listReady) return;
    setActiveIndex((index) => (index + delta + results.length) % results.length);
  };

  const handlePopupKeys = (event) => {
    if (isLocked || !open) return false;
    if (event.ctrlKey || event.metaKey) return false;
    if (event.key === 'ArrowDown' && listReady) {
      event.preventDefault();
      moveActive(1);
      return true;
    }
    if (event.key === 'ArrowUp' && listReady) {
      event.preventDefault();
      moveActive(-1);
      return true;
    }
    if (event.key === 'Enter' && event.shiftKey) return false;
    if ((event.key === 'Enter' || event.key === 'Tab') && canInsert) {
      event.preventDefault();
      insertLevel(results[activeIndex]);
      return true;
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault();
      return true;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeList();
      return true;
    }
    return false;
  };

  const handleEditorKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      onKeyDown?.(event);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === 'z' || key === 'y') {
        onKeyDown?.(event);
        return;
      }
    }
    if (handlePopupKeys(event)) return;
    if (event.defaultPrevented) {
      onKeyDown?.(event);
      return;
    }
    if ((event.key === 'Backspace' || event.key === 'Delete') && selectionIntersectsChip(editorRef.current)) {
      event.preventDefault();
      deleteSelection(editorRef.current);
      emitSerialized();
      refreshToken();
      return;
    }
    if (event.key === 'Backspace' && window.getSelection()?.isCollapsed && deleteChipAtCaret(editorRef.current, 'before')) {
      event.preventDefault();
      emitSerialized();
      refreshToken();
      return;
    }
    if (event.key === 'Delete' && window.getSelection()?.isCollapsed && deleteChipAtCaret(editorRef.current, 'after')) {
      event.preventDefault();
      emitSerialized();
      refreshToken();
      return;
    }
    if (event.key === 'Enter' && isSingleLine) {
      event.preventDefault();
      if (!open) editorRef.current?.closest('form')?.requestSubmit();
      onKeyDown?.(event);
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey && !isSingleLine) {
      event.preventDefault();
      insertEditorLineBreak(editorRef.current);
      emitSerialized();
      refreshToken();
      onKeyDown?.(event);
      return;
    }
    onKeyDown?.(event);
  };

  const handleSearchKeyDown = (event) => {
    if (handlePopupKeys(event)) event.stopPropagation();
  };

  const handleEditorInput = (event) => {
    if (composingRef.current) {
      onInput?.(event);
      return;
    }
    const editor = editorRef.current;
    normalizeEditorChips(editor);
    if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
      refreshEditorChips(editor, levelsByIdRef.current, difficultyDictRef.current);
    }
    emitSerialized();
    refreshToken();
    onInput?.(event);
  };

  const handleEditorClick = (event) => {
    refreshToken();
    onClick?.(event);
  };

  const handleEditorSelect = (event) => {
    refreshToken();
    onSelect?.(event);
  };

  const handleEditorKeyUp = (event) => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === 'z' || key === 'y') {
        const editor = editorRef.current;
        normalizeEditorChips(editor);
        refreshEditorChips(editor, levelsByIdRef.current, difficultyDictRef.current);
        emitSerialized();
      }
    }
    refreshToken();
    onKeyUp?.(event);
  };

  const handleEditorFocus = (event) => {
    dismissedRef.current = false;
    refreshToken();
    onFocus?.(event);
  };

  const handleEditorBlur = (event) => {
    onBlur?.(event);
  };

  const handleCompositionStart = (event) => {
    composingRef.current = true;
    onCompositionStart?.(event);
  };

  const handleCompositionEnd = (event) => {
    composingRef.current = false;
    emitSerialized();
    refreshToken();
    onCompositionEnd?.(event);
  };

  const handleCopy = (event) => {
    const editor = editorRef.current;
    if (!editor) return;
    const text = serializeSelection(editor);
    if (text === '' && window.getSelection()?.isCollapsed) {
      onCopy?.(event);
      return;
    }
    event.preventDefault();
    event.clipboardData.setData('text/plain', text);
    onCopy?.(event);
  };

  const handleCut = (event) => {
    const editor = editorRef.current;
    if (!editor || isLocked) return;
    const text = serializeSelection(editor);
    event.preventDefault();
    event.clipboardData.setData('text/plain', text);
    deleteSelection(editor);
    emitSerialized();
    refreshToken();
    onCut?.(event);
  };

  const handlePaste = (event) => {
    if (isLocked) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    let text = event.clipboardData?.getData('text/plain') || '';
    if (isSingleLine) text = text.replace(/[\r\n]+/g, ' ');
    const editor = editorRef.current;
    const current = serializeEditor(editor);
    const selected = serializeSelection(editor);
    if (maxLength) {
      const room = maxLength - (current.length - selected.length);
      text = text.slice(0, Math.max(0, room));
    }
    insertPlainTextAtCaret(editor, text);
    emitSerialized();
    refreshToken();
    onPaste?.(event);
  };

  const handleBeforeInput = (event) => {
    if (isLocked) {
      event.preventDefault();
      return;
    }
    const inputType = event.inputType || '';
    if (inputType === 'insertParagraph' || inputType === 'insertLineBreak') {
      event.preventDefault();
      if (isSingleLine || event.ctrlKey || event.metaKey) return;
      insertEditorLineBreak(editorRef.current);
      emitSerialized();
      refreshToken();
      return;
    }
    if (!maxLength || !inputType.startsWith('insert')) return;
    const incoming = event.data || '';
    if (!incoming) return;
    const current = serializeEditor(editorRef.current);
    const selected = serializeSelection(editorRef.current);
    if (current.length - selected.length + incoming.length > maxLength) {
      event.preventDefault();
    }
  };

  const minHeightStyle = !isSingleLine && rows
    ? { minHeight: `${Number(rows) * 1.5}em` }
    : undefined;

  const editorClass = [
    'level-mention-field',
    isSingleLine ? 'is-single-line' : '',
    isEmpty ? 'is-empty' : '',
    className || '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <div
        {...rest}
        ref={editorRef}
        id={id}
        role="textbox"
        aria-multiline={!isSingleLine}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listDomId : undefined}
        aria-activedescendant={activeId}
        aria-placeholder={placeholder}
        aria-disabled={isLocked || undefined}
        aria-readonly={readOnly || undefined}
        data-placeholder={placeholder || ''}
        data-name={name || ''}
        contentEditable={!isLocked}
        suppressContentEditableWarning
        spellCheck={spellCheck}
        className={editorClass}
        style={{ ...minHeightStyle, ...style }}
        tabIndex={isLocked ? -1 : 0}
        onKeyDown={handleEditorKeyDown}
        onKeyUp={handleEditorKeyUp}
        onClick={handleEditorClick}
        onSelect={handleEditorSelect}
        onFocus={handleEditorFocus}
        onBlur={handleEditorBlur}
        onInput={handleEditorInput}
        onBeforeInput={handleBeforeInput}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
      />
      <Portal when={open && Boolean(portalRoot)} root={portalRoot} hideOnNavigate={false}>
        <div
          ref={popupRef}
          id={listDomId}
          className={`level-mention-popup ${PORTALED_PANEL_CLASS}`}
          role={showList ? 'listbox' : 'status'}
          style={{ ...panelStyle, visibility: panelStyle ? 'visible' : 'hidden' }}
        >
          {showSearch && (
            <div className="level-mention-popup__search">
              <input
                ref={searchInputRef}
                id={`${listDomId}-search`}
                className="level-mention-popup__search-input"
                type="text"
                value={popupQuery}
                autoComplete="off"
                spellCheck="false"
                placeholder={t('levelMention.searchPlaceholder')}
                aria-autocomplete="list"
                aria-controls={listDomId}
                aria-activedescendant={activeId}
                onChange={(event) => setPopupQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </div>
          )}
          {showLoading && (
            <div className="level-mention-popup__status">{t('loading.searching')}</div>
          )}
          {showEmpty && (
            <div className="level-mention-popup__status">{t('levelMention.empty')}</div>
          )}
          {showList && (
            <div className="level-mention-popup__list">
              {results.map((level, index) => {
                const diff = level?.diffId != null ? difficultyDict?.[level.diffId] : null;
                const song = getSongDisplayName(level);
                const artist = getArtistDisplayName(level);
                const isActive = index === activeIndex;
                return (
                  <button
                    key={level.id}
                    id={`${listDomId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive ? 'true' : undefined}
                    className={`level-mention-popup__item${isActive ? ' is-active' : ''}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      insertLevel(level);
                    }}
                  >
                    {diff?.icon && (
                      <img
                        className="level-mention-popup__icon"
                        src={selectIconSize(diff.icon, ICON_SIZE.SMALL)}
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <span className="level-mention-popup__text">
                      <span className="level-mention-popup__title">{song || `#${level.id}`}</span>
                      <span className="level-mention-popup__meta">
                        <span className="level-mention-popup__meta-id">#{level.id}</span>
                        {artist && (
                          <span className="level-mention-popup__meta-artist">{artist}</span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Portal>
    </>
  );
}
