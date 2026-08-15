import { routes } from '@/api/routes';
// tuf-search: #PassScoreCalculatorPage #passScoreCalculator #submissions #passSubmission

import './passsubmission.css';
import '@/components/passScoreCalculator/passScoreCalculator.css';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { difficultyRequiresPassKeyCount } from '@/utils/Utility';
import toast from 'react-hot-toast';
import { usePassCoreForm } from '@/components/common/cores/PassCoreForm/usePassCoreForm';
import { usePassScoreCalculator } from '@/components/passScoreCalculator/usePassScoreCalculator';
import { PassScoreCalculatorResults } from '@/components/passScoreCalculator/PassScoreCalculatorResults';
import {
  encodeCalculatorShare,
  decodeCalculatorShare,
} from '@/components/passScoreCalculator/passScoreCalculatorShare';
import { buildCalculatorLevelContext, scoringDefaultsFromLevel, overrideInputValue } from '@/components/passScoreCalculator/passScoreCalculatorMath';
import { AdminLevelXaccCurvePopup } from '@/components/popups/Levels/EditLevelPopup/AdminLevelXaccCurvePopup';
import { ScoreV2Graph } from '@/components/common/display/ScoreV2Graph/ScoreV2Graph';
import {
  pickLevelXaccCurve,
  resolveXaccCurveForLevelData,
} from '@/utils/scoreV2XaccCurve';
import { PASS_SUBMISSION_INITIAL_FORM } from './passSubmissionInitialForm';
import { PassSubmissionCore } from './PassSubmissionCore';
import { CalculatorToolPopup } from '@/components/passScoreCalculator/CalculatorToolPopup';
import { LoadPassPopup } from '@/components/passScoreCalculator/LoadPassPopup';
import { JudgementInputs } from '@/components/common/cores/PassCoreForm/JudgementInputs';
import { RatingInput } from '@/components/common/selectors';
import { ImportIcon, EditIcon, CompareIcon, ChevronIcon } from '@/components/common/icons';

const EMPTY_OVERRIDES = {
  baseScore: '',
  ppBaseScore: '',
  difficultyBaseScore: '',
  diffId: '',
  cutoff: '',
  poleOffset: '',
  topMultiplier: '',
  tilecount: '',
  xaccCurveMeta: null,
};

function hydrateOverrides(raw) {
  const merged = { ...EMPTY_OVERRIDES, ...(raw || {}) };
  if (
    (merged.baseScore == null || String(merged.baseScore).trim() === '') &&
    merged.difficultyBaseScore != null &&
    String(merged.difficultyBaseScore).trim() !== ''
  ) {
    merged.baseScore = merged.difficultyBaseScore;
  }
  return merged;
}

function cloneOverrides(raw) {
  const merged = hydrateOverrides(raw);
  return {
    ...merged,
    xaccCurveMeta: merged.xaccCurveMeta ? { ...merged.xaccCurveMeta } : null,
  };
}

function overridesAreEqual(a, b) {
  return JSON.stringify(cloneOverrides(a)) === JSON.stringify(cloneOverrides(b));
}

const EMPTY_COMPARE = {
  ePerfect: '',
  perfect: '',
  lPerfect: '',
  tooEarly: '',
  early: '',
  late: '',
};

function TargetIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="12" r="1.5" fill={color} />
    </svg>
  );
}

function cloneCompareForm(raw) {
  return { ...EMPTY_COMPARE, ...(raw || {}) };
}

function compareFormsEqual(a, b) {
  return JSON.stringify(cloneCompareForm(a)) === JSON.stringify(cloneCompareForm(b));
}

function compareFormFromPassForm(form) {
  return cloneCompareForm({
    ePerfect: form?.ePerfect ?? '',
    perfect: form?.perfect ?? '',
    lPerfect: form?.lPerfect ?? '',
    tooEarly: form?.tooEarly ?? '',
    early: form?.early ?? '',
    late: form?.late ?? '',
  });
}

function ToolIconButton({ label, active, onClick, children }) {
  return (
    <button
      type="button"
      className={
        active
          ? 'pass-score-calculator__icon-btn is-active'
          : 'pass-score-calculator__icon-btn'
      }
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function PopupSaveCancel({ onCancel, onSave, children = null }) {
  const { t } = useTranslation(['pages', 'common']);
  return (
    <div className="pass-score-calculator__popup-actions">
      {children}
      <div className="pass-score-calculator__popup-actions-end">
        <button
          type="button"
          className="pass-score-calculator__btn pass-score-calculator__btn--ghost"
          onClick={onCancel}
        >
          {t('buttons.cancel', { ns: 'common' })}
        </button>
        <button
          type="button"
          className="pass-score-calculator__btn pass-score-calculator__btn--primary"
          onClick={onSave}
        >
          {t('buttons.save', { ns: 'common' })}
        </button>
      </div>
    </div>
  );
}

const PassScoreCalculatorPage = () => {
  const { t } = useTranslation(['pages', 'common']);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { difficultyDict, difficulties } = useDifficultyContext();
  const { user } = useAuth();

  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('passSubmission.calculator.title'),
        description: t('passSubmission.calculator.meta.description'),
        pathname: location.pathname,
        noindex: true,
      }),
    [t, location.pathname],
  );

  const [overrides, setOverrides] = useState(() => hydrateOverrides(location.state?.overrides));
  const [targetScore, setTargetScore] = useState(() => location.state?.targetScore ?? '');
  const [compareForm, setCompareForm] = useState(() => ({
    ...EMPTY_COMPARE,
    ...(location.state?.compareForm || {}),
  }));
  const [showCurveEditor, setShowCurveEditor] = useState(false);
  const [openTool, setOpenTool] = useState(null);
  const [draftOverrides, setDraftOverrides] = useState(null);
  const [draftTargetScore, setDraftTargetScore] = useState(null);
  const [draftCompareForm, setDraftCompareForm] = useState(null);
  const [searchInput, setSearchInput] = useState(() => location.state?.searchInput || '');
  const shareHydratedRef = useRef(false);

  const {
    form,
    setForm,
    submitAttempt,
    isFormValid,
    isFormValidDisplay,
    isValidFeelingRating,
    isValidExpectedRating,
    isValidKeyCount,
    isValidSpeed,
    level,
    setLevel,
    levelLoading,
    videoDetail,
    videoLinkResolving,
    accuracy,
    score,
    handleInputChange,
  } = usePassCoreForm({
    mode: 'calculator',
    initialForm: location.state?.form || PASS_SUBMISSION_INITIAL_FORM,
    rejectDeletedLevel: false,
    isUDiffLevel: (lvl) =>
      difficultyDict[lvl?.diffId]?.name?.[0] === 'U' ||
      difficultyDict[lvl?.diffId]?.name?.[0] === 'Q',
    isKeyCountRequiredLevel: (lvl) =>
      difficultyRequiresPassKeyCount(difficultyDict[lvl?.diffId]?.name),
    extraValidation: () => ({}),
    scoreOverrides: overrides,
    allowSandboxScore: true,
  });

  const { result, error: calcError, isCalculating, run: runCalculator } = usePassScoreCalculator();

  useEffect(() => {
    if (shareHydratedRef.current) return;
    if (![...searchParams.keys()].length) {
      shareHydratedRef.current = true;
      return;
    }
    shareHydratedRef.current = true;
    const decoded = decodeCalculatorShare(searchParams);
    if (Object.keys(decoded.form).length) {
      setForm((prev) => ({ ...prev, ...decoded.form }));
      if (decoded.form.levelId) setSearchInput(String(decoded.form.levelId));
    }
    if (Object.keys(decoded.overrides).length) {
      setOverrides((prev) => hydrateOverrides({ ...prev, ...decoded.overrides }));
    }
    if (decoded.targetScore) setTargetScore(decoded.targetScore);
    if (decoded.compareForm) setCompareForm((prev) => ({ ...prev, ...decoded.compareForm }));
  }, [searchParams, setForm]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.username) return;
      const { username } = user;
      try {
        const searchUrl = `${routes.playersV3.root()}/search?query=${encodeURIComponent(username)}`;
        const response = await api.get(searchUrl);
        const body = response.data;
        const profiles = Array.isArray(body) ? body : (body?.results ?? []);
        const exactMatchResult = profiles.find(
          (p) => p?.name && p.name.toLowerCase() === (user.nickname || '').toLowerCase(),
        );

        if (exactMatchResult?.id) {
          setForm((prev) => ({
            ...prev,
            playerId: prev.playerId || exactMatchResult.id,
            leaderboardName: prev.leaderboardName || exactMatchResult.name,
          }));
        } else {
          setForm((prev) => ({
            ...prev,
            playerId: prev.playerId || '',
            leaderboardName: prev.leaderboardName || username,
          }));
        }
      } catch (error) {
        console.error('[Profile Search] Error searching profiles:', error);
        setForm((prev) => ({
          ...prev,
          playerId: prev.playerId || '',
          leaderboardName: prev.leaderboardName || username,
        }));
      }
    };

    fetchProfile();
  }, [user, setForm]);

  const handleCalculate = () => {
    void runCalculator({
      form,
      level,
      overrides,
      difficultyDict,
      targetScore,
      compareForm,
    });
  };

  const handleCopyLink = async () => {
    const params = encodeCalculatorShare({ form, overrides, targetScore, compareForm });
    const url = `${window.location.origin}/submission/pass/calculator?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('passSubmission.calculator.linkCopied'));
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const levelScoringDefaults = useMemo(
    () => scoringDefaultsFromLevel(level, difficultyDict),
    [level, difficultyDict],
  );

  useEffect(() => {
    if (!level) return;
    const nextBase = levelScoringDefaults.baseScore;
    if (nextBase === '' || nextBase == null) return;
    setOverrides((prev) => {
      if (prev.baseScore != null && String(prev.baseScore).trim() !== '') return prev;
      return {
        ...prev,
        baseScore: nextBase,
      };
    });
  }, [level?.id, levelScoringDefaults.baseScore]);

  const handleResetOverrides = () => {
    setDraftOverrides(
      cloneOverrides({
        ...EMPTY_OVERRIDES,
        baseScore: levelScoringDefaults.baseScore || null,
      }),
    );
  };

  const editorOverrides = draftOverrides ?? overrides;

  const hasCurveOverride = Boolean(
    overrides.xaccCurveMeta ||
      (overrides.cutoff != null && String(overrides.cutoff).trim() !== '') ||
      (overrides.poleOffset != null && String(overrides.poleOffset).trim() !== '') ||
      (overrides.topMultiplier != null && String(overrides.topMultiplier).trim() !== ''),
  );

  const editorHasCurveOverride = Boolean(
    editorOverrides.xaccCurveMeta ||
      (editorOverrides.cutoff != null && String(editorOverrides.cutoff).trim() !== '') ||
      (editorOverrides.poleOffset != null && String(editorOverrides.poleOffset).trim() !== '') ||
      (editorOverrides.topMultiplier != null && String(editorOverrides.topMultiplier).trim() !== ''),
  );

  const curveEditorLevel = useMemo(() => {
    const base = level
      ? { ...level }
      : {
          id: null,
          baseScore: 100,
          ppBaseScore: 0,
          tilecount: 100,
          difficulty: {},
          xaccCurveMeta: null,
        };

    if (editorOverrides.baseScore != null && editorOverrides.baseScore !== '' && Number.isFinite(Number(editorOverrides.baseScore))) {
      base.baseScore = Number(editorOverrides.baseScore);
    }
    if (editorOverrides.ppBaseScore !== '' && Number.isFinite(Number(editorOverrides.ppBaseScore))) {
      base.ppBaseScore = Number(editorOverrides.ppBaseScore);
    }
    if (editorOverrides.tilecount !== '' && Number.isFinite(Number(editorOverrides.tilecount))) {
      base.tilecount = Number(editorOverrides.tilecount);
    }

    if (editorOverrides.xaccCurveMeta) {
      base.xaccCurveMeta = editorOverrides.xaccCurveMeta;
    } else if (editorHasCurveOverride) {
      const existing = resolveXaccCurveForLevelData(base);
      base.xaccCurveMeta = {
        cutoff:
          editorOverrides.cutoff !== '' && editorOverrides.cutoff != null
            ? Number(editorOverrides.cutoff)
            : existing.cutoff,
        poleOffset:
          editorOverrides.poleOffset !== '' && editorOverrides.poleOffset != null
            ? Number(editorOverrides.poleOffset)
            : existing.poleOffset,
        topMultiplier:
          editorOverrides.topMultiplier !== '' && editorOverrides.topMultiplier != null
            ? Number(editorOverrides.topMultiplier)
            : existing.topMultiplier,
      };
    }

    return base;
  }, [level, editorOverrides, editorHasCurveOverride]);

  const calculatorGraphLevelData = useMemo(() => {
    try {
      return buildCalculatorLevelContext(level, editorOverrides, difficultyDict);
    } catch {
      return null;
    }
  }, [level, editorOverrides, difficultyDict]);

  const calculatorGraphCurve = useMemo(() => {
    if (!calculatorGraphLevelData) return null;
    return (
      pickLevelXaccCurve(calculatorGraphLevelData) ||
      resolveXaccCurveForLevelData(calculatorGraphLevelData)
    );
  }, [calculatorGraphLevelData]);

  const calculatorGraphTilecount = useMemo(() => {
    const fromOverride =
      editorOverrides.tilecount !== '' && Number.isFinite(Number(editorOverrides.tilecount))
        ? Number(editorOverrides.tilecount)
        : null;
    const fromLevel = level?.tilecount > 0 ? level.tilecount : null;
    return fromOverride || fromLevel || 100;
  }, [editorOverrides.tilecount, level?.tilecount]);

  const handleApplyCurveMeta = useCallback((meta) => {
    setDraftOverrides((prev) => ({
      ...(prev || EMPTY_OVERRIDES),
      xaccCurveMeta: meta || null,
      cutoff: '',
      poleOffset: '',
      topMultiplier: '',
    }));
  }, []);

  const handleClearCurveOverride = () => {
    setDraftOverrides((prev) => ({
      ...(prev || EMPTY_OVERRIDES),
      xaccCurveMeta: null,
      cutoff: '',
      poleOffset: '',
      topMultiplier: '',
    }));
  };

  const handleLoadPass = (pass) => {
    if (!pass?.id) {
      toast.error(t('passSubmission.calculator.loadPass.failed'));
      return;
    }
    const j = pass.judgements || {};
    setForm((prev) => ({
      ...prev,
      levelId: String(pass.levelId ?? pass.level?.id ?? ''),
      speed: pass.speed != null ? String(pass.speed) : '',
      isNoHold: Boolean(pass.isNoHoldTap),
      playerId: pass.playerId || pass.player?.id || '',
      leaderboardName: pass.player?.name || prev.leaderboardName,
      tooEarly: String(j.earlyDouble ?? j.tooEarly ?? 0),
      early: String(j.earlySingle ?? j.early ?? 0),
      ePerfect: String(j.ePerfect ?? 0),
      perfect: String(j.perfect ?? 0),
      lPerfect: String(j.lPerfect ?? 0),
      late: String(j.lateSingle ?? j.late ?? 0),
    }));
    setSearchInput(String(pass.levelId ?? pass.level?.id ?? ''));
    if (pass.level) setLevel(pass.level);
    setOpenTool(null);
    toast.success(t('passSubmission.calculator.loadPass.loaded'));
  };

  const patchOverride = (key, value) => {
    setDraftOverrides((prev) => ({ ...(prev || EMPTY_OVERRIDES), [key]: value }));
  };

  const handleBaseScoreChange = (value, isFromDropdown) => {
    if (isFromDropdown) {
      const selectedDiff = difficulties?.find((d) => d.name === value);
      if (selectedDiff) {
        setDraftOverrides((prev) => ({
          ...(prev || EMPTY_OVERRIDES),
          baseScore: selectedDiff.baseScore,
        }));
      } else {
        const numericValue = parseFloat(value);
        if (!Number.isNaN(numericValue)) {
          setDraftOverrides((prev) => ({
            ...(prev || EMPTY_OVERRIDES),
            baseScore: numericValue,
          }));
        }
      }
    } else {
      setDraftOverrides((prev) => ({
        ...(prev || EMPTY_OVERRIDES),
        baseScore: value === '' ? null : value,
      }));
    }
  };

  const getBaseScoreDisplay = useCallback(() => {
    if (editorOverrides.baseScore === null || editorOverrides.baseScore === undefined) {
      return '';
    }
    const baseScore = parseFloat(editorOverrides.baseScore);
    const matchingDiff = difficulties?.find((d) => d.baseScore === baseScore);
    return matchingDiff ? matchingDiff.name : editorOverrides.baseScore?.toString();
  }, [editorOverrides.baseScore, difficulties]);

  useEffect(() => {
    if (openTool === 'overrides') {
      setDraftOverrides((prev) => prev ?? cloneOverrides(overrides));
    } else {
      setDraftOverrides(null);
    }
    if (openTool === 'target') {
      setDraftTargetScore((prev) => prev ?? String(targetScore ?? ''));
    } else {
      setDraftTargetScore(null);
    }
    if (openTool === 'compare') {
      setDraftCompareForm((prev) => prev ?? cloneCompareForm(compareForm));
    } else {
      setDraftCompareForm(null);
    }
  }, [openTool]);

  const confirmDiscardIfDirty = (dirty) => {
    if (!dirty) return true;
    return window.confirm(t('confirmations.unsavedChanges', { ns: 'common' }));
  };

  const closeOverridesPopup = () => {
    if (!confirmDiscardIfDirty(draftOverrides && !overridesAreEqual(draftOverrides, overrides))) {
      return;
    }
    setShowCurveEditor(false);
    setDraftOverrides(null);
    setOpenTool(null);
  };

  const saveOverridesPopup = () => {
    if (draftOverrides) {
      setOverrides(cloneOverrides(draftOverrides));
    }
    setShowCurveEditor(false);
    setDraftOverrides(null);
    setOpenTool(null);
  };

  const closeTargetPopup = () => {
    if (!confirmDiscardIfDirty(draftTargetScore != null && String(draftTargetScore) !== String(targetScore ?? ''))) {
      return;
    }
    setDraftTargetScore(null);
    setOpenTool(null);
  };

  const saveTargetPopup = () => {
    if (draftTargetScore != null) {
      setTargetScore(draftTargetScore);
    }
    setDraftTargetScore(null);
    setOpenTool(null);
  };

  const closeComparePopup = () => {
    if (!confirmDiscardIfDirty(draftCompareForm && !compareFormsEqual(draftCompareForm, compareForm))) {
      return;
    }
    setDraftCompareForm(null);
    setOpenTool(null);
  };

  const saveComparePopup = () => {
    if (draftCompareForm) {
      setCompareForm(cloneCompareForm(draftCompareForm));
    }
    setDraftCompareForm(null);
    setOpenTool(null);
  };

  const patchCompare = (key, value) => {
    setDraftCompareForm((prev) => ({ ...cloneCompareForm(prev), [key]: value }));
  };

  const importCompareFromForm = () => {
    setDraftCompareForm(compareFormFromPassForm(form));
  };

  const hasNumericOverride = ['baseScore', 'ppBaseScore', 'tilecount', 'diffId'].some(
    (key) => {
      const value = overrides[key];
      if (value == null || String(value).trim() === '') return false;
      const fallback = levelScoringDefaults[key];
      if (fallback !== undefined && fallback !== '' && Number(value) === Number(fallback)) return false;
      if (key === 'diffId' && level?.diffId != null && Number(value) === Number(level.diffId)) return false;
      return true;
    },
  );
  const hasOverrides = hasCurveOverride || hasNumericOverride;
  const hasTarget = String(targetScore).trim() !== '';
  const hasCompare = Object.values(compareForm).some((v) => String(v ?? '').trim() !== '');

  const calculatorState = {
    overrides,
    targetScore,
    compareForm,
  };

  return (
    <div className="pass-submission-page pass-score-calculator">
      <MetaTags {...pageMeta} />

      <div className="form-container">
        <div className="pass-score-calculator__form-shell">
          <button
            type="button"
            className="pass-score-calculator__back-btn"
            onClick={() =>
              navigate('/submission/pass', {
                state: {
                  form,
                  searchInput,
                  ...calculatorState,
                },
              })
            }
            aria-label={t('passSubmission.calculator.backToSubmit')}
            title={t('passSubmission.calculator.backToSubmit')}
          >
            <ChevronIcon direction="left" size={20} color="currentColor" />
          </button>
          <PassSubmissionCore
          mode="calculator"
          form={form}
          setForm={setForm}
          isFormValidDisplay={isFormValidDisplay}
          isValidSpeed={isValidSpeed}
          isValidFeelingRating={isValidFeelingRating}
          isValidExpectedRating={isValidExpectedRating}
          isValidKeyCount={isValidKeyCount}
          submitAttempt={submitAttempt}
          isFormValid={isFormValid}
          level={level}
          setLevel={setLevel}
          levelLoading={levelLoading}
          videoDetail={videoDetail}
          videoLinkResolving={videoLinkResolving}
          accuracy={accuracy}
          score={score}
          handleInputChange={handleInputChange}
          difficultyDict={difficultyDict}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          renderLevelInfoActions={() => (
            <ToolIconButton
              label={t('passSubmission.calculator.overrides.title')}
              active={hasOverrides}
              onClick={() => {
                setDraftOverrides(cloneOverrides(overrides));
                setOpenTool('overrides');
              }}
            >
              <EditIcon size="18px" color="currentColor" />
            </ToolIconButton>
          )}
          renderJudgementActions={() => (
            <>
              <ToolIconButton
                label={t('passSubmission.calculator.loadPass.title')}
                onClick={() => setOpenTool('loadPass')}
              >
                <ImportIcon size="18px" color="currentColor" />
              </ToolIconButton>
              <ToolIconButton
                label={t('passSubmission.calculator.targetScore')}
                active={hasTarget}
                onClick={() => {
                  setDraftTargetScore(String(targetScore ?? ''));
                  setOpenTool('target');
                }}
              >
                <TargetIcon />
              </ToolIconButton>
              <ToolIconButton
                label={t('passSubmission.calculator.compareInputs.title')}
                active={hasCompare}
                onClick={() => {
                  setDraftCompareForm(cloneCompareForm(compareForm));
                  setOpenTool('compare');
                }}
              >
                <CompareIcon size="18px" color="currentColor" />
              </ToolIconButton>
            </>
          )}
          renderSubmitActions={() => (
            <div className="pass-score-calculator__form-actions">
              <button
                type="button"
                className="pass-score-calculator__btn pass-score-calculator__btn--primary"
                onClick={handleCalculate}
                disabled={isCalculating}
              >
                {isCalculating
                  ? t('passSubmission.calculator.calculating')
                  : t('passSubmission.calculator.calculate')}
              </button>
              <button
                type="button"
                className="pass-score-calculator__btn pass-score-calculator__btn--ghost"
                onClick={() => void handleCopyLink()}
              >
                {t('passSubmission.calculator.copyLink')}
              </button>
            </div>
          )}
        />
        </div>
        {calcError && (
          <div className="pass-score-calculator__error" role="alert">
            {calcError}
          </div>
        )}
      </div>

      <PassScoreCalculatorResults result={result} difficultyDict={difficultyDict} />

      {openTool === 'overrides' && draftOverrides ? (
        <CalculatorToolPopup
          title={t('passSubmission.calculator.overrides.title')}
          onClose={closeOverridesPopup}
        >
          <p className="psc-muted">{t('passSubmission.calculator.overrides.hint')}</p>
          <div className="pass-score-calculator__fields">
            <div className="pass-score-calculator__field-row">
              <div className="pass-score-calculator__field">
                <label>{t('passSubmission.calculator.overrides.baseScore')}</label>
                <RatingInput
                  value={(() => {
                    if (editorOverrides.baseScore === null || editorOverrides.baseScore === undefined) {
                      return '';
                    }
                    return String(editorOverrides.baseScore);
                  })()}
                  onChange={handleBaseScoreChange}
                  difficulties={difficulties}
                  allowCustomInput={true}
                  placeholder={t('passSubmission.calculator.overrides.baseScore')}
                />
                {getBaseScoreDisplay() !== '' && (
                  <p className="pass-score-calculator__equal-to">
                    {t('passSubmission.calculator.overrides.equalTo', {
                      name: getBaseScoreDisplay(),
                    })}
                  </p>
                )}
              </div>
              <div className="pass-score-calculator__field">
                <label>{t('passSubmission.calculator.overrides.ppBaseScore')}</label>
                <input
                  value={overrideInputValue(editorOverrides.ppBaseScore, levelScoringDefaults.ppBaseScore)}
                  onChange={(e) => patchOverride('ppBaseScore', e.target.value)}
                />
              </div>
            </div>
            <div className="pass-score-calculator__curve">
              <div className="pass-score-calculator__curve-header">
                <label>{t('passSubmission.calculator.overrides.curve')}</label>
                <p className="psc-muted">
                  {editorHasCurveOverride
                    ? t('passSubmission.calculator.overrides.curveCustom')
                    : t('passSubmission.calculator.overrides.curveLevel')}
                </p>
              </div>
              <div className="pass-score-calculator__curve-actions">
                <button
                  type="button"
                  className="pass-score-calculator__btn pass-score-calculator__btn--ghost"
                  onClick={() => setShowCurveEditor(true)}
                >
                  {t('passSubmission.calculator.overrides.editCurve')}
                </button>
                {editorHasCurveOverride ? (
                  <button
                    type="button"
                    className="pass-score-calculator__btn pass-score-calculator__btn--ghost"
                    onClick={handleClearCurveOverride}
                  >
                    {t('passSubmission.calculator.overrides.clearCurve')}
                  </button>
                ) : null}
              </div>
              {calculatorGraphLevelData && calculatorGraphCurve && (
                <div className="pass-score-calculator__curve-preview">
                  <ScoreV2Graph
                    tilecount={calculatorGraphTilecount}
                    levelData={calculatorGraphLevelData}
                    difficultyDict={difficultyDict}
                    xaccCurve={calculatorGraphCurve}
                    adminXaccEditor={false}
                  />
                </div>
              )}
            </div>
            <PopupSaveCancel onCancel={closeOverridesPopup} onSave={saveOverridesPopup}>
              <button
                type="button"
                className="pass-score-calculator__btn pass-score-calculator__btn--ghost"
                onClick={handleResetOverrides}
              >
                {t('passSubmission.calculator.overrides.reset')}
              </button>
            </PopupSaveCancel>
          </div>
        </CalculatorToolPopup>
      ) : null}

      {openTool === 'loadPass' ? (
        <LoadPassPopup
          difficultyDict={difficultyDict}
          onClose={() => setOpenTool(null)}
          onImport={handleLoadPass}
        />
      ) : null}

      {openTool === 'target' && draftTargetScore != null ? (
        <CalculatorToolPopup
          title={t('passSubmission.calculator.targetScore')}
          onClose={closeTargetPopup}
        >
          <div className="pass-score-calculator__fields">
            <div className="pass-score-calculator__field">
              <input
                value={draftTargetScore}
                onChange={(e) => setDraftTargetScore(e.target.value)}
              />
            </div>
            <PopupSaveCancel onCancel={closeTargetPopup} onSave={saveTargetPopup} />
          </div>
        </CalculatorToolPopup>
      ) : null}

      {openTool === 'compare' && draftCompareForm ? (
        <CalculatorToolPopup
          title={t('passSubmission.calculator.compareInputs.title')}
          onClose={closeComparePopup}
          panelClassName="psc-tool-popup__panel--wide"
        >
          <p className="psc-muted">{t('passSubmission.calculator.compareInputs.hint')}</p>
          <div className="pass-score-calculator__fields">
            <JudgementInputs
              values={draftCompareForm}
              onChange={(e) => patchCompare(e.target.name, e.target.value)}
              showScore={false}
            />
            <PopupSaveCancel onCancel={closeComparePopup} onSave={saveComparePopup}>
              <button
                type="button"
                className="pass-score-calculator__btn pass-score-calculator__btn--ghost pass-score-calculator__btn--icon"
                onClick={importCompareFromForm}
              >
                <ImportIcon size="16px" color="currentColor" />
                {t('passSubmission.calculator.compareInputs.importJudgements')}
              </button>
            </PopupSaveCancel>
          </div>
        </CalculatorToolPopup>
      ) : null}

      {showCurveEditor ? (
        <AdminLevelXaccCurvePopup
          level={curveEditorLevel}
          sandbox
          onClose={() => setShowCurveEditor(false)}
          onApply={handleApplyCurveMeta}
        />
      ) : null}
    </div>
  );
};

export default PassScoreCalculatorPage;
