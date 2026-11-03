// tuf-search: #levelMentionEditor #levelMention
import { ICON_SIZE, selectIconSize } from '@/utils/Utility';
import { getSongDisplayName } from '@/utils/levelHelpers';
import { findMentionToken, isMentionHashStart } from './levelMentionToken';

function stripSerializedText(value) {
  return (value || '').replace(/\u00a0/g, ' ').replace(/\u200B/g, '');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function runEditorCommand(command, value) {
  try {
    return document.execCommand(command, false, value);
  } catch {
    return false;
  }
}

function selectRange(range) {
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

export function normalizeEditorChips(root) {
  if (!root) return;
  root.querySelectorAll('[data-level-id]').forEach((span) => {
    span.contentEditable = 'false';
    span.setAttribute('draggable', 'false');
    if (!span.classList.contains('level-ref')) span.classList.add('level-link', 'level-ref');
  });
}

function isBlock(node) {
  const tag = node?.tagName;
  return tag === 'DIV' || tag === 'P';
}

export function appendPlain(parent, text) {
  const source = stripSerializedText(text);
  if (!source) return;
  const lines = source.split('\n');
  lines.forEach((line, i) => {
    if (i > 0) parent.appendChild(document.createElement('br'));
    if (line) parent.appendChild(document.createTextNode(line));
  });
}

export function serializeEditor(root) {
  if (!root) return '';
  let out = '';

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += stripSerializedText(node.nodeValue);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.dataset?.levelId) {
      out += `#${node.dataset.levelId}`;
      return;
    }
    if (node.tagName === 'BR') {
      out += '\n';
      return;
    }
    if (isBlock(node) && out.length > 0 && !out.endsWith('\n')) out += '\n';
    node.childNodes.forEach(walk);
  };

  root.childNodes.forEach(walk);

  if (root.querySelector('[data-level-id]')) return out;
  if (!out.replace(/\n/g, '')) return '';
  return out;
}

export function fillLevelChip(span, levelId, level, difficultyDict) {
  if (!span) return;
  const song = level ? getSongDisplayName(level) : '';
  const diff = level?.diffId != null ? difficultyDict?.[level.diffId] : null;
  span.replaceChildren();

  const idEl = document.createElement('span');
  idEl.className = 'level-ref-id';
  idEl.textContent = `#${levelId}`;
  span.appendChild(idEl);

  if (diff?.icon) {
    const img = document.createElement('img');
    img.className = 'level-ref-icon';
    img.src = selectIconSize(diff.icon, ICON_SIZE.SMALL);
    img.alt = '';
    img.draggable = false;
    img.referrerPolicy = 'no-referrer';
    span.appendChild(img);
  }

  if (song) {
    const title = document.createElement('span');
    title.className = 'level-ref-title';
    title.textContent = song;
    span.appendChild(title);
  }
}

export function createLevelChip(levelId, { level = null, difficultyDict = null } = {}) {
  const span = document.createElement('span');
  span.contentEditable = 'false';
  span.dataset.levelId = String(levelId);
  span.className = 'level-link level-ref';
  span.setAttribute('draggable', 'false');
  fillLevelChip(span, levelId, level, difficultyDict);
  return span;
}

export function hydrateEditor(root, text, createChip) {
  if (!root) return;
  root.replaceChildren();
  const source = typeof text === 'string' ? text : '';
  if (!source) return;

  const re = /#(\d+)/g;
  let last = 0;
  let match;
  const frag = document.createDocumentFragment();
  while ((match = re.exec(source))) {
    const idx = match.index;
    if (!isMentionHashStart(source, idx)) continue;
    if (idx > last) appendPlain(frag, source.slice(last, idx));
    frag.appendChild(createChip(Number(match[1])));
    last = idx + match[0].length;
  }
  if (last < source.length) appendPlain(frag, source.slice(last));
  root.appendChild(frag);
}

export function findComposerMention(editor) {
  if (!editor) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
  const node = sel.anchorNode;
  if (!node || !editor.contains(node)) return null;
  if (node.nodeType !== Node.TEXT_NODE) return null;
  const token = findMentionToken(node.nodeValue || '', sel.anchorOffset);
  if (!token) return null;
  return { ...token, textNode: node };
}

function insertChipAtMentionDom(token, chip) {
  const textNode = token.textNode;
  const text = textNode.nodeValue || '';
  const before = text.slice(0, token.start);
  const after = text.slice(token.end);
  const parent = textNode.parentNode;
  if (!parent) return false;

  const afterNode = document.createTextNode(after);
  parent.insertBefore(afterNode, textNode.nextSibling);
  parent.insertBefore(chip, afterNode);
  if (before) textNode.nodeValue = before;
  else parent.removeChild(textNode);

  let caretNode = afterNode;
  let caretOffset = 0;
  if (!/^\s/.test(after)) {
    const spaceNode = document.createTextNode(' ');
    parent.insertBefore(spaceNode, afterNode);
    caretNode = spaceNode;
    caretOffset = 1;
  }

  const range = document.createRange();
  range.setStart(caretNode, caretOffset);
  range.collapse(true);
  selectRange(range);
  return true;
}

export function insertChipAtMention(editor, token, chip) {
  if (!editor || !token?.textNode?.isConnected || !chip) return false;
  editor.focus();
  const textNode = token.textNode;
  const text = textNode.nodeValue || '';
  const after = text.slice(token.end);
  const needSpace = !/^\s/.test(after);
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  chip.dataset.mentionInsert = stamp;

  const range = document.createRange();
  range.setStart(textNode, token.start);
  range.setEnd(textNode, token.end);
  selectRange(range);

  const html = `${chip.outerHTML}${needSpace ? ' ' : ''}`;
  const inserted = runEditorCommand('insertHTML', html);
  delete chip.dataset.mentionInsert;
  if (inserted) {
    normalizeEditorChips(editor);
    const stamped = editor.querySelector(`[data-mention-insert="${stamp}"]`);
    if (stamped) {
      delete stamped.dataset.mentionInsert;
      return stamped;
    }
    const sel = window.getSelection();
    let node = sel?.anchorNode;
    if (node?.nodeType === Node.TEXT_NODE) {
      node = sel.anchorOffset === 0 ? node.previousSibling : node.parentElement;
    }
    const nearby = node?.dataset?.levelId
      ? node
      : node?.closest?.('[data-level-id]');
    if (nearby && editor.contains(nearby)) return nearby;
    const chips = editor.querySelectorAll('[data-level-id]');
    return chips[chips.length - 1] || false;
  }

  return insertChipAtMentionDom(token, chip) ? chip : false;
}

export function insertPlainTextAtCaret(editor, text) {
  if (!editor) return;
  editor.focus();
  const source = stripSerializedText(text);
  if (!source) {
    runEditorCommand('delete');
    return;
  }
  if (!source.includes('\n')) {
    if (runEditorCommand('insertText', source)) return;
  } else if (runEditorCommand('insertHTML', source.split('\n').map(escapeHtml).join('<br>'))) {
    return;
  }

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer) && range.commonAncestorContainer !== editor) {
    return;
  }
  range.deleteContents();
  const frag = document.createDocumentFragment();
  appendPlain(frag, source);
  if (!frag.childNodes.length) return;
  const last = frag.lastChild;
  range.insertNode(frag);
  if (source.endsWith('\n') && last.parentNode && last === last.parentNode.lastChild && last.tagName === 'BR') {
    last.parentNode.appendChild(document.createElement('br'));
  }
  const caret = document.createRange();
  caret.setStartAfter(last);
  caret.collapse(true);
  selectRange(caret);
}

export function insertEditorLineBreak(editor) {
  if (!editor) return;
  editor.focus();
  if (runEditorCommand('insertLineBreak')) return;
  if (runEditorCommand('insertHTML', '<br>')) return;
  insertPlainTextAtCaret(editor, '\n');
}

export function placeCaretAtTokenEnd(token) {
  if (!token?.textNode?.isConnected) return;
  const range = document.createRange();
  const offset = Math.min(token.end, (token.textNode.nodeValue || '').length);
  range.setStart(token.textNode, offset);
  range.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function closestChip(node, editor) {
  let current = node;
  if (current?.nodeType === Node.TEXT_NODE) current = current.parentElement;
  while (current && current !== editor) {
    if (current.dataset?.levelId) return current;
    current = current.parentElement;
  }
  return null;
}

function skipEmptyText(node, direction) {
  let current = node;
  while (current && current.nodeType === Node.TEXT_NODE && !(current.nodeValue || '').length) {
    current = direction === 'before' ? current.previousSibling : current.nextSibling;
  }
  return current;
}

function chipAdjacentToCaret(editor, direction) {
  const sel = window.getSelection();
  if (!sel?.isCollapsed || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  const offset = range.startOffset;
  if (node === editor) {
    const child = direction === 'before'
      ? skipEmptyText(node.childNodes[offset - 1], 'before')
      : skipEmptyText(node.childNodes[offset], 'after');
    return child?.dataset?.levelId ? child : null;
  }
  if (node.nodeType !== Node.TEXT_NODE) return closestChip(node, editor);
  if (direction === 'before' && offset === 0) {
    const prev = skipEmptyText(node.previousSibling, 'before');
    return prev?.dataset?.levelId ? prev : null;
  }
  if (direction === 'after' && offset === (node.nodeValue || '').length) {
    const next = skipEmptyText(node.nextSibling, 'after');
    return next?.dataset?.levelId ? next : null;
  }
  return null;
}

export function selectionIntersectsChip(editor) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return false;
  const range = sel.getRangeAt(0);
  return Boolean(closestChip(range.startContainer, editor) || closestChip(range.endContainer, editor));
}

export function deleteChipAtCaret(editor, direction) {
  const chip = chipAdjacentToCaret(editor, direction);
  if (!chip) return false;
  editor?.focus();
  const range = document.createRange();
  range.selectNode(chip);
  selectRange(range);
  if (!runEditorCommand('delete')) chip.remove();
  return true;
}

function expandRangeToChips(range, editor) {
  const startChip = closestChip(range.startContainer, editor);
  const endChip = closestChip(range.endContainer, editor);
  if (startChip) range.setStartBefore(startChip);
  if (endChip) range.setEndAfter(endChip);
}

export function serializeSelection(editor) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return '';
  const range = sel.getRangeAt(0).cloneRange();
  if (!editor.contains(range.commonAncestorContainer) && range.commonAncestorContainer !== editor) {
    return '';
  }
  expandRangeToChips(range, editor);
  const holder = document.createElement('div');
  holder.appendChild(range.cloneContents());
  return serializeEditor(holder);
}

export function deleteSelection(editor) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer) && range.commonAncestorContainer !== editor) {
    return;
  }
  expandRangeToChips(range, editor);
  selectRange(range);
  if (!runEditorCommand('delete')) range.deleteContents();
}

export function getMentionAnchorRect(token, editor) {
  if (token?.textNode?.isConnected) {
    try {
      const range = document.createRange();
      const length = (token.textNode.nodeValue || '').length;
      const start = Math.min(token.start, length);
      const end = Math.min(Math.max(token.start + 1, start), length);
      range.setStart(token.textNode, start);
      range.setEnd(token.textNode, end);
      const rect = range.getBoundingClientRect();
      if (rect && (rect.height || rect.width || rect.top || rect.left)) {
        return {
          top: rect.top,
          left: rect.left,
          bottom: rect.bottom,
          height: rect.height || 16,
          width: 0,
          right: rect.left,
        };
      }
    } catch {
      // Fall through to the editor box.
    }
  }
  const rect = editor?.getBoundingClientRect?.();
  if (!rect) {
    return { top: 0, left: 0, bottom: 16, height: 16, width: 0, right: 0 };
  }
  return {
    top: rect.top,
    left: rect.left,
    bottom: rect.top + 16,
    height: 16,
    width: 0,
    right: rect.left,
  };
}

export function refreshEditorChips(root, levelsById, difficultyDict) {
  if (!root) return;
  root.querySelectorAll('[data-level-id]').forEach((span) => {
    const id = Number(span.dataset.levelId);
    if (!Number.isInteger(id) || id <= 0) return;
    fillLevelChip(span, id, levelsById?.[id], difficultyDict);
  });
}

export function placeCaretAfterChip(chip) {
  if (!chip?.isConnected) return;
  const range = document.createRange();
  const next = chip.nextSibling;
  if (next && next.nodeType === Node.TEXT_NODE) {
    const offset = /^\s/.test(next.nodeValue || '') ? Math.min(1, next.nodeValue.length) : 0;
    range.setStart(next, offset);
  } else {
    range.setStartAfter(chip);
  }
  range.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}
