// tuf-search: #AdminLevelXaccCurvePopup #xaccCurve #levels #admin
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import './adminlevelxacccurvepopup.css';
import api from '@/utils/api';
import { CloseButton } from '@/components/common/buttons';
import { getPortalRoot } from '@/utils/portalRoot';
import toast from 'react-hot-toast';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { ScoreV2Graph } from '@/components/common/display/ScoreV2Graph/ScoreV2Graph';
import { formatScore } from '@/utils/Utility';
import {
  XACC_CURVE_DEFAULTS,
  pickLevelXaccCurve,
  levelUsesSiteXaccDefaults,
  resolveXaccCurveConfig,
} from '@/utils/scoreV2XaccCurve.js';
import {
  defaultPinSliderValues,
  levelToPinSliderValues,
  maxAccXSliderFromAccYSlider,
  minAccYSliderFromAccXSlider,
  pinSlidersToXaccCurve,
  pinValuesFromSliders,
  resolveAccuracyPctForSave,
  resolvePurePerfectScoreV2,
  scoreFromSlider,
  scoreToSlider,
  accuracyFromSliderPin1,
  accuracyFromSliderPin2,
  accuracyToSliderPin1,
  accuracyToSliderPin2,
  scoreV2AtAccuracy,
} from '@/utils/scoreV2XaccCurvePins.js';
import { XaccPinJudgementInputs } from './XaccPinJudgementInputs.jsx';
import { XaccPinPassPicker } from './XaccPinPassPicker.jsx';
import {
  EMPTY_JUDGEMENT_FORM,
  judgementFormFromPass,
  resolvePassDisplayScore,
  sortPassesByScoreDesc,
  accuracyFromJudgementForm,
  missCountFromJudgementForm,
  hitTilesFromJudgementForm,
} from '@/utils/xaccPinJudgements.js';
import {
  buildXaccEditorBaseline,
  serializeXaccCurveEditorState,
  xaccEditorBaselineMatches,
  xaccPinValuesMatch,
} from '@/utils/xaccCurveEditorState.js';

/** Full precision for copying E/G into site defaults or level meta. */
function formatPoleOffset(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(10) : '—';
}

function formatTopMultiplier(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(8) : '—';
}

function resolvePinBaseScore(level, difficultyDict) {
  if (level?.baseScore > 0) return level.baseScore;
  if (level?.difficulty?.baseScore > 0) return level.difficulty.baseScore;
  const diff = difficultyDict?.[level?.diffId];
  if (diff?.baseScore > 0) return diff.baseScore;
  return 100;
}

function hasExplicitBaseScore(level, difficultyDict) {
  if (level?.baseScore > 0) return true;
  if (level?.difficulty?.baseScore > 0) return true;
  const diff = difficultyDict?.[level?.diffId];
  return diff?.baseScore > 0;
}

function pinInputDraftsFromPins(pins) {
  return {
    accX: (pins.accX * 100).toFixed(2),
    scoreX: pins.scoreX.toFixed(2),
    accY: (pins.accY * 100).toFixed(2),
    scoreY: pins.scoreY.toFixed(2),
  };
}

export const AdminLevelXaccCurvePopup = ({ level, onClose, onSaved }) => {
  const { t } = useTranslation(['components', 'pages']);
  const { difficultyDict } = useDifficultyContext();
  const baseScore = useMemo(
    () => resolvePinBaseScore(level, difficultyDict),
    [level?.baseScore, level?.diffId, difficultyDict],
  );
  const baseScoreHint = !hasExplicitBaseScore(level, difficultyDict);

  const usesSiteDefaults = levelUsesSiteXaccDefaults(level);
  const initialCurve = usesSiteDefaults
    ? XACC_CURVE_DEFAULTS
    : pickLevelXaccCurve(level) ?? XACC_CURVE_DEFAULTS;
  const initialCapLevelData = useMemo(
    () => ({
      baseScore,
      ppBaseScore: level?.ppBaseScore ?? 0,
      diffId: level?.diffId,
      difficulty: level?.difficulty ?? difficultyDict?.[level?.diffId],
      xaccCurve: initialCurve,
    }),
    [baseScore, level?.ppBaseScore, level?.diffId, level?.difficulty, difficultyDict, initialCurve],
  );
  const tilecountForCap = level?.tilecount > 0 ? level.tilecount : 100;

  const initialPurePerfectCap = useMemo(
    () =>
      resolvePurePerfectScoreV2(
        initialCapLevelData,
        difficultyDict,
        tilecountForCap,
      ),
    [initialCapLevelData, difficultyDict, tilecountForCap],
  );

  const pinContext = useMemo(
    () => ({
      levelData: initialCapLevelData,
      difficultyDict,
      tilecount: tilecountForCap,
    }),
    [initialCapLevelData, difficultyDict, tilecountForCap],
  );

  const initial = useMemo(
    () =>
      usesSiteDefaults
        ? defaultPinSliderValues(
            level,
            baseScore,
            initialPurePerfectCap,
            pinContext,
          )
        : levelToPinSliderValues(
            level,
            baseScore,
            initialPurePerfectCap,
            pinContext,
          ),
    [
      level?.id,
      level?.xaccCurveMeta,
      level?.xaccPoleOffset,
      level?.xaccTopMultiplier,
      baseScore,
      initialPurePerfectCap,
      pinContext,
      usesSiteDefaults,
    ],
  );

  const [accXDisplay, setAccXDisplay] = useState(initial.accXDisplay);
  const [scoreXDisplay, setScoreXDisplay] = useState(initial.scoreXDisplay);
  const [accYDisplay, setAccYDisplay] = useState(initial.accYDisplay);
  const [scoreYDisplay, setScoreYDisplay] = useState(initial.scoreYDisplay);
  const [pinScoreX, setPinScoreX] = useState(initial.scoreX);
  const [pinScoreY, setPinScoreY] = useState(initial.scoreY);
  const [pinAccX, setPinAccX] = useState(initial.accX);
  const [pinAccY, setPinAccY] = useState(initial.accY);
  const [saveAsDefaults, setSaveAsDefaults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [disablePP, setDisablePP] = useState(
    () => initial.editor?.disablePP ?? false,
  );
  const [pinInputMode, setPinInputMode] = useState(
    () => initial.editor?.pinInputMode ?? 'accuracy',
  );
  const [levelPasses, setLevelPasses] = useState([]);
  const [passesLoading, setPassesLoading] = useState(false);
  const [openPassPickerPin, setOpenPassPickerPin] = useState(null);
  const [pin1Judgements, setPin1Judgements] = useState(() => ({
    ...(initial.editor?.pin1Judgements ?? EMPTY_JUDGEMENT_FORM),
  }));
  const [pin2Judgements, setPin2Judgements] = useState(() => ({
    ...(initial.editor?.pin2Judgements ?? EMPTY_JUDGEMENT_FORM),
  }));
  const [pin1SourcePassId, setPin1SourcePassId] = useState(
    () => initial.editor?.pin1SourcePassId ?? null,
  );
  const [pin2SourcePassId, setPin2SourcePassId] = useState(
    () => initial.editor?.pin2SourcePassId ?? null,
  );
  const [storedPinMisses, setStoredPinMisses] = useState(() => ({
    hitTiles: initial.hitTiles ?? tilecountForCap,
    missesX: initial.missesX ?? 0,
    missesY: initial.missesY ?? 0,
  }));
  const pinInputFocusRef = useRef(new Set());
  const panelRef = useRef(null);
  const pointerDownOutsideRef = useRef(false);
  const lastValidCurveRef = useRef({
    poleOffset: initialCurve.poleOffset,
    topMultiplier: initialCurve.topMultiplier,
  });
  const tilecount = level?.tilecount > 0 ? level.tilecount : 100;
  const tilecountHint = !level?.tilecount || level.tilecount <= 0;

  const pinMissContext = useMemo(() => {
    const levelHits = tilecount;
    if (pinInputMode === 'judgements') {
      const hits1 = hitTilesFromJudgementForm(pin1Judgements);
      const hits2 = hitTilesFromJudgementForm(pin2Judgements);
      const missesX = missCountFromJudgementForm(pin1Judgements);
      const missesY = missCountFromJudgementForm(pin2Judgements);
      if (hits1 > 0 || hits2 > 0 || missesX > 0 || missesY > 0) {
        return {
          hitTiles: Math.max(levelHits, hits1, hits2, 1),
          missesX,
          missesY,
        };
      }
    }
    return {
      hitTiles: storedPinMisses.hitTiles || levelHits,
      missesX: storedPinMisses.missesX,
      missesY: storedPinMisses.missesY,
    };
  }, [pinInputMode, pin1Judgements, pin2Judgements, tilecount, storedPinMisses]);

  const pinOverrides = useMemo(
    () => ({
      accX: pinAccX,
      accY: pinAccY,
      scoreX: pinScoreX,
      scoreY: pinScoreY,
      ppBaseScore: level?.ppBaseScore ?? 0,
      ...pinMissContext,
    }),
    [pinAccX, pinAccY, pinScoreX, pinScoreY, pinMissContext, level?.ppBaseScore],
  );

  const curveForCap = lastValidCurveRef.current;
  const capLevelData = useMemo(
    () => ({
      baseScore,
      ppBaseScore: level?.ppBaseScore ?? 0,
      diffId: level?.diffId,
      difficulty: level?.difficulty ?? difficultyDict?.[level?.diffId],
      xaccCurve: curveForCap,
    }),
    [
      baseScore,
      level?.ppBaseScore,
      level?.diffId,
      level?.difficulty,
      difficultyDict,
      curveForCap.poleOffset,
      curveForCap.topMultiplier,
    ],
  );

  const scoreCapForFit = useMemo(
    () => resolvePurePerfectScoreV2(capLevelData, difficultyDict, tilecount),
    [capLevelData, difficultyDict, tilecount],
  );

  const [changeBaseline, setChangeBaseline] = useState(() =>
    buildXaccEditorBaseline(
      {
        accX: initial.accX,
        accY: initial.accY,
        scoreX: initial.scoreX,
        scoreY: initial.scoreY,
      },
      initial.editor,
    ),
  );

  const hasChanges = useMemo(() => {
    if (saveAsDefaults) {
      return true;
    }
    return !xaccEditorBaselineMatches(
      buildXaccEditorBaseline(
        {
          accX: pinAccX,
          accY: pinAccY,
          scoreX: pinScoreX,
          scoreY: pinScoreY,
        },
        {
          pinInputMode,
          disablePP,
          pin1Judgements,
          pin2Judgements,
          pin1SourcePassId,
          pin2SourcePassId,
        },
      ),
      changeBaseline,
    );
  }, [
    saveAsDefaults,
    changeBaseline,
    pinAccX,
    pinAccY,
    pinScoreX,
    pinScoreY,
    pinInputMode,
    disablePP,
    pin1Judgements,
    pin2Judgements,
    pin1SourcePassId,
    pin2SourcePassId,
  ]);

  const pinEdits = useMemo(
    () =>
      !xaccPinValuesMatch(
        {
          accX: pinAccX,
          accY: pinAccY,
          scoreX: pinScoreX,
          scoreY: pinScoreY,
        },
        changeBaseline,
      ),
    [pinAccX, pinAccY, pinScoreX, pinScoreY, changeBaseline],
  );

  const requestClose = useCallback(() => {
    if (
      hasChanges &&
      !window.confirm(t('levelPopups.edit.confirmations.unsavedChanges'))
    ) {
      return;
    }
    onClose();
  }, [hasChanges, onClose, t]);

  /** Keep site E/G on mount, after reset, until the user moves a pin control. */
  const lockSiteDefaultCurve = saveAsDefaults || (usesSiteDefaults && !pinEdits);

  const savedMetaCurve = useMemo(() => {
    if (usesSiteDefaults) {
      return null;
    }
    const picked = pickLevelXaccCurve(level);
    if (!picked) {
      return null;
    }
    return resolveXaccCurveConfig(picked);
  }, [
    level?.xaccCurveMeta,
    level?.xaccPoleOffset,
    level?.xaccTopMultiplier,
    usesSiteDefaults,
  ]);

  /** Refit E/G only while editing; reopen uses stored meta curve exactly. */
  const useLiveFitCurve = !lockSiteDefaultCurve && pinEdits;

  const fitContext = useMemo(
    () => ({
      hitTiles: pinMissContext.hitTiles,
      ppBaseScore: level?.ppBaseScore ?? 0,
    }),
    [pinMissContext.hitTiles, level?.ppBaseScore],
  );

  const fitResult = useMemo(
    () =>
      pinSlidersToXaccCurve(
        accXDisplay,
        scoreXDisplay,
        accYDisplay,
        scoreYDisplay,
        baseScore,
        scoreCapForFit,
        pinOverrides,
        lastValidCurveRef.current,
        fitContext,
      ),
    [
      accXDisplay,
      scoreXDisplay,
      accYDisplay,
      scoreYDisplay,
      baseScore,
      scoreCapForFit,
      pinOverrides,
      fitContext,
    ],
  );

  const fitOk = fitResult.ok;
  const fitError = fitResult.error;

  if (useLiveFitCurve && fitOk && fitResult.xaccCurve) {
    lastValidCurveRef.current = fitResult.xaccCurve;
  } else if (savedMetaCurve && !useLiveFitCurve) {
    lastValidCurveRef.current = savedMetaCurve;
  }

  const authoritativeCurve = lockSiteDefaultCurve
    ? XACC_CURVE_DEFAULTS
    : useLiveFitCurve && fitOk && fitResult.xaccCurve
      ? fitResult.xaccCurve
      : savedMetaCurve ?? lastValidCurveRef.current;

  const draftCurve = authoritativeCurve;
  const derivedE = authoritativeCurve.poleOffset;
  const derivedG = authoritativeCurve.topMultiplier;

  const accXMax = maxAccXSliderFromAccYSlider(accYDisplay);
  const accYMin = minAccYSliderFromAccXSlider(accXDisplay);

  const graphLevelData = useMemo(
    () => ({
      baseScore,
      ppBaseScore: level?.ppBaseScore ?? 0,
      diffId: level?.diffId,
      difficulty: level?.difficulty ?? difficultyDict?.[level?.diffId],
      xaccCurve: draftCurve,
    }),
    [
      baseScore,
      level?.ppBaseScore,
      level?.diffId,
      level?.difficulty,
      difficultyDict,
      draftCurve.poleOffset,
      draftCurve.topMultiplier,
    ],
  );

  const graphPurePerfectCap = useMemo(
    () => resolvePurePerfectScoreV2(graphLevelData, difficultyDict, tilecount),
    [graphLevelData, difficultyDict, tilecount],
  );

  const scoreCap =
    graphPurePerfectCap > 0 ? graphPurePerfectCap : scoreCapForFit;

  const resolvedPins = useMemo(
    () =>
      pinValuesFromSliders(
        accXDisplay,
        scoreXDisplay,
        accYDisplay,
        scoreYDisplay,
        baseScore,
        scoreCap,
        pinOverrides,
      ),
    [
      accXDisplay,
      scoreXDisplay,
      accYDisplay,
      scoreYDisplay,
      baseScore,
      scoreCap,
      pinOverrides,
    ],
  );

  const [pinInputDrafts, setPinInputDrafts] = useState(() =>
    pinInputDraftsFromPins(
      pinValuesFromSliders(
        initial.accXDisplay,
        initial.scoreXDisplay,
        initial.accYDisplay,
        initial.scoreYDisplay,
        baseScore,
        initialPurePerfectCap,
        {
          accX: initial.accX,
          accY: initial.accY,
          scoreX: initial.scoreX,
          scoreY: initial.scoreY,
        },
      ),
    ),
  );

  useEffect(() => {
    const siteDefaults = levelUsesSiteXaccDefaults(level);
    const curve = siteDefaults
      ? XACC_CURVE_DEFAULTS
      : pickLevelXaccCurve(level) ?? XACC_CURVE_DEFAULTS;
    lastValidCurveRef.current = {
      poleOffset: curve.poleOffset,
      topMultiplier: curve.topMultiplier,
    };
    const capData = {
      baseScore,
      ppBaseScore: level?.ppBaseScore ?? 0,
      diffId: level?.diffId,
      difficulty: level?.difficulty ?? difficultyDict?.[level?.diffId],
      xaccCurve: curve,
    };
    const nextMax = resolvePurePerfectScoreV2(capData, difficultyDict, tilecount);
    const next = siteDefaults
      ? defaultPinSliderValues(level, baseScore, nextMax, {
          levelData: capData,
          difficultyDict,
          tilecount,
        })
      : levelToPinSliderValues(level, baseScore, nextMax, {
          levelData: capData,
          difficultyDict,
          tilecount,
        });
    setAccXDisplay(next.accXDisplay);
    setScoreXDisplay(next.scoreXDisplay);
    setAccYDisplay(next.accYDisplay);
    setScoreYDisplay(next.scoreYDisplay);
    setPinScoreX(next.scoreX);
    setPinScoreY(next.scoreY);
    setPinAccX(next.accX);
    setPinAccY(next.accY);
    setStoredPinMisses({
      hitTiles: next.hitTiles ?? tilecount,
      missesX: next.missesX ?? 0,
      missesY: next.missesY ?? 0,
    });
    const editor = next.editor ?? null;
    if (editor) {
      setPinInputMode(editor.pinInputMode);
      setPin1Judgements({ ...editor.pin1Judgements });
      setPin2Judgements({ ...editor.pin2Judgements });
      setPin1SourcePassId(editor.pin1SourcePassId);
      setPin2SourcePassId(editor.pin2SourcePassId);
      setDisablePP(editor.disablePP);
    } else {
      setPinInputMode('accuracy');
      setPin1Judgements({ ...EMPTY_JUDGEMENT_FORM });
      setPin2Judgements({ ...EMPTY_JUDGEMENT_FORM });
      setPin1SourcePassId(null);
      setPin2SourcePassId(null);
      setDisablePP(false);
    }
    setSaveAsDefaults(false);
    setError(null);
    pinInputFocusRef.current.clear();
    setPinInputDrafts(
      pinInputDraftsFromPins({
        accX: next.accX,
        accY: next.accY,
        scoreX: next.scoreX,
        scoreY: next.scoreY,
      }),
    );
    setChangeBaseline(
      buildXaccEditorBaseline(
        {
          accX: next.accX,
          accY: next.accY,
          scoreX: next.scoreX,
          scoreY: next.scoreY,
        },
        editor,
      ),
    );
  }, [level?.id, level?.xaccCurveMeta, level?.xaccPoleOffset, level?.xaccTopMultiplier, baseScore, difficultyDict, tilecount]);

  useEffect(() => {
    const focused = pinInputFocusRef.current;
    setPinInputDrafts((prev) => {
      const next = { ...prev };
      if (!focused.has('accX')) {
        next.accX = (pinAccX * 100).toFixed(2);
      }
      if (!focused.has('scoreX')) {
        next.scoreX = pinScoreX.toFixed(2);
      }
      if (!focused.has('accY')) {
        next.accY = (pinAccY * 100).toFixed(2);
      }
      if (!focused.has('scoreY')) {
        next.scoreY = pinScoreY.toFixed(2);
      }
      return next;
    });
  }, [pinAccX, pinAccY, pinScoreX, pinScoreY]);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key !== 'Escape') {
        return;
      }
      if (openPassPickerPin != null) {
        setOpenPassPickerPin(null);
        return;
      }
      requestClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [requestClose, openPassPickerPin]);

  useEffect(() => {
    const onMouseDown = (e) => {
      const panel = panelRef.current;
      pointerDownOutsideRef.current = Boolean(
        panel && !panel.contains(e.target),
      );
    };
    const onMouseUp = (e) => {
      const panel = panelRef.current;
      if (
        pointerDownOutsideRef.current &&
        panel &&
        !panel.contains(e.target)
      ) {
        requestClose();
      }
      pointerDownOutsideRef.current = false;
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [requestClose]);

  useEffect(() => {
    if (!level?.id) {
      setLevelPasses([]);
      return undefined;
    }
    let cancelled = false;
    setPassesLoading(true);
    api
      .get(`${import.meta.env.VITE_PASSES}/level/${level.id}`)
      .then((res) => {
        if (!cancelled) {
          setLevelPasses(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLevelPasses([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPassesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [level?.id]);

  const levelPassesByScore = useMemo(
    () => sortPassesByScoreDesc(levelPasses),
    [levelPasses],
  );

  useEffect(() => {
    if (pinInputMode === 'accuracy') {
      return;
    }
    const acc1 = accuracyFromJudgementForm(pin1Judgements);
    const acc2 = accuracyFromJudgementForm(pin2Judgements);
    if (acc1 != null && Number.isFinite(acc1)) {
      setPinAccX((prev) =>
        Math.abs(prev - acc1) > 1e-12 ? acc1 : prev,
      );
    }
    if (acc2 != null && Number.isFinite(acc2)) {
      setPinAccY((prev) =>
        Math.abs(prev - acc2) > 1e-12 ? acc2 : prev,
      );
    }
  }, [pinInputMode, pin1Judgements, pin2Judgements]);

  const showJudgementInputs = pinInputMode !== 'accuracy';
  const computedAccuracyLabel = t(
    'levelPopups.edit.xaccCurve.inputMode.computedAccuracy',
  );

  const applyPassToPin = useCallback(
    (pass, pin) => {
      if (!pass || (pin !== 1 && pin !== 2)) {
        return;
      }
      const form = judgementFormFromPass(pass);
      const score = resolvePassDisplayScore(pass);
      setPinInputMode('judgements');
      setSaveAsDefaults(false);
      const scoreDisplay = scoreToSlider(score, baseScore, scoreCap);
      const passId =
        pass.id != null && Number.isFinite(Number(pass.id))
          ? Math.floor(Number(pass.id))
          : null;
      if (pin === 1) {
        setPin1Judgements(form);
        setPin1SourcePassId(passId);
        setPinScoreX(score);
        setScoreXDisplay(scoreDisplay);
      } else {
        setPin2Judgements(form);
        setPin2SourcePassId(passId);
        setPinScoreY(score);
        setScoreYDisplay(scoreDisplay);
      }
      setOpenPassPickerPin(null);
    },
    [baseScore, scoreCap],
  );

  const togglePassPicker = (pin) => {
    setOpenPassPickerPin((prev) => (prev === pin ? null : pin));
  };

  const handleJudgementChange = (pin, key, value) => {
    setSaveAsDefaults(false);
    if (pin === 1) {
      setPin1Judgements((prev) => ({ ...prev, [key]: value }));
    } else {
      setPin2Judgements((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handlePinInputModeChange = (mode) => {
    setPinInputMode(mode);
    setSaveAsDefaults(false);
  };

  const handleAccXChange = (value) => {
    const next = Math.min(Number(value), accXMax);
    setAccXDisplay(next);
    setPinAccX(accuracyFromSliderPin1(next));
    setSaveAsDefaults(false);
  };

  const handleScoreXChange = (value) => {
    const display = Number(value);
    setScoreXDisplay(display);
    setPinScoreX(scoreFromSlider(display, baseScore, scoreCap));
    setSaveAsDefaults(false);
  };

  const handleAccYChange = (value) => {
    const next = Math.max(Number(value), accYMin);
    setAccYDisplay(next);
    setPinAccY(accuracyFromSliderPin2(next));
    setSaveAsDefaults(false);
  };

  const handleScoreYChange = (value) => {
    const display = Number(value);
    setScoreYDisplay(display);
    setPinScoreY(scoreFromSlider(display, baseScore, scoreCap));
    setSaveAsDefaults(false);
  };

  const setPinInputFocused = (field, focused) => {
    if (focused) {
      pinInputFocusRef.current.add(field);
    } else {
      pinInputFocusRef.current.delete(field);
    }
  };

  const handlePinInputDraftChange = (field, raw) => {
    setPinInputDrafts((prev) => ({ ...prev, [field]: raw }));
  };

  const resolvedPinInputDisplay = (field) => {
    if (field === 'accX') return (resolvedPins.accX * 100).toFixed(2);
    if (field === 'accY') return (resolvedPins.accY * 100).toFixed(2);
    if (field === 'scoreX') return pinScoreX.toFixed(2);
    return pinScoreY.toFixed(2);
  };

  const commitPinInputDraft = (field) => {
    const raw = pinInputDrafts[field];
    if (field === 'accX') {
      const pct = parseFloat(raw);
      if (Number.isFinite(pct)) {
        const acc = pct / 100;
        setPinAccX(acc);
        setAccXDisplay(accuracyToSliderPin1(acc));
        setSaveAsDefaults(false);
        return true;
      }
      return false;
    }
    if (field === 'accY') {
      const pct = parseFloat(raw);
      if (Number.isFinite(pct)) {
        const acc = pct / 100;
        setPinAccY(acc);
        setAccYDisplay(accuracyToSliderPin2(acc));
        setSaveAsDefaults(false);
        return true;
      }
      return false;
    }
    if (field === 'scoreX') {
      const score = parseFloat(raw);
      if (Number.isFinite(score)) {
        const clamped = Math.min(scoreCap, Math.max(0, score));
        setPinScoreX(clamped);
        setScoreXDisplay(scoreToSlider(clamped, baseScore, scoreCap));
        setSaveAsDefaults(false);
        return true;
      }
      return false;
    }
    if (field === 'scoreY') {
      const score = parseFloat(raw);
      if (Number.isFinite(score)) {
        const clamped = Math.min(scoreCap, Math.max(0, score));
        setPinScoreY(clamped);
        setScoreYDisplay(scoreToSlider(clamped, baseScore, scoreCap));
        setSaveAsDefaults(false);
        return true;
      }
    }
    return false;
  };

  const handlePinInputBlur = (field) => {
    setPinInputFocused(field, false);
    if (!commitPinInputDraft(field)) {
      setPinInputDrafts((prev) => ({
        ...prev,
        [field]: resolvedPinInputDisplay(field),
      }));
    }
  };

  const handlePinInputKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setPinInputFocused(field, false);
      setPinInputDrafts((prev) => ({
        ...prev,
        [field]: resolvedPinInputDisplay(field),
      }));
      e.currentTarget.blur();
    }
  };

  const handleReset = () => {
    lastValidCurveRef.current = { ...XACC_CURVE_DEFAULTS };
    const capData = {
      baseScore,
      ppBaseScore: level?.ppBaseScore ?? 0,
      diffId: level?.diffId,
      difficulty: level?.difficulty ?? difficultyDict?.[level?.diffId],
      xaccCurve: XACC_CURVE_DEFAULTS,
    };
    const resetCap = resolvePurePerfectScoreV2(capData, difficultyDict, tilecount);
    const def = defaultPinSliderValues(level, baseScore, resetCap, {
      levelData: capData,
      difficultyDict,
      tilecount,
    });
    setAccXDisplay(def.accXDisplay);
    setScoreXDisplay(def.scoreXDisplay);
    setAccYDisplay(def.accYDisplay);
    setScoreYDisplay(def.scoreYDisplay);
    setPinScoreX(def.scoreX);
    setPinScoreY(def.scoreY);
    setPinAccX(def.accX);
    setPinAccY(def.accY);
    setPinInputMode('accuracy');
    setPin1Judgements({ ...EMPTY_JUDGEMENT_FORM });
    setPin2Judgements({ ...EMPTY_JUDGEMENT_FORM });
    setPin1SourcePassId(null);
    setPin2SourcePassId(null);
    setDisablePP(false);
    setStoredPinMisses({
      hitTiles: tilecount,
      missesX: 0,
      missesY: 0,
    });
    setChangeBaseline(
      buildXaccEditorBaseline(
        {
          accX: def.accX,
          accY: def.accY,
          scoreX: def.scoreX,
          scoreY: def.scoreY,
        },
        {
          pinInputMode: 'accuracy',
          disablePP: false,
          pin1Judgements: { ...EMPTY_JUDGEMENT_FORM },
          pin2Judgements: { ...EMPTY_JUDGEMENT_FORM },
          pin1SourcePassId: null,
          pin2SourcePassId: null,
        },
      ),
    );
    setSaveAsDefaults(true);
    setError(null);
    pinInputFocusRef.current.clear();
    setPinInputDrafts(
      pinInputDraftsFromPins(
        pinValuesFromSliders(
          def.accXDisplay,
          def.scoreXDisplay,
          def.accYDisplay,
          def.scoreYDisplay,
          baseScore,
          resetCap,
          {
            accX: def.accX,
            accY: def.accY,
            scoreX: def.scoreX,
            scoreY: def.scoreY,
          },
        ),
      ),
    );
  };

  /** Commit pending text inputs; keep full-precision acc from state / judgements. */
  const resolveCommittedPinsForSave = () => {
    let nextPinAccX = pinAccX;
    let nextPinAccY = pinAccY;
    if (pinInputMode === 'accuracy') {
      nextPinAccX = resolveAccuracyPctForSave(
        pinInputDrafts.accX,
        pinAccX,
      );
      nextPinAccY = resolveAccuracyPctForSave(
        pinInputDrafts.accY,
        pinAccY,
      );
    }

    let nextPinScoreX = pinScoreX;
    let nextPinScoreY = pinScoreY;
    const scoreX = parseFloat(pinInputDrafts.scoreX);
    if (Number.isFinite(scoreX)) {
      nextPinScoreX = Math.min(scoreCapForFit, Math.max(0, scoreX));
    }
    const scoreY = parseFloat(pinInputDrafts.scoreY);
    if (Number.isFinite(scoreY)) {
      nextPinScoreY = Math.min(scoreCapForFit, Math.max(0, scoreY));
    }

    return {
      accX: nextPinAccX,
      accY: nextPinAccY,
      scoreX: nextPinScoreX,
      scoreY: nextPinScoreY,
      accXDisplay: accuracyToSliderPin1(nextPinAccX),
      scoreXDisplay: scoreToSlider(nextPinScoreX, baseScore, scoreCapForFit),
      accYDisplay: accuracyToSliderPin2(nextPinAccY),
      scoreYDisplay: scoreToSlider(nextPinScoreY, baseScore, scoreCapForFit),
    };
  };

  const applyCommittedPinState = (committed) => {
    setAccXDisplay(committed.accXDisplay);
    setScoreXDisplay(committed.scoreXDisplay);
    setAccYDisplay(committed.accYDisplay);
    setScoreYDisplay(committed.scoreYDisplay);
    setPinScoreX(committed.scoreX);
    setPinScoreY(committed.scoreY);
    setPinAccX(committed.accX);
    setPinAccY(committed.accY);
    setPinInputDrafts(
      pinInputDraftsFromPins({
        accX: committed.accX,
        accY: committed.accY,
        scoreX: committed.scoreX,
        scoreY: committed.scoreY,
      }),
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    pinInputFocusRef.current.clear();

    const committed = resolveCommittedPinsForSave();
    const saveOverrides = {
      accX: committed.accX,
      accY: committed.accY,
      scoreX: committed.scoreX,
      scoreY: committed.scoreY,
      ppBaseScore: level?.ppBaseScore ?? 0,
      ...pinMissContext,
    };

    const committedSnapshot = buildXaccEditorBaseline(
      {
        accX: committed.accX,
        accY: committed.accY,
        scoreX: committed.scoreX,
        scoreY: committed.scoreY,
      },
      {
        pinInputMode,
        disablePP,
        pin1Judgements,
        pin2Judgements,
        pin1SourcePassId,
        pin2SourcePassId,
      },
    );

    if (
      !saveAsDefaults &&
      xaccEditorBaselineMatches(committedSnapshot, changeBaseline)
    ) {
      onClose();
      return;
    }

    const saveFit = pinSlidersToXaccCurve(
      committed.accXDisplay,
      committed.scoreXDisplay,
      committed.accYDisplay,
      committed.scoreYDisplay,
      baseScore,
      scoreCapForFit,
      saveOverrides,
      lastValidCurveRef.current,
      fitContext,
    );

    if (!saveAsDefaults && !saveFit.ok) {
      const msg =
        saveFit.error || t('levelPopups.edit.xaccCurve.errors.fit');
      setError(msg);
      applyCommittedPinState(committed);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = saveAsDefaults
        ? { xaccCurveMeta: null }
        : {
            xaccCurveMeta: {
              poleOffset: saveFit.derivedE,
              topMultiplier: saveFit.derivedG,
              editor: serializeXaccCurveEditorState({
                pinInputMode,
                disablePP,
                accXDisplay,
                scoreXDisplay,
                accYDisplay,
                scoreYDisplay,
                pin1Judgements,
                pin2Judgements,
                pin1SourcePassId,
                pin2SourcePassId,
              }),
              pins: {
                accX: committed.accX,
                accY: committed.accY,
                scoreX: committed.scoreX,
                scoreY: committed.scoreY,
                multX: saveFit.multX,
                multY: saveFit.multY,
                missesX: pinMissContext.missesX,
                missesY: pinMissContext.missesY,
                hitTiles: pinMissContext.hitTiles,
                scoresAreXaccMultipliers: true,
              },
            },
          };
      const res = await api.patch(
        `${import.meta.env.VITE_LEVELS}/${level.id}/xacc-curve`,
        payload,
      );
      const updated = res.data?.level;
      if (updated && onSaved) {
        onSaved({
          xaccCurveMeta: updated.xaccCurveMeta ?? null,
        });
      }
      setChangeBaseline(committedSnapshot);
      toast.success(t('levelPopups.edit.xaccCurve.toastSaved'));
      onClose();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error || t('levelPopups.edit.xaccCurve.errors.save');
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const anchorScore = useMemo(() => {
    const atCutoff = scoreV2AtAccuracy(
      XACC_CURVE_DEFAULTS.cutoff,
      graphLevelData,
      difficultyDict,
      tilecount,
    );
    return Number.isFinite(atCutoff) ? atCutoff : baseScore;
  }, [graphLevelData, difficultyDict, tilecount, baseScore]);

  const pinMarkers = useMemo(() => {
    const pins = resolvedPins;
    const cutoff = XACC_CURVE_DEFAULTS.cutoff;
    return [
      {
        id: 'anchor',
        accuracyPct: cutoff * 100,
        score: anchorScore,
        variant: 'anchor',
        misses: 0,
      },
      {
        id: 'pin1',
        accuracyPct: pins.accX * 100,
        score: pins.scoreX,
        variant: 'pin1',
        misses: pinMissContext.missesX,
      },
      {
        id: 'pin2',
        accuracyPct: pins.accY * 100,
        score: pins.scoreY,
        variant: 'pin2',
        misses: pinMissContext.missesY,
      },
    ];
  }, [resolvedPins, anchorScore, pinMissContext]);

  const pinMissSliceOverlays = useMemo(() => {
    const { hitTiles, missesX, missesY } = pinMissContext;
    const seenMissCounts = new Set();
    const overlays = [];
    const addSlice = (misses, variant, id) => {
      const m = Math.max(0, Math.floor(Number(misses)) || 0);
      if (m <= 0 || seenMissCounts.has(m)) {
        return;
      }
      seenMissCounts.add(m);
      overlays.push({ id, misses: m, variant, hitTiles });
    };
    addSlice(missesX, 'pin1', 'pin1-miss-slice');
    addSlice(missesY, 'pin2', 'pin2-miss-slice');
    return overlays;
  }, [pinMissContext]);

  const content = (
    <div className="admin-level-xacc-curve-popup">
      <div
        ref={panelRef}
        className="admin-level-xacc-curve-popup__panel"
        role="dialog"
        aria-labelledby="admin-xacc-curve-title"
      >
        <div className="admin-level-xacc-curve-popup__header">
          <h2 id="admin-xacc-curve-title">
            {t('levelPopups.edit.xaccCurve.title')}
          </h2>
          <CloseButton
            variant="inline"
            onClick={(e) => {
              e.stopPropagation();
              requestClose();
            }}
            aria-label={t('levelPopups.edit.close')}
          />
        </div>
        <p className="admin-level-xacc-curve-popup__hint">
          {t('levelPopups.edit.xaccCurve.hint')}
        </p>
        <p className="admin-level-xacc-curve-popup__hint admin-level-xacc-curve-popup__hint--constraint">
          {t('levelPopups.edit.xaccCurve.constraintHint', {
            defaultValue:
              'If pins cannot be fit exactly, the last E/G curve is kept and pins may appear off the plotted line.',
          })}
        </p>
        {baseScoreHint ? (
          <p className="admin-level-xacc-curve-popup__hint admin-level-xacc-curve-popup__hint--warn">
            {t('levelPopups.edit.xaccCurve.baseScoreFallback', {
              base: formatScore(baseScore),
            })}
          </p>
        ) : null}
        {tilecountHint ? (
          <p className="admin-level-xacc-curve-popup__hint admin-level-xacc-curve-popup__hint--warn">
            {t('levelPopups.edit.xaccCurve.tilecountFallback')}
          </p>
        ) : null}
        <form
          className="admin-level-xacc-curve-popup__form"
          onSubmit={handleSave}
        >
          <div className="admin-level-xacc-curve-popup__mode-row">
            <span className="admin-level-xacc-curve-popup__pin-heading">
              {t('levelPopups.edit.xaccCurve.inputMode.heading')}
            </span>
            <div
              className="admin-level-xacc-curve-popup__mode-tabs"
              role="tablist"
              aria-label={t('levelPopups.edit.xaccCurve.inputMode.heading')}
            >
              {[
                { id: 'accuracy', label: t('levelPopups.edit.xaccCurve.inputMode.accuracy') },
                { id: 'judgements', label: t('levelPopups.edit.xaccCurve.inputMode.judgements') },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={pinInputMode === id}
                  className={
                    pinInputMode === id
                      ? 'admin-level-xacc-curve-popup__mode-tab admin-level-xacc-curve-popup__mode-tab--active'
                      : 'admin-level-xacc-curve-popup__mode-tab'
                  }
                  onClick={() => handlePinInputModeChange(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="admin-level-xacc-curve-popup__pin-grid">
            <div className="admin-level-xacc-curve-popup__pin-group">
              <div className="admin-level-xacc-curve-popup__pin-group-header">
                <span className="admin-level-xacc-curve-popup__pin-heading">
                  {t('levelPopups.edit.xaccCurve.labels.pin1')}
                </span>
                <XaccPinPassPicker
                  passes={levelPassesByScore}
                  loading={passesLoading}
                  open={openPassPickerPin === 1}
                  onToggle={() => togglePassPicker(1)}
                  onSelectPass={(pass) => applyPassToPin(pass, 1)}
                  ariaLabel={t('levelPopups.edit.xaccCurve.inputMode.loadFromPassPin1')}
                  loadingLabel={t('levelPopups.edit.xaccCurve.inputMode.passLoading')}
                  emptyLabel={t('levelPopups.edit.xaccCurve.inputMode.passEmpty')}
                />
              </div>
              {!showJudgementInputs ? (
                <div className="admin-level-xacc-curve-popup__slider-row">
                  <label htmlFor="xacc-pin1-acc-slider">
                    {t('levelPopups.edit.xaccCurve.labels.pinAccuracy')}
                  </label>
                  <input
                    id="xacc-pin1-acc-slider"
                    type="range"
                    min={1}
                    max={accXMax}
                    value={Math.min(accXDisplay, accXMax)}
                    onChange={(e) => handleAccXChange(e.target.value)}
                  />
                  <span className="admin-level-xacc-curve-popup__slider-meta">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="admin-level-xacc-curve-popup__pin-input"
                      value={pinInputDrafts.accX}
                      onChange={(e) => handlePinInputDraftChange('accX', e.target.value)}
                      onFocus={() => setPinInputFocused('accX', true)}
                      onBlur={() => handlePinInputBlur('accX')}
                      onKeyDown={(e) => handlePinInputKeyDown(e, 'accX')}
                      aria-label={t('levelPopups.edit.xaccCurve.labels.pinAccuracy')}
                    />
                    <span className="admin-level-xacc-curve-popup__pin-input-suffix">%</span>
                  </span>
                </div>
              ) : (
                <XaccPinJudgementInputs
                  form={pin1Judgements}
                  onChange={(key, value) => handleJudgementChange(1, key, value)}
                  computedAccuracyLabel={computedAccuracyLabel}
                />
              )}
              <div className="admin-level-xacc-curve-popup__slider-row">
                <label htmlFor="xacc-pin1-score-slider">
                  {t('levelPopups.edit.xaccCurve.labels.pinScore')}
                </label>
                <input
                  id="xacc-pin1-score-slider"
                  type="range"
                  min={1}
                  max={100}
                  value={scoreXDisplay}
                  onChange={(e) => handleScoreXChange(e.target.value)}
                />
                <span className="admin-level-xacc-curve-popup__slider-meta">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="admin-level-xacc-curve-popup__pin-input"
                    value={pinInputDrafts.scoreX}
                    onChange={(e) => handlePinInputDraftChange('scoreX', e.target.value)}
                    onFocus={() => setPinInputFocused('scoreX', true)}
                    onBlur={() => handlePinInputBlur('scoreX')}
                    onKeyDown={(e) => handlePinInputKeyDown(e, 'scoreX')}
                    aria-label={t('levelPopups.edit.xaccCurve.labels.pinScore')}
                  />
                </span>
              </div>
            </div>
            <div className="admin-level-xacc-curve-popup__pin-group">
              <div className="admin-level-xacc-curve-popup__pin-group-header">
                <span className="admin-level-xacc-curve-popup__pin-heading">
                  {t('levelPopups.edit.xaccCurve.labels.pin2')}
                </span>
                <XaccPinPassPicker
                  passes={levelPassesByScore}
                  loading={passesLoading}
                  open={openPassPickerPin === 2}
                  onToggle={() => togglePassPicker(2)}
                  onSelectPass={(pass) => applyPassToPin(pass, 2)}
                  ariaLabel={t('levelPopups.edit.xaccCurve.inputMode.loadFromPassPin2')}
                  loadingLabel={t('levelPopups.edit.xaccCurve.inputMode.passLoading')}
                  emptyLabel={t('levelPopups.edit.xaccCurve.inputMode.passEmpty')}
                />
              </div>
              {!showJudgementInputs ? (
                <div className="admin-level-xacc-curve-popup__slider-row">
                  <label htmlFor="xacc-pin2-acc-slider">
                    {t('levelPopups.edit.xaccCurve.labels.pinAccuracy')}
                  </label>
                  <input
                    id="xacc-pin2-acc-slider"
                    type="range"
                    min={accYMin}
                    max={100}
                    value={Math.max(accYDisplay, accYMin)}
                    onChange={(e) => handleAccYChange(e.target.value)}
                  />
                  <span className="admin-level-xacc-curve-popup__slider-meta">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="admin-level-xacc-curve-popup__pin-input"
                      value={pinInputDrafts.accY}
                      onChange={(e) => handlePinInputDraftChange('accY', e.target.value)}
                      onFocus={() => setPinInputFocused('accY', true)}
                      onBlur={() => handlePinInputBlur('accY')}
                      onKeyDown={(e) => handlePinInputKeyDown(e, 'accY')}
                      aria-label={t('levelPopups.edit.xaccCurve.labels.pinAccuracy')}
                    />
                    <span className="admin-level-xacc-curve-popup__pin-input-suffix">%</span>
                  </span>
                </div>
              ) : (
                <XaccPinJudgementInputs
                  form={pin2Judgements}
                  onChange={(key, value) => handleJudgementChange(2, key, value)}
                  computedAccuracyLabel={computedAccuracyLabel}
                />
              )}
              <div className="admin-level-xacc-curve-popup__slider-row">
                <label htmlFor="xacc-pin2-score-slider">
                  {t('levelPopups.edit.xaccCurve.labels.pinScore')}
                </label>
                <input
                  id="xacc-pin2-score-slider"
                  type="range"
                  min={1}
                  max={100}
                  value={scoreYDisplay}
                  onChange={(e) => handleScoreYChange(e.target.value)}
                />
                <span className="admin-level-xacc-curve-popup__slider-meta">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="admin-level-xacc-curve-popup__pin-input"
                    value={pinInputDrafts.scoreY}
                    onChange={(e) => handlePinInputDraftChange('scoreY', e.target.value)}
                    onFocus={() => setPinInputFocused('scoreY', true)}
                    onBlur={() => handlePinInputBlur('scoreY')}
                    onKeyDown={(e) => handlePinInputKeyDown(e, 'scoreY')}
                    aria-label={t('levelPopups.edit.xaccCurve.labels.pinScore')}
                  />
                </span>
              </div>
            </div>
          </div>
          <div className="admin-level-xacc-curve-popup__derived">
            <span className="admin-level-xacc-curve-popup__derived-value">
              {t('levelPopups.edit.xaccCurve.labels.pole')}: E ={' '}
              <code>{formatPoleOffset(derivedE)}</code>
            </span>
            <span className="admin-level-xacc-curve-popup__derived-value">
              {t('levelPopups.edit.xaccCurve.labels.top')}: G ={' '}
              <code>{formatTopMultiplier(derivedG)}</code>
            </span>
          </div>
          {!fitOk && fitError && useLiveFitCurve ? (
            <div className="admin-level-xacc-curve-popup__error admin-level-xacc-curve-popup__error--fit">
              {t('levelPopups.edit.xaccCurve.fitWarning', {
                error: fitError,
                defaultValue:
                  'Pins do not lie on a single hyperbola with the last E/G: {{error}}. Markers show your values; adjust pins or scores to fit.',
              })}
            </div>
          ) : null}
          <button
            type="button"
            className="admin-level-xacc-curve-popup__btn admin-level-xacc-curve-popup__btn--secondary btn-fill-neutral-muted"
            onClick={handleReset}
            disabled={saving}
          >
            {t('levelPopups.edit.xaccCurve.resetDefaults')}
          </button>
          <div className="admin-level-xacc-curve-popup__graph">
            <div className="admin-level-xacc-curve-popup__graph-toolbar">
              {pinMissSliceOverlays.length > 0 ? (
                <p className="admin-level-xacc-curve-popup__hint admin-level-xacc-curve-popup__hint--graph">
                  {t('levelPopups.edit.xaccCurve.missSliceHint', {
                    defaultValue:
                      'Dashed lines are score curves at each pin’s miss count; solid line is zero misses.',
                  })}
                </p>
              ) : null}
              <label className="admin-level-xacc-curve-popup__pp-toggle">
                <input
                  type="checkbox"
                  checked={disablePP}
                  onChange={(e) => setDisablePP(e.target.checked)}
                />
                <span>
                  {t('levelDetail.scoreGraph.disablePP', {
                    ns: 'pages',
                    defaultValue: 'Disable PP',
                  })}
                </span>
              </label>
            </div>
            <ScoreV2Graph
              tilecount={tilecount}
              levelData={graphLevelData}
              difficultyDict={difficultyDict}
              xaccCurve={draftCurve}
              disablePP={disablePP}
              adminXaccEditor
              pinMarkers={pinMarkers}
              missSliceOverlays={pinMissSliceOverlays}
              yAxisMax={graphPurePerfectCap}
              pinMarkersUseExactScores
            />
          </div>
          {error ? (
            <div className="admin-level-xacc-curve-popup__error">{error}</div>
          ) : null}
          <div className="admin-level-xacc-curve-popup__actions">
            <button
              type="button"
              className="admin-level-xacc-curve-popup__btn admin-level-xacc-curve-popup__btn--secondary btn-fill-neutral-muted"
              onClick={requestClose}
              disabled={saving}
            >
              {t('levelPopups.edit.xaccCurve.cancel')}
            </button>
            <button
              type="submit"
              className="admin-level-xacc-curve-popup__btn admin-level-xacc-curve-popup__btn--primary btn-fill-primary"
              disabled={saving || !hasChanges || (!saveAsDefaults && !fitOk)}
            >
              {saving
                ? t('levelPopups.edit.xaccCurve.saving')
                : t('levelPopups.edit.xaccCurve.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, getPortalRoot());
};
