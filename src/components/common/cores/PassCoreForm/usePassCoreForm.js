import { routes } from '@/api/routes';
// tuf-search: #usePassCoreForm #cores #passCoreForm
import { useEffect, useMemo, useRef, useState } from "react";
import api from "@/utils/api";
import { getVideoDetails } from "@/utils";
import { resolveSubmissionVideoUrl } from "@/utils/resolveVideoUrl";
import { useDebouncedRequest } from "@/hooks/useDebouncedRequest";
import calcAcc from "@/utils/CalcAcc";
import { formatAccuracyRatio } from "@/utils/statFormatters";
import { computePassScoreV2 } from "@/utils/scoreService";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { parseJudgements } from "@/utils/ParseJudgements";
import { normalizeKeyCount, validateFeelingRating, validateNumber, validateSpeed } from "@/utils/Utility";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
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

// ADOFAI v3 release; uploads before this are ADOFAI v2 (last v2 day: 2026-04-30).
const ADOFAI_V3_RELEASE_UTC = Date.UTC(2026, 4, 1);

function isAdofaiV2EraVideoTimestamp(timestamp) {
  if (!timestamp) return false;
  const videoDate = new Date(timestamp);
  return !Number.isNaN(videoDate.getTime()) && videoDate.getTime() < ADOFAI_V3_RELEASE_UTC;
}

export function usePassCoreForm({
  mode,
  initialForm,
  rejectDeletedLevel = false,
  isUDiffLevel = () => false,
  isKeyCountRequiredLevel = () => false,
  extraValidation = () => ({}),
}) {
  const copy = getPassCoreCopy(mode);
  const { t } = useTranslation([copy.ns, "common"]);
  const { difficultyDict } = useDifficultyContext();

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
  const [videoLinkResolving, setVideoLinkResolving] = useState(false);

  const resolveVideoLinkRequest = useDebouncedRequest(500);

  const isUDiff = useMemo(() => Boolean(level && isUDiffLevel(level)), [level, isUDiffLevel]);
  const keyCountRequired = useMemo(
    () => Boolean(level && isKeyCountRequiredLevel(level)),
    [level, isKeyCountRequiredLevel],
  );

  const levelFetchCancelTokenRef = useRef(null);

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
        // Some endpoints return `{ level }`, older code used `{ data: { level } }`
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

  useEffect(() => {
    const videoLink = form?.videoLink?.trim?.() ?? "";
    if (!videoLink) {
      setVideoDetail(null);
      setVideoLinkResolving(false);
      if (mode === "submit") {
        setForm((prev) => (prev.isAdofaiV2 ? { ...prev, isAdofaiV2: false } : prev));
      }
      return;
    }

    setVideoLinkResolving(true);

    resolveVideoLinkRequest(({ signal }) =>
      resolveSubmissionVideoUrl(videoLink, { signal })
        .then(async ({ url: resolvedUrl, resolved }) => {
          if (resolved && resolvedUrl && resolvedUrl !== videoLink) {
            setForm((prev) => ({ ...prev, videoLink: resolvedUrl }));
            toast.success(t(copy.videoLinkResolved, { ns: copy.ns, defaultValue: "Short link resolved to Bilibili URL" }));
          }

          const details = await getVideoDetails(resolvedUrl);
          setVideoDetail(details || null);

          if (mode === "submit") {
            const isAdofaiV2 = isAdofaiV2EraVideoTimestamp(details?.timestamp);
            setForm((prev) => (prev.isAdofaiV2 === isAdofaiV2 ? prev : { ...prev, isAdofaiV2 }));
          }
        })
        .catch((error) => {
          if (api.isCancel(error)) return;
          setVideoDetail(null);
          if (mode === "submit") {
            setForm((prev) => (prev.isAdofaiV2 ? { ...prev, isAdofaiV2: false } : prev));
          }
        })
        .finally(() => {
          setVideoLinkResolving(false);
        }),
    );

    return () => {
      resolveVideoLinkRequest.cancel();
    };
  }, [form.videoLink, mode, copy, resolveVideoLinkRequest, t]);

  const updateAccuracyAndScore = (nextForm, nextLevel) => {
    const lvl = nextLevel ?? level;
    const newJudgements = parseJudgements(nextForm);

    if (newJudgements.every(Number.isInteger)) {
      setAccuracy(formatAccuracyRatio(calcAcc(newJudgements)));
    } else {
      setAccuracy(null);
    }

    const passData = {
      speed: nextForm.speed,
      judgements: newJudgements,
      isNoHoldTap: nextForm.isNoHold,
    };

    if (!nextForm.levelId) {
      setScore(t(copy.scoreNeedId, { ns: copy.ns }));
    } else if (!newJudgements.every(Number.isInteger)) {
      setScore(t(copy.scoreNeedJudg, { ns: copy.ns }));
    } else if (!Object.values(passData).every((value) => value !== null)) {
      setScore(t(copy.scoreNeedInfo, { ns: copy.ns }));
    } else if (passData && lvl) {
      setScore(computePassScoreV2(passData, lvl, {}, difficultyDict).scoreV2.toFixed(2));
    } else {
      setScore(t(copy.scoreNoInfo, { ns: copy.ns }));
    }
  };

  useEffect(() => {
    if (level) updateAccuracyAndScore(form, level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  useEffect(() => {
    if (level) updateAccuracyAndScore(form, level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficultyDict]);

  const validate = (nextForm) => {
    const validationResult = {};
    const displayValidationRes = {};
    const isEdit = mode === "edit";

    const keyCountTrimmed = nextForm.keyCount?.trim?.() ?? "";
    const keyCountParsed =
      keyCountTrimmed !== "" && validateNumber(keyCountTrimmed) && normalizeKeyCount(keyCountTrimmed) !== null;

    if (isEdit) {
      const keyCountValid =
        keyCountTrimmed === "" ||
        (validateNumber(keyCountTrimmed) && normalizeKeyCount(keyCountTrimmed) !== null);
      setIsValidKeyCount(keyCountValid);
      // Edit / admin pass updates: only require a valid level; allow empty or free-form text elsewhere
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

      const frTrimmed = nextForm.feelingRating?.trim?.() ?? "";
      const erTrimmed = nextForm.expectedRating?.trim?.() ?? "";
      const speedTrimmed = nextForm.speed?.trim?.() ?? "";
      setIsValidFeelingRating(!frTrimmed || validateFeelingRating(nextForm.feelingRating));
      setIsValidExpectedRating(!erTrimmed || validateFeelingRating(nextForm.expectedRating));
      setIsValidSpeed(!speedTrimmed || validateSpeed(nextForm.speed));
      setIsValidTimestamp(true);
    } else {
      for (const field of BASE_REQUIRED_FIELDS) {
        if (JUDGEMENT_FIELDS.includes(field)) {
          validationResult[field] = nextForm[field]?.trim?.() !== "" && validateNumber(nextForm[field]);
        } else {
          validationResult[field] = nextForm[field]?.trim?.() !== "";
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
      const erValid = !erTrimmed || validateFeelingRating(nextForm.expectedRating);
      const speedValid = validateSpeed(nextForm.speed);
      setIsValidFeelingRating(frValid);
      setIsValidExpectedRating(erValid);
      validationResult.expectedRating = erValid;
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
  }, [form, level, videoDetail, submitAttempt, isUDiff, keyCountRequired]);

  const handleInputChange = (e) => {
    const { name, type, value, checked } = e.target;
    const inputValue = type === "checkbox" ? checked : value;

    setForm((prev) => {
      const next = { ...prev, [name]: inputValue };
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
  };
};
