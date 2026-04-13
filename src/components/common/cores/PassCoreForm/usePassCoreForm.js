import { useEffect, useMemo, useRef, useState } from "react";
import api from "@/utils/api";
import { getVideoDetails } from "@/utils";
import calcAcc from "@/utils/CalcAcc";
import { getScoreV2 } from "@/utils/CalcScore";
import { parseJudgements } from "@/utils/ParseJudgements";
import { validateFeelingRating, validateNumber, validateSpeed } from "@/utils/Utility";
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

function validateIsoTimestamp(timestamp) {
  if (!timestamp || timestamp.trim() === "") return false;
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return isoRegex.test(timestamp.trim());
}

export function usePassCoreForm({
  mode,
  initialForm,
  rejectDeletedLevel = false,
  isUDiffLevel = () => false,
  requireKeyModeWhenUDiff = false,
  extraValidation = () => ({}),
}) {
  const copy = getPassCoreCopy(mode);
  const { t } = useTranslation([copy.ns, "common"]);

  const [form, setForm] = useState(initialForm);
  const [accuracy, setAccuracy] = useState(null);
  const [score, setScore] = useState("");

  const [submitAttempt, setSubmitAttempt] = useState(false);

  const [isValidFeelingRating, setIsValidFeelingRating] = useState(true);
  const [isValidSpeed, setIsValidSpeed] = useState(true);
  const [isValidTimestamp, setIsValidTimestamp] = useState(true);

  const [isFormValid, setIsFormValid] = useState(false);
  const [isFormValidDisplay, setIsFormValidDisplay] = useState({});

  const [level, setLevel] = useState(null);
  const [levelLoading, setLevelLoading] = useState(true);
  const [videoDetail, setVideoDetail] = useState(null);

  const isUDiff = useMemo(() => Boolean(level && isUDiffLevel(level)), [level, isUDiffLevel]);

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
      .get(`${import.meta.env.VITE_LEVELS}/${levelId}`, { cancelToken: levelFetchCancelTokenRef.current.token })
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
    const videoLink = form?.videoLink ?? "";
    if (!videoLink) {
      setVideoDetail(null);
      return;
    }

    let alive = true;
    getVideoDetails(videoLink)
      .then((details) => {
        if (!alive) return;
        setVideoDetail(details || null);
      })
      .catch(() => {
        if (!alive) return;
        setVideoDetail(null);
      });

    return () => {
      alive = false;
    };
  }, [form.videoLink]);

  const updateAccuracyAndScore = (nextForm, nextLevel) => {
    const lvl = nextLevel ?? level;
    const newJudgements = parseJudgements(nextForm);

    if (newJudgements.every(Number.isInteger)) {
      setAccuracy(`${(calcAcc(newJudgements) * 100).toString().slice(0, 7)}%`);
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
      setScore(getScoreV2(passData, lvl).toFixed(2));
    } else {
      setScore(t(copy.scoreNoInfo, { ns: copy.ns }));
    }
  };

  useEffect(() => {
    if (level) updateAccuracyAndScore(form, level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const validate = (nextForm) => {
    const validationResult = {};
    const displayValidationRes = {};

    for (const field of BASE_REQUIRED_FIELDS) {
      if (JUDGEMENT_FIELDS.includes(field)) {
        validationResult[field] = nextForm[field]?.trim?.() !== "" && validateNumber(nextForm[field]);
      } else {
        validationResult[field] = nextForm[field]?.trim?.() !== "";
      }
    }

    validationResult.levelId = !(level === null || level === undefined);
    validationResult.videoLink = Boolean(videoDetail);

    const frValid = validateFeelingRating(nextForm.feelingRating);
    const speedValid = validateSpeed(nextForm.speed);
    setIsValidFeelingRating(frValid);
    setIsValidSpeed(speedValid);
    validationResult.speed = speedValid;

    if (mode === "edit") {
      const timestampValid = validateIsoTimestamp(nextForm.vidUploadTime);
      setIsValidTimestamp(timestampValid);
      validationResult.vidUploadTime = timestampValid;
    } else {
      setIsValidTimestamp(true);
    }

    if (requireKeyModeWhenUDiff && isUDiff) {
      validationResult.keyMode = Boolean(nextForm.is12K || nextForm.is16K);
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
  }, [form, level, videoDetail, submitAttempt, isUDiff]);

  const handleInputChange = (e) => {
    const { name, type, value, checked } = e.target;
    const inputValue = type === "checkbox" ? checked : value;

    setForm((prev) => {
      const next = { ...prev, [name]: inputValue };

      if (name === "is16K" && inputValue) next.is12K = false;
      if (name === "is12K" && inputValue) next.is16K = false;

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
    isValidSpeed,
    isValidTimestamp,
    level,
    setLevel,
    levelLoading,
    videoDetail,
    accuracy,
    score,
    isUDiff,
    handleInputChange,
  };
}

