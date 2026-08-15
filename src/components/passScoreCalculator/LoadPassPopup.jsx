// tuf-search: #LoadPassPopup #passScoreCalculator
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { UserAvatar } from '@/components/layout';
import { userAvatarUrls } from '@/utils/playerAvatarDisplay';
import { formatAccuracyRatio } from '@/utils/statFormatters';
import {
  clampFloat,
  formatCreatorDisplay,
  formatScore,
  truncateString,
} from '@/utils/Utility';
import {
  normalizePassSearchQuery,
  parseHashtagIdQuery,
} from '@/utils/normalizeEntitySearchQuery';
import { CalculatorToolPopup } from './CalculatorToolPopup';

function unwrapPass(data) {
  if (!data) return null;
  const pass = data.results?.[0] || data.pass || data;
  return pass?.id ? pass : null;
}

function parsePassIdInput(value) {
  const normalized = normalizePassSearchQuery(value);
  const hashId = parseHashtagIdQuery(normalized);
  if (hashId) return parseInt(hashId, 10);
  const trimmed = String(normalized).trim();
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  return null;
}

function judgementCount(judgements, keys) {
  if (!judgements) return 0;
  for (const key of keys) {
    const n = parseInt(String(judgements[key] ?? ''), 10);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

const PREVIEW_JUDGEMENTS = [
  { keys: ['earlyDouble', 'tooEarly'], color: '#FF0000' },
  { keys: ['earlySingle', 'early'], color: '#FF6F4D' },
  { keys: ['ePerfect'], color: '#FCFF4D' },
  { keys: ['perfect'], color: '#5FFF4E' },
  { keys: ['lPerfect'], color: '#FCFF4D' },
  { keys: ['lateSingle', 'late'], color: '#FF6F4D' },
];

export function LoadPassPopup({ difficultyDict, onClose, onImport }) {
  const { t } = useTranslation(['pages', 'common']);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewPass, setPreviewPass] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMissing, setPreviewMissing] = useState(false);

  const searchCancelTokenRef = useRef(null);
  const previewCancelTokenRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const previewTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchContainerRef = useRef(null);

  const searchPasses = useCallback(async (rawQuery) => {
    const normalizedQuery = normalizePassSearchQuery(rawQuery);
    if (!String(normalizedQuery).trim()) {
      setSearchResults([]);
      return;
    }

    if (searchCancelTokenRef.current) {
      searchCancelTokenRef.current.cancel('New search initiated');
    }
    searchCancelTokenRef.current = api.CancelToken.source();

    try {
      const hashId = parseHashtagIdQuery(normalizedQuery);
      const requestQuery = hashId || normalizedQuery;
      const response = await api.get(routes.database.passes.root(), {
        params: {
          query: requestQuery,
          limit: 50,
          offset: 0,
          sort: 'SCORE_DESC',
        },
        cancelToken: searchCancelTokenRef.current.token,
      });
      const results = Array.isArray(response.data?.results) ? response.data.results : [];
      setSearchResults(results);
      if (results.length === 0) setIsExpanded(false);
    } catch (error) {
      if (!api.isCancel(error)) {
        console.error('Error searching passes:', error);
        setSearchResults([]);
      }
    }
  }, []);

  const fetchPreview = useCallback(async (passId) => {
    if (!Number.isFinite(passId) || passId <= 0) {
      setPreviewPass(null);
      setPreviewMissing(false);
      setPreviewLoading(false);
      return;
    }

    if (previewCancelTokenRef.current) {
      previewCancelTokenRef.current.cancel('New preview fetch');
    }
    previewCancelTokenRef.current = api.CancelToken.source();
    setPreviewLoading(true);
    setPreviewMissing(false);

    try {
      const { data } = await api.get(routes.database.passes.byId(passId), {
        cancelToken: previewCancelTokenRef.current.token,
      });
      const pass = unwrapPass(data);
      if (!pass) {
        setPreviewPass(null);
        setPreviewMissing(true);
        setPreviewLoading(false);
        return;
      }
      setPreviewPass(pass);
      setPreviewMissing(false);
      setPreviewLoading(false);
    } catch (error) {
      if (api.isCancel(error)) return;
      console.error('Error fetching pass preview:', error);
      setPreviewPass(null);
      setPreviewMissing(true);
      setPreviewLoading(false);
    }
  }, []);

  const scheduleLookups = useCallback(
    (nextQuery) => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);

      const trimmed = String(nextQuery).trim();
      if (!trimmed) {
        setSearchResults([]);
        setPreviewPass(null);
        setPreviewMissing(false);
        setIsExpanded(false);
        return;
      }

      searchTimeoutRef.current = setTimeout(() => {
        void searchPasses(nextQuery);
      }, 500);

      previewTimeoutRef.current = setTimeout(() => {
        const id = parsePassIdInput(nextQuery);
        void fetchPreview(id);
      }, 500);
    },
    [searchPasses, fetchPreview],
  );

  const handleQueryChange = (event) => {
    const nextQuery = normalizePassSearchQuery(event.target.value);
    setQuery(nextQuery);
    scheduleLookups(nextQuery);
  };

  const handlePassSelect = (pass) => {
    if (!pass?.id) return;
    setQuery(String(pass.id));
    setPreviewPass(pass);
    setPreviewMissing(false);
    setIsExpanded(false);
    void fetchPreview(pass.id);
  };

  useEffect(() => {
    return () => {
      if (searchCancelTokenRef.current) {
        searchCancelTokenRef.current.cancel('Component unmounted');
      }
      if (previewCancelTokenRef.current) {
        previewCancelTokenRef.current.cancel('Component unmounted');
      }
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        searchContainerRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsExpanded(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const level = previewPass?.level;
  const difficulty = difficultyDict?.[level?.diffId];
  const scoreValue = Number(previewPass?.scoreV2);
  const accuracyValue = Number(previewPass?.accuracy);
  const charterLabel = formatCreatorDisplay(level);
  const showCharter = charterLabel && charterLabel !== 'No credits';

  return (
    <CalculatorToolPopup
      title={t('passSubmission.calculator.loadPass.title')}
      onClose={onClose}
      panelClassName="psc-tool-popup__panel--wide psc-tool-popup__panel--load-pass"
    >
      <div className="pass-score-calculator__fields">
        <div className="pass-score-calculator__field">
          <label>{t('passSubmission.calculator.loadPass.placeholder')}</label>
          <div className="pass-score-calculator__pass-search" ref={searchContainerRef}>
            <input
              type="text"
              autoComplete="off"
              placeholder={t('passSubmission.calculator.loadPass.placeholder')}
              value={query}
              onChange={handleQueryChange}
            />
            {searchResults.length > 0 && (
              <button
                type="button"
                className={`pass-score-calculator__expand-btn btn-fill-primary${isExpanded ? ' is-expanded' : ''}`}
                onClick={() => setIsExpanded((open) => !open)}
                aria-label={t('passSubmission.calculator.loadPass.title')}
                aria-expanded={isExpanded}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            )}
            <div
              className={`pass-score-calculator__pass-dropdown${isExpanded ? ' is-expanded' : ''}`}
              ref={dropdownRef}
            >
              {searchResults.map((result) => {
                const resultDiff = difficultyDict?.[result.level?.diffId];
                return (
                  <button
                    type="button"
                    key={result.id}
                    className="pass-score-calculator__pass-option"
                    onClick={() => handlePassSelect(result)}
                  >
                    {resultDiff?.icon ? (
                      <img
                        src={resultDiff.icon}
                        alt={resultDiff.name || ''}
                        className="pass-score-calculator__pass-option-icon"
                      />
                    ) : null}
                    <span className="pass-score-calculator__pass-option-body">
                      <span className="pass-score-calculator__pass-option-title">
                        {result.level?.song || t('passSubmission.calculator.loadPass.unknownLevel')} (ID: {result.id})
                      </span>
                      <span className="pass-score-calculator__pass-option-meta">
                        <span>{result.player?.name || t('passSubmission.calculator.loadPass.unknownPlayer')}</span>
                        <span>{result.level?.artist || ''}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pass-score-calculator__pass-preview">
          {previewLoading && !previewPass ? (
            <p className="psc-muted">{t('passSubmission.calculator.loadPass.fetching')}</p>
          ) : previewPass ? (
            <>
              <div className="pass-score-calculator__pass-preview-main">
                {difficulty?.icon ? (
                  <img
                    src={difficulty.icon}
                    alt={difficulty.name || ''}
                    className="pass-score-calculator__pass-preview-diff"
                  />
                ) : null}
                <div className="pass-score-calculator__pass-preview-info">
                  <p className="pass-score-calculator__pass-preview-song">
                    {truncateString(level?.song || t('passSubmission.calculator.loadPass.unknownLevel'), 36)}
                  </p>
                  <div className="pass-score-calculator__pass-preview-sub">
                    <span>{truncateString(level?.artist || '', 18)}</span>
                    {showCharter ? <span>{truncateString(charterLabel, 18)}</span> : null}
                  </div>
                </div>
                {previewPass.player ? (
                  <div className="pass-score-calculator__pass-preview-player">
                    <UserAvatar
                      {...userAvatarUrls(previewPass.player)}
                      className="pass-score-calculator__pass-preview-avatar"
                    />
                    <span>{previewPass.player.name}</span>
                  </div>
                ) : null}
              </div>
              <div className="pass-score-calculator__pass-preview-stats">
                <span>#{previewPass.id}</span>
                <span>{Number.isFinite(scoreValue) ? formatScore(scoreValue) : '—'}</span>
                <span>{Number.isFinite(accuracyValue) ? formatAccuracyRatio(accuracyValue) : '—'}</span>
                <span>{clampFloat(previewPass.speed, 2)}×</span>
              </div>
              <div className="pass-score-calculator__pass-preview-judgements" aria-hidden="true">
                {PREVIEW_JUDGEMENTS.map((item) => (
                  <span key={item.keys[0]} style={{ color: item.color }}>
                    {judgementCount(previewPass.judgements, item.keys)}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="psc-muted">
              {previewMissing
                ? t('passSubmission.calculator.loadPass.notFound')
                : t('passSubmission.calculator.loadPass.previewEmpty')}
            </p>
          )}
        </div>

        <div className="pass-score-calculator__popup-actions">
          <div className="pass-score-calculator__popup-actions-end">
            <button
              type="button"
              className="pass-score-calculator__btn pass-score-calculator__btn--ghost"
              onClick={onClose}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            <button
              type="button"
              className="pass-score-calculator__btn pass-score-calculator__btn--primary"
              onClick={() => onImport(previewPass)}
              disabled={!previewPass}
            >
              {t('passSubmission.calculator.loadPass.import')}
            </button>
          </div>
        </div>
      </div>
    </CalculatorToolPopup>
  );
}
