import { routes } from '@/api/routes';
// tuf-search: #usePassCoreForm #cores #passCoreForm
import { useEffect, useMemo, useRef, useState } from "react";
import api from "@/utils/api";
import { useVideoLinkResolver } from "@/components/common/cores/VideoLinkResolver";
import calcAcc from "@/utils/CalcAcc";
import { formatAccuracyRatio } from "@/utils/statFormatters";
import { computePassScoreV2 } from "@/utils/scoreService";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { parseJudgements, judgementsAreComplete, previewPassFormScoring } from "@/utils/ParseJudgements";
import { ADOFAI_VERSION, parseAdofaiVersion, canUseXPerfectMode, isAdofaiV2FromVersion } from "@/utils/adofaiVersion";
import { normalizeKeyCount, validateFeelingRating, validateNumber, validateSpeed } from "@/utils/Utility";
import { useTranslation } from "react-i18next";
import { getPassCoreCopy } from "./PassCoreForm";

const BASE_REQUIRED_FIELDS = [
  "levelId",
  "videoLink",
  "feelingRating",
  "ePerfect",
  "perfect",
  "lPerfect",
  "tooEarly",
  "early",
  "late",
];

const JUDGEMENT_FIELDS = ["ePerfect", "perfect", "lPerfect", "tooEarly", "early", "late"];
const XPERFECT_FIELDS = ["perfectMinus", "perfectPlus"];
const CALCULATOR_REQUIRED_JUDGEMENTS = JUDGEMENT_FIELDS;

export function usePassCoreForm({
  mode,
  initialForm,
  rejectDeletedLevel = false,
  isUDiffLevel = () => false,
  isKeyCountRequiredLevel = () => false,
  extraValidation = () => ({}),
  /** Optional scoring overrides for calculator live Acc/Score (never persisted). */
  scoreOverrides = null,
  /** When true (calculator sandbox), allow scoring without a loaded level. */
  allowSandboxScore = false,
}) {
  const copy = getPassCoreCopy(mode);
  const { t } = useTranslation([copy.ns, "common"]);
  const { difficultyDict } = useDifficultyContext();
  const isCalculator = mode === "calculator";

  const [form, setForm] = useState(initialForm);
  const [accuracy, setAccuracy] = useState(null);
  const [score, setScore] = useState("");

  const [submitAttempt, setSubmitAttempt] = useState(false);

  const [isValidFeelingRating, setIsValidFeelingRating] = useState(true);
  const [isValidExpectedRating, setIsValidExpectedRating] = useState(true);
  const [isValidKeyCount, setIsValidKeyCount] = useState(true);
  const [isValidSpeed, setIsValidSpeed] = useState(true);
  const [isValidTimestamp, setIsValidTimestamp] = useState(true);

  const [isFormValid, setIsFormValid] = useState(false);
  const [isFormValidDisplay, setIsFormValidDisplay] = useState({});

  const [level, setLevel] = useState(null);
  const [levelLoading, setLevelLoading] = useState(true);
  const [videoDetail, setVideoDetail] = useState(null);

  const { resolving: videoLinkResolving } = useVideoLinkResolver({
    value: isCalculator ? "" : form.videoLink,
    onResolve: (url) => setForm((prev) => ({ ...prev, videoLink: url })),
    onVideoDetail: (details) => {
      setVideoDetail(details || null);
    },
    toastMessage: t(copy.videoLinkResolved, {
      ns: copy.ns,
      defaultValue: "Short link resolved to Bilibili URL",
    }),
  });

  const isUDiff = useMemo(() => Boolean(level && isUDiffLevel(level)), [level, isUDiffLevel]);
  const keyCountRequired = useMemo(
    () => Boolean(level && isKeyCountRequiredLevel(level)),
    [level, isKeyCountRequiredLevel],
  );

  const levelFetchCancelTokenRef = useRef(null);
  const scoreOverridesRef = useRef(scoreOverrides);
  scoreOverridesRef.current = scoreOverrides;

  useEffect(() => {
    const levelId = form?.levelId ?? "";

    if (!/^\d+$/.test(levelId)) {
      setLevelLoading(false);
      setLevel(null);
      return;
    }

    if (!levelId) {
      setLevelLoading(false);
      setLevel(null);
      return;
    }

    setLevelLoading(true);
    setLevel(null);

    if (levelFetchCancelTokenRef.current) {
      levelFetchCancelTokenRef.current.cancel("New level fetch initiated");
    }
    levelFetchCancelTokenRef.current = api.CancelToken.source();

    api
      .get(`${routes.database.levels.root()}/${levelId}`, { cancelToken: levelFetchCancelTokenRef.current.token })
      .then((response) => {
        const chosenLevel = response?.data?.level ?? response?.data?.data?.level ?? null;

        if (rejectDeletedLevel && chosenLevel?.isDeleted) {
          setLevel(null);
          setLevelLoading(false);
          return;
        }

        setLevel(chosenLevel);
        setLevelLoading(false);
      })
      .catch((error) => {
        if (!api.isCancel(error)) {
          setLevel(null);
          setLevelLoading(false);
        }
      });

    return () => {
      if (levelFetchCancelTokenRef.current) {
        levelFetchCancelTokenRef.current.cancel("Component unmounted or levelId changed");
      }
    };
  }, [form.levelId, rejectDeletedLevel]);

  const updateAccuracyAndScore = (nextForm, nextLevel) => {
    const lvl = nextLevel ?? level;
    const parsed = parseJudgements(nextForm);
    const requireXPerfect = !!nextForm.isXPerfectMode
      && canUseXPerfectMode(parseAdofaiVersion(nextForm.adofaiVersion, ADOFAI_VERSION.V3_4_0));
    const complete = judgementsAreComplete(parsed, { requireXPerfectFields: requireXPerfect });
    const preview = previewPassFormScoring(nextForm, lvl);
    const scoringJudgements = preview.judgements;
    const overrides = scoreOverridesRef.current || {};

    if (complete) {
      setAccuracy(formatAccuracyRatio(calcAcc(scoringJudgements)));
    } else {
      setAccuracy(null);
    }

    const passData = {
      speed: nextForm.speed,
      judgements: scoringJudgements,
      isNoHoldTap: nextForm.isNoHold,
    };

    const hasSandboxBase =
      allowSandboxScore &&
      (Number(overrides.baseScore) > 0 ||
        Number(overrides.ppBaseScore) > 0 ||
        Number(overrides.difficultyBaseScore) > 0);

    if (!nextForm.levelId && !hasSandboxBase) {
      setScore(t(copy.scoreNeedId, { ns: copy.ns }));
    } else if (!complete) {
      setScore(t(copy.scoreNeedJudg, { ns: copy.ns }));
    } else if (!Object.values(passData).every((value) => value !== null)) {
      setScore(t(copy.scoreNeedInfo, { ns: copy.ns }));
    } else if (passData && (lvl || hasSandboxBase)) {
      const sandboxBase = Number(overrides.baseScore) || Number(overrides.difficultyBaseScore) || 0;
      const levelForScore = lvl || {
        baseScore: sandboxBase || null,
        ppBaseScore: null,
        difficulty: { baseScore: sandboxBase },
        xaccCurveMeta: null,
      };
      const scoreCtxOverrides = {
        ...(overrides.baseScore != null && overrides.baseScore !== ""
          ? { baseScore: Number(overrides.baseScore) }
          : overrides.difficultyBaseScore !== undefined && overrides.difficultyBaseScore !== ""
            ? { baseScore: Number(overrides.difficultyBaseScore) }
            : {}),
        ...(overrides.ppBaseScore !== undefined && overrides.ppBaseScore !== ""
          ? { ppBaseScore: Number(overrides.ppBaseScore) }
          : {}),
        ...(overrides.xaccCurveMeta ? { xaccCurveMeta: overrides.xaccCurveMeta } : {}),
      };
      setScore(
        computePassScoreV2(passData, levelForScore, scoreCtxOverrides, difficultyDict).scoreV2.toFixed(2),
      );
    } else {
      setScore(t(copy.scoreNoInfo, { ns: copy.ns }));
    }
  };

  useEffect(() => {
    if (level || allowSandboxScore) updateAccuracyAndScore(form, level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, scoreOverrides, allowSandboxScore]);

  useEffect(() => {
    if (level || allowSandboxScore) updateAccuracyAndScore(form, level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficultyDict]);

  const validate = (nextForm) => {
    const validationResult = {};
    const displayValidationRes = {};
    const isEdit = mode === "edit";
    const isCalc = mode === "calculator";

    const keyCountTrimmed = nextForm.keyCount?.trim?.() ?? "";
    const keyCountParsed =
      keyCountTrimmed !== "" && validateNumber(keyCountTrimmed) && normalizeKeyCount(keyCountTrimmed) !== null;

    if (isEdit || isCalc) {
      const keyCountValid =
        keyCountTrimmed === "" ||
        (validateNumber(keyCountTrimmed) && normalizeKeyCount(keyCountTrimmed) !== null);
      setIsValidKeyCount(keyCountValid);

      if (isCalc) {
        for (const field of CALCULATOR_REQUIRED_JUDGEMENTS) {
          validationResult[field] =
            nextForm[field]?.trim?.() !== "" && validateNumber(nextForm[field]);
        }
        const calcXPerfect = !!nextForm.isXPerfectMode
          && canUseXPerfectMode(parseAdofaiVersion(nextForm.adofaiVersion, ADOFAI_VERSION.V3_4_0));
        if (calcXPerfect) {
          for (const field of XPERFECT_FIELDS) {
            validationResult[field] =
              nextForm[field]?.trim?.() !== "" && validateNumber(nextForm[field]);
          }
        } else {
          for (const field of XPERFECT_FIELDS) {
            validationResult[field] = true;
          }
        }
        const speedTrimmed = nextForm.speed?.trim?.() ?? "";
        const speedValid = speedTrimmed === "" || validateSpeed(nextForm.speed);
        validationResult.speed = speedValid;
        setIsValidSpeed(speedValid);
        validationResult.levelId = true;
        validationResult.videoLink = true;
        validationResult.feelingRating = true;
        validationResult.expectedRating = true;
        validationResult.keyCount = true;
        setIsValidFeelingRating(true);
        setIsValidExpectedRating(true);
        setIsValidTimestamp(true);
      } else {
        validationResult.levelId = !(level === null || level === undefined);
        validationResult.videoLink = true;
        validationResult.feelingRating = true;
        validationResult.expectedRating = true;
        validationResult.keyCount = keyCountValid;
        validationResult.speed = true;
        validationResult.vidUploadTime = true;

        for (const field of JUDGEMENT_FIELDS) {
          validationResult[field] = true;
        }
        for (const field of XPERFECT_FIELDS) {
          validationResult[field] = true;
        }

        const frTrimmed = nextForm.feelingRating?.trim?.() ?? "";
        const erTrimmed = nextForm.expectedRating?.trim?.() ?? "";
        const speedTrimmed = nextForm.speed?.trim?.() ?? "";
        setIsValidFeelingRating(!frTrimmed || validateFeelingRating(nextForm.feelingRating));
        setIsValidExpectedRating(!erTrimmed || validateFeelingRating(nextForm.expectedRating));
        setIsValidSpeed(!speedTrimmed || validateSpeed(nextForm.speed));
        setIsValidTimestamp(true);
      }
    } else {
      for (const field of BASE_REQUIRED_FIELDS) {
        if (JUDGEMENT_FIELDS.includes(field)) {
          validationResult[field] = nextForm[field]?.trim?.() !== "" && validateNumber(nextForm[field]);
        } else {
          validationResult[field] = nextForm[field]?.trim?.() !== "";
        }
      }

      const submitXPerfect = !!nextForm.isXPerfectMode
        && canUseXPerfectMode(parseAdofaiVersion(nextForm.adofaiVersion, ADOFAI_VERSION.V3_4_0));
      if (submitXPerfect) {
        for (const field of XPERFECT_FIELDS) {
          validationResult[field] =
            nextForm[field]?.trim?.() !== "" && validateNumber(nextForm[field]);
        }
      } else {
        for (const field of XPERFECT_FIELDS) {
          validationResult[field] = true;
        }
      }

      validationResult.levelId = !(level === null || level === undefined);
      validationResult.videoLink = Boolean(videoDetail);
      if (keyCountRequired) {
        validationResult.keyCount = keyCountParsed;
        setIsValidKeyCount(keyCountParsed);
      } else {
        validationResult.keyCount =
          keyCountTrimmed === "" ||
          (validateNumber(keyCountTrimmed) && normalizeKeyCount(keyCountTrimmed) !== null);
        setIsValidKeyCount(keyCountTrimmed === "" || keyCountParsed);
      }

      const frValid = validateFeelingRating(nextForm.feelingRating);
      const erTrimmed = nextForm.expectedRating?.trim?.() ?? "";
      const erFormatOk = !erTrimmed || validateFeelingRating(nextForm.expectedRating);
      const speedValid = validateSpeed(nextForm.speed);
      setIsValidFeelingRating(frValid);
      setIsValidExpectedRating(erFormatOk);
      validationResult.expectedRating = true;
      validationResult.speed = speedValid;
      setIsValidTimestamp(true);
    }

    const extras = extraValidation({ form: nextForm, level, videoDetail, isUDiff });
    Object.assign(validationResult, extras);

    for (const field in validationResult) {
      displayValidationRes[field] = submitAttempt ? validationResult[field] : true;
    }

    setIsFormValidDisplay(displayValidationRes);
    setIsFormValid(validationResult);
  };

  useEffect(() => {
    validate(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, level, videoDetail, submitAttempt, isUDiff, keyCountRequired, extraValidation]);

  const applyFormPatch = (patch) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      updateAccuracyAndScore(next);
      return next;
    });
  };

  const handleAdofaiVersionChange = (version) => {
    const adofaiVersion = parseAdofaiVersion(version, ADOFAI_VERSION.V3_4_0);
    const patch = {
      adofaiVersion,
      isAdofaiV2: isAdofaiV2FromVersion(adofaiVersion),
    };
    if (!canUseXPerfectMode(adofaiVersion)) {
      patch.isXPerfectMode = false;
      patch.perfectMinus = "";
      patch.perfectPlus = "";
    }
    applyFormPatch(patch);
  };

  const handleInputChange = (e) => {
    const { name, type, value, checked } = e.target;
    const inputValue = type === "checkbox" ? checked : value;

    setForm((prev) => {
      const next = { ...prev, [name]: inputValue };
      if (name === "isXPerfectMode" && !inputValue) {
        next.perfectMinus = "";
        next.perfectPlus = "";
      }
      updateAccuracyAndScore(next);
      return next;
    });
  };

  return {
    t,
    copy,
    form,
    setForm,
    submitAttempt,
    setSubmitAttempt,
    isFormValid,
    isFormValidDisplay,
    isValidFeelingRating,
    isValidExpectedRating,
    isValidKeyCount,
    isValidSpeed,
    isValidTimestamp,
    level,
    setLevel,
    levelLoading,
    videoDetail,
    videoLinkResolving,
    accuracy,
    score,
    isUDiff,
    handleInputChange,
    handleAdofaiVersionChange,
  };
};
