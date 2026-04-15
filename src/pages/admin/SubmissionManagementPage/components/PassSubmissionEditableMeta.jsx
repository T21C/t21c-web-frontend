import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import { formatCreatorDisplay, validateSpeed } from '@/utils/Utility';

function truncateString(str, maxLength) {
  if (str == null || typeof str !== 'string') return '';
  return str.length <= maxLength ? str : `${str.slice(0, maxLength)}…`;
}

const JUDGEMENT_KEYS = [
  'earlyDouble',
  'earlySingle',
  'ePerfect',
  'perfect',
  'lPerfect',
  'lateSingle',
  'lateDouble',
];

const JUDGEMENT_CLASS = {
  earlyDouble: 'early-double',
  earlySingle: 'early-single',
  ePerfect: 'e-perfect',
  perfect: 'perfect',
  lPerfect: 'l-perfect',
  lateSingle: 'late-single',
  lateDouble: 'late-double',
};

function judgementsFromSubmission(sub) {
  const j = sub.judgements || {};
  const o = {};
  for (const k of JUDGEMENT_KEYS) {
    const v = j[k];
    o[k] = v !== null && v !== undefined ? String(v) : '0';
  }
  return o;
}

function flagsFromSubmission(sub) {
  const f = sub.flags || {};
  return {
    is12K: !!f.is12K,
    isNoHoldTap: !!f.isNoHoldTap,
    is16K: !!f.is16K,
  };
}

function diffJudgements(snapStr, draftStr) {
  const out = {};
  for (const k of JUDGEMENT_KEYS) {
    const a = parseInt(snapStr[k], 10);
    const b = parseInt(draftStr[k], 10);
    const an = Number.isNaN(a) ? 0 : a;
    const bn = Number.isNaN(b) ? 0 : b;
    if (an !== bn) out[k] = bn;
  }
  return out;
}

function diffFlags(snap, draft) {
  const out = {};
  if (snap.is12K !== draft.is12K) out.is12K = draft.is12K;
  if (snap.isNoHoldTap !== draft.isNoHoldTap) out.isNoHoldTap = draft.isNoHoldTap;
  if (snap.is16K !== draft.is16K) out.is16K = draft.is16K;
  return out;
}

export default function PassSubmissionEditableMeta({
  submission,
  difficultyDict,
  onPatched,
  betweenLevelAndSpeed,
  betweenSpeedAndJudgements,
}) {
  const { t } = useTranslation('components');

  const [editingLevel, setEditingLevel] = useState(false);
  const [editingJudgements, setEditingJudgements] = useState(false);
  const [editingSpeed, setEditingSpeed] = useState(false);
  const [editingFlags, setEditingFlags] = useState(false);

  const [levelInput, setLevelInput] = useState('');
  const [levelSearchResults, setLevelSearchResults] = useState([]);
  const [levelExpanded, setLevelExpanded] = useState(false);
  const [levelPreview, setLevelPreview] = useState(null);
  const [levelLoading, setLevelLoading] = useState(false);
  const levelSearchContainerRef = useRef(null);
  const levelDropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const searchCancelTokenRef = useRef(null);
  const levelFetchCancelTokenRef = useRef(null);

  const snapLevelIdRef = useRef(null);
  const snapJudgementsRef = useRef(null);
  const snapSpeedRef = useRef(null);
  const snapFlagsRef = useRef(null);

  const [draftJudgements, setDraftJudgements] = useState(() => judgementsFromSubmission(submission));
  const [draftSpeed, setDraftSpeed] = useState('');
  const [draftFlags, setDraftFlags] = useState(() => flagsFromSubmission(submission));

  const patch = useCallback(
    async (body) => {
      const res = await api.put(
        `${import.meta.env.VITE_SUBMISSION_API}/passes/${submission.id}`,
        body,
        { headers: { 'Content-Type': 'application/json' } },
      );
      if (res.data?.submission) {
        onPatched(res.data.submission);
      }
      toast.success(t('passSubmissions.success.patch'));
    },
    [onPatched, submission.id, t],
  );

  useEffect(() => {
    if (!editingLevel) return;
    const idStr = levelInput.trim();
    if (!/^\d+$/.test(idStr)) {
      setLevelLoading(false);
      setLevelPreview(null);
      return;
    }
    setLevelLoading(true);
    setLevelPreview(null);
    if (levelFetchCancelTokenRef.current) {
      levelFetchCancelTokenRef.current.cancel('New level fetch');
    }
    levelFetchCancelTokenRef.current = api.CancelToken.source();
    api
      .get(`${import.meta.env.VITE_LEVELS}/${idStr}`, {
        cancelToken: levelFetchCancelTokenRef.current.token,
      })
      .then((response) => {
        if (response.data.level?.isDeleted) {
          setLevelPreview(null);
          setLevelLoading(false);
          return;
        }
        setLevelPreview(response.data.level || null);
        setLevelLoading(false);
      })
      .catch((error) => {
        if (!api.isCancel(error)) {
          setLevelPreview(null);
          setLevelLoading(false);
        }
      });
    return () => {
      if (levelFetchCancelTokenRef.current) {
        levelFetchCancelTokenRef.current.cancel('Cleanup');
      }
    };
  }, [levelInput, editingLevel]);

  const searchLevels = async (query) => {
    if (!query) {
      setLevelSearchResults([]);
      return;
    }
    if (searchCancelTokenRef.current) {
      searchCancelTokenRef.current.cancel('New search');
    }
    searchCancelTokenRef.current = api.CancelToken.source();
    try {
      const response = await api.get(`${import.meta.env.VITE_LEVELS}`, {
        params: { query, limit: 50, offset: 0 },
        cancelToken: searchCancelTokenRef.current.token,
      });
      setLevelSearchResults(response.data.results || []);
    } catch (error) {
      if (!api.isCancel(error)) {
        setLevelSearchResults([]);
      }
    }
  };

  const handleLevelInputChange = (e) => {
    const value = e.target.value;
    setLevelInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      if (value) searchLevels(value);
      else setLevelSearchResults([]);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        levelDropdownRef.current &&
        levelSearchContainerRef.current &&
        !levelDropdownRef.current.contains(event.target) &&
        !levelSearchContainerRef.current.contains(event.target)
      ) {
        setLevelExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const beginEditLevel = () => {
    snapLevelIdRef.current = submission.levelId;
    setLevelInput(String(submission.levelId ?? ''));
    setLevelPreview(submission.level || null);
    setLevelSearchResults([]);
    setLevelExpanded(false);
    setEditingLevel(true);
  };

  const cancelEditLevel = () => {
    setEditingLevel(false);
    setLevelSearchResults([]);
    setLevelExpanded(false);
  };

  const saveLevel = async () => {
    const idNum = parseInt(levelInput.trim(), 10);
    if (Number.isNaN(idNum) || idNum <= 0) {
      toast.error(t('passSubmissions.errors.patch'));
      return;
    }
    if (idNum === snapLevelIdRef.current) {
      cancelEditLevel();
      return;
    }
    try {
      await patch({ levelId: idNum });
      cancelEditLevel();
    } catch {
      toast.error(t('passSubmissions.errors.patch'));
    }
  };

  const handleLevelSelect = (selectedLevel) => {
    setLevelInput(String(selectedLevel.id));
    setLevelPreview(selectedLevel);
    setLevelExpanded(false);
  };

  const beginEditJudgements = () => {
    snapJudgementsRef.current = judgementsFromSubmission(submission);
    setDraftJudgements(judgementsFromSubmission(submission));
    setEditingJudgements(true);
  };

  const cancelEditJudgements = () => {
    setEditingJudgements(false);
  };

  const saveJudgements = async () => {
    const diff = diffJudgements(snapJudgementsRef.current, draftJudgements);
    if (Object.keys(diff).length === 0) {
      cancelEditJudgements();
      return;
    }
    try {
      await patch({ judgements: diff });
      cancelEditJudgements();
    } catch {
      toast.error(t('passSubmissions.errors.patch'));
    }
  };

  const beginEditSpeed = () => {
    const s = submission.speed;
    const str = s !== null && s !== undefined ? String(s) : '1.0';
    snapSpeedRef.current = str;
    setDraftSpeed(str);
    setEditingSpeed(true);
  };

  const cancelEditSpeed = () => {
    setEditingSpeed(false);
  };

  const saveSpeed = async () => {
    if (!validateSpeed(draftSpeed)) {
      toast.error(t('passSubmissions.errors.patch'));
      return;
    }
    const parsed = parseFloat(draftSpeed || '1');
    const snapParsed = parseFloat(snapSpeedRef.current || '1');
    if (parsed === snapParsed) {
      cancelEditSpeed();
      return;
    }
    try {
      await patch({ speed: parsed });
      cancelEditSpeed();
    } catch {
      toast.error(t('passSubmissions.errors.patch'));
    }
  };

  const beginEditFlags = () => {
    snapFlagsRef.current = flagsFromSubmission(submission);
    setDraftFlags(flagsFromSubmission(submission));
    setEditingFlags(true);
  };

  const cancelEditFlags = () => {
    setEditingFlags(false);
  };

  const saveFlags = async () => {
    const diff = diffFlags(snapFlagsRef.current, draftFlags);
    if (Object.keys(diff).length === 0) {
      cancelEditFlags();
      return;
    }
    try {
      await patch({ flags: diff });
      cancelEditFlags();
    } catch {
      toast.error(t('passSubmissions.errors.patch'));
    }
  };

  const level = submission.level;
  const flags = submission.flags;
  const diffIconKey = level?.diffId;

  return (
    <div className="pass-submission-meta-edit">
      <div className="detail-row pass-submission-meta-row">
        <span className="detail-label">{t('passSubmissions.details.level')}</span>
        <div className="pass-submission-meta-row-main">
          {!editingLevel ? (
            <>
              <div
                className="level-info"
                onClick={() => {
                  if (level?.id) {
                    window.open(`/levels/${level.id}`, '_blank');
                  }
                }}
              >
                <img
                  src={difficultyDict[diffIconKey]?.icon}
                  alt={level?.song}
                  className="diff-icon"
                />
                <span className="detail-value">{level?.song || 'Null'}</span>
              </div>
              <button type="button" className="pass-submission-meta-edit-btn" onClick={beginEditLevel}>
                {t('passSubmissions.edit.edit')}
              </button>
            </>
          ) : (
            <div className="pass-submission-level-edit">
              <div className="id-input">
                <div className="search-container" ref={levelSearchContainerRef}>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder={t('passSubmissions.edit.levelPlaceholder')}
                    name="levelId"
                    value={levelInput}
                    onChange={handleLevelInputChange}
                  />
                  {levelSearchResults.length > 0 && (
                    <button
                      type="button"
                      className={`expand-button btn-fill-primary ${levelExpanded ? 'expanded' : ''}`}
                      onClick={() => setLevelExpanded((e) => !e)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className={`level-dropdown ${levelExpanded ? 'expanded' : ''}`} ref={levelDropdownRef}>
                  {levelSearchResults.map((result) => (
                    <div
                      key={result.id}
                      className="level-option"
                      onClick={() => handleLevelSelect(result)}
                    >
                      <img
                        src={difficultyDict[result.diffId]?.icon}
                        alt={difficultyDict[result.diffId]?.name}
                        className="difficulty-icon"
                      />
                      <div className="level-content">
                        <div className="level-title">
                          {result.song} (ID: {result.id})
                        </div>
                        <div className="level-details">
                          <span>{result.artist}</span>
                          <span>{formatCreatorDisplay(result)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="information">
                  {levelPreview && levelInput && /^\d+$/.test(levelInput.trim()) ? (
                    <>
                      <img
                        src={difficultyDict[levelPreview.diffId]?.icon}
                        alt={difficultyDict[levelPreview.diffId]?.name}
                        className="level-icon"
                      />
                      <div className="level-info">
                        <h2 className="level-info-sub">{truncateString(levelPreview.song, 30)}</h2>
                        <div className="level-info-sub">
                          <span>{truncateString(levelPreview.artist, 15)}</span>
                          <span>{formatCreatorDisplay(levelPreview)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="level-info">
                      <h2 className="level-info-sub" style={{ color: '#aaa' }}>
                        {levelLoading ? t('passSubmissions.edit.fetchingLevel') : t('passSubmissions.edit.songPlaceholder')}
                      </h2>
                    </div>
                  )}
                </div>
              </div>
              <div className="pass-submission-meta-actions">
                <button type="button" className="pass-submission-meta-save" onClick={saveLevel}>
                  {t('passSubmissions.edit.save')}
                </button>
                <button type="button" className="pass-submission-meta-cancel" onClick={cancelEditLevel}>
                  {t('passSubmissions.edit.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {betweenLevelAndSpeed}

      <div className="detail-row pass-submission-meta-row">
        <span className="detail-label">{t('passSubmissions.details.speed')}</span>
        <div className="pass-submission-meta-row-main">
          {!editingSpeed ? (
            <>
              <span className="detail-value">{submission.speed ?? '1.0'}</span>
              <button type="button" className="pass-submission-meta-edit-btn" onClick={beginEditSpeed}>
                {t('passSubmissions.edit.edit')}
              </button>
            </>
          ) : (
            <div className="pass-submission-inline-edit">
              <input
                type="text"
                autoComplete="off"
                value={draftSpeed}
                onChange={(e) => setDraftSpeed(e.target.value)}
                className="pass-submission-speed-input"
              />
              <div className="pass-submission-meta-actions">
                <button type="button" className="pass-submission-meta-save" onClick={saveSpeed}>
                  {t('passSubmissions.edit.save')}
                </button>
                <button type="button" className="pass-submission-meta-cancel" onClick={cancelEditSpeed}>
                  {t('passSubmissions.edit.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {betweenSpeedAndJudgements}

      <div className="detail-row pass-submission-meta-row">
        <span className="detail-label">{t('passSubmissions.details.judgements.label')}</span>
        <div className="pass-submission-meta-row-main">
          {!editingJudgements ? (
            <>
              <div className="judgements-details">
                {JUDGEMENT_KEYS.map((k) => (
                  <span key={k} className={`judgement ${JUDGEMENT_CLASS[k]}`}>
                    {submission.judgements?.[k] !== null && submission.judgements?.[k] !== undefined
                      ? submission.judgements[k]
                      : '0'}
                  </span>
                ))}
              </div>
              <button type="button" className="pass-submission-meta-edit-btn" onClick={beginEditJudgements}>
                {t('passSubmissions.edit.edit')}
              </button>
            </>
          ) : (
            <div className="pass-submission-judgements-edit">
              <div className="pass-submission-judgements-inputs">
                {JUDGEMENT_KEYS.map((k) => (
                  <label key={k} className="pass-submission-judgement-field">
                    <span className="pass-submission-judgement-label">{t(`passSubmissions.details.judgements.fields.${k}`)}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={draftJudgements[k]}
                      onChange={(e) =>
                        setDraftJudgements((prev) => ({ ...prev, [k]: e.target.value }))
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="pass-submission-meta-actions">
                <button type="button" className="pass-submission-meta-save" onClick={saveJudgements}>
                  {t('passSubmissions.edit.save')}
                </button>
                <button type="button" className="pass-submission-meta-cancel" onClick={cancelEditJudgements}>
                  {t('passSubmissions.edit.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="detail-row pass-submission-meta-row">
        <span className="detail-label">{t('passSubmissions.details.flags.label')}</span>
        <div className="pass-submission-meta-row-main">
          {!editingFlags ? (
            <>
              <div className="flags-details">
                {flags?.is12K && <span>{t('passSubmissions.details.flags.types.12k')}</span>}
                {flags?.isNoHoldTap && <span>{t('passSubmissions.details.flags.types.nht')}</span>}
                {flags?.is16K && <span>{t('passSubmissions.details.flags.types.16k')}</span>}
              </div>
              <button type="button" className="pass-submission-meta-edit-btn" onClick={beginEditFlags}>
                {t('passSubmissions.edit.edit')}
              </button>
            </>
          ) : (
            <div className="pass-submission-flags-edit">
              <label className="pass-submission-flag-field">
                <input
                  type="checkbox"
                  checked={draftFlags.is12K}
                  onChange={(e) => setDraftFlags((f) => ({ ...f, is12K: e.target.checked }))}
                />
                <span>{t('passSubmissions.details.flags.types.12k')}</span>
              </label>
              <label className="pass-submission-flag-field">
                <input
                  type="checkbox"
                  checked={draftFlags.isNoHoldTap}
                  onChange={(e) => setDraftFlags((f) => ({ ...f, isNoHoldTap: e.target.checked }))}
                />
                <span>{t('passSubmissions.details.flags.types.nht')}</span>
              </label>
              <label className="pass-submission-flag-field">
                <input
                  type="checkbox"
                  checked={draftFlags.is16K}
                  onChange={(e) => setDraftFlags((f) => ({ ...f, is16K: e.target.checked }))}
                />
                <span>{t('passSubmissions.details.flags.types.16k')}</span>
              </label>
              <div className="pass-submission-meta-actions">
                <button type="button" className="pass-submission-meta-save" onClick={saveFlags}>
                  {t('passSubmissions.edit.save')}
                </button>
                <button type="button" className="pass-submission-meta-cancel" onClick={cancelEditFlags}>
                  {t('passSubmissions.edit.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
