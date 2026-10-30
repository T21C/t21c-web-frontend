import { routes } from '@/api/routes';
// tuf-search: #PassSubmissionPage #passSubmissionPage #submissions #passSubmission

import './passsubmission.css';
import { submitPass } from '@/utils/submissions/passSubmission';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, isUserBanned, permissionFlags } from '@/utils/UserPermissions';
import { Trans, useTranslation } from 'react-i18next';
import api from '@/utils/api';
import { StagingModeWarning, MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import RulePopup from './RulePopup';
import { PopupShell } from '@/components/common/PopupShell';
import { difficultyRequiresPassKeyCount, ICON_SIZE, normalizeKeyCount, selectIconSize, truncateString } from '@/utils/Utility';
import toast from 'react-hot-toast';
import { usePassCoreForm } from '@/components/common/cores/PassCoreForm/usePassCoreForm';
import { getSubmissionErrorMessage } from '@/utils/submissions/formErrors';
import { resolveSubmissionVideoUrl } from '@/utils/resolveVideoUrl';
import {
  getEffectiveTilecount,
  getPassJudgementHitCountFromForm,
  getTilecountMismatchI18nSuffix,
  isIncludedMidspinOnLatestVersion,
  isTilecountJudgementMismatch,
} from '@/utils/passJudgementHitCount';
import { previewPassFormHitCount } from '@/utils/ParseJudgements';
import { ADOFAI_VERSION, canUseXPerfectMode, isAdofaiV2FromVersion, parseAdofaiVersion } from '@/utils/adofaiVersion';
import { PASS_SUBMISSION_INITIAL_FORM } from './passSubmissionInitialForm';
import { getPassSubmissionTagWarnings } from './passSubmissionTagWarnings';
import { PassSubmissionCore } from './PassSubmissionCore';
import { CalculatorIcon } from '@/components/common/icons';
import CommunityTagVotePopup from '@/pages/common/Level/LevelDetailPage/CommunityTagVotePopup';
import { CLIENT_PREF_KEYS } from '@/utils/clientPreferences';
import { useClientPreference } from '@/hooks/useClientPreference';
import { collectDomFieldPatch } from '@/hooks/useDomFieldSync';
import { normalizeLevelSearchQuery } from '@/utils/normalizeEntitySearchQuery';

const PassSubmissionPage = () => {
  const { t } = useTranslation(['pages', 'common']);
  const location = useLocation();
  const navigate = useNavigate();
  const { difficultyDict } = useDifficultyContext();
  const { user } = useAuth();

  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('passSubmission.title'),
        description: t('submission.meta.description'),
        pathname: location.pathname,
        noindex: true,
      }),
    [t, location.pathname],
  );

  useEffect(() => {
    if (
      hasFlag(user, permissionFlags.SUBMISSIONS_PAUSED) ||
      isUserBanned(user) ||
      !hasFlag(user, permissionFlags.EMAIL_VERIFIED)
    ) {
      navigate('/submission');
    }
  }, [user, navigate]);

  const [formStateKey, setFormStateKey] = useState(0);
  const [submission, setSubmission] = useState(false);
  const [searchInput, setSearchInput] = useState(() => location.state?.searchInput || '');
  const [hasReadPassRules, setHasReadRules] = useClientPreference(
    CLIENT_PREF_KEYS.SUBMISSIONS_PASS_RULES_READ,
    false,
  );
  const [showRulesPopup, setShowRulesPopup] = useState(false);
  const [showTilecountMismatchModal, setShowTilecountMismatchModal] = useState(false);
  const [tilecountMismatchKind, setTilecountMismatchKind] = useState('generic');
  const [showTagWarningsModal, setShowTagWarningsModal] = useState(false);
  const [votePopupLevelId, setVotePopupLevelId] = useState(null);

  const extraValidation = useCallback(
    ({ form: nextForm }) => ({
      playerId: Boolean(nextForm.playerId),
      rulesAccepted: hasReadPassRules,
    }),
    [hasReadPassRules],
  );

  const {
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
    level,
    setLevel,
    levelLoading,
    videoDetail,
    videoLinkResolving,
    accuracy,
    score,
    handleInputChange,
    handleAdofaiVersionChange,
    validateForm,
  } = usePassCoreForm({
    mode: 'submit',
    initialForm: { ...PASS_SUBMISSION_INITIAL_FORM, ...(location.state?.form || {}) },
    rejectDeletedLevel: true,
    isUDiffLevel: (lvl) =>
      difficultyDict[lvl?.diffId]?.name?.[0] === 'U' ||
      difficultyDict[lvl?.diffId]?.name?.[0] === 'Q',
    isKeyCountRequiredLevel: (lvl) =>
      difficultyRequiresPassKeyCount(difficultyDict[lvl?.diffId]?.name),
    extraValidation,
    scoreOverrides: null,
    allowSandboxScore: false,
  });

  const tagWarnings = useMemo(
    () => getPassSubmissionTagWarnings(level?.tags),
    [level?.tags],
  );
  const formDomRef = useRef(null);
  const formValueRef = useRef(form);
  formValueRef.current = form;

  const commitDomFields = () => {
    const comparable = { ...formValueRef.current, levelId: searchInput };
    const patch = collectDomFieldPatch(formDomRef.current, comparable);
    if (!patch) return formValueRef.current;

    const next = { ...formValueRef.current, ...patch };
    if (typeof patch.levelId === 'string') {
      const normalized = normalizeLevelSearchQuery(patch.levelId);
      next.levelId = normalized;
      setSearchInput(normalized);
    }
    formValueRef.current = next;
    setForm(next);
    return next;
  };

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

  const performSubmit = async () => {
    const current = formValueRef.current;
    setSubmission(true);

    try {
      const { url: cleanedVideoUrl } = await resolveSubmissionVideoUrl(current.videoLink);

      const payload = {
        levelId: current.levelId,
        videoLink: cleanedVideoUrl,
        title: videoDetail?.title || '',
        rawTime: videoDetail?.timestamp || undefined,
        passer: current.leaderboardName || '',
        passerId: current.playerId || null,
        passerRequest: false,
        speed: current.speed,
        feelingDifficulty: current.feelingRating,
        expectedDifficulty: current.expectedRating?.trim() || null,
        details: current.details || '',
        keyCount: normalizeKeyCount(current.keyCount),
        earlyDouble: parseInt(current.tooEarly) || 0,
        earlySingle: parseInt(current.early) || 0,
        ePerfect: parseInt(current.ePerfect) || 0,
        perfectMinus: parseInt(current.perfectMinus) || 0,
        perfect: parseInt(current.perfect) || 0,
        perfectPlus: parseInt(current.perfectPlus) || 0,
        lPerfect: parseInt(current.lPerfect) || 0,
        lateSingle: parseInt(current.late) || 0,
        lateDouble: 0,
        isNoHoldTap: current.isNoHold,
        isAdofaiV2: isAdofaiV2FromVersion(parseAdofaiVersion(current.adofaiVersion, ADOFAI_VERSION.V3_4_0)),
        adofaiVersion: parseAdofaiVersion(current.adofaiVersion, ADOFAI_VERSION.V3_4_0),
        isXPerfectMode:
          !!current.isXPerfectMode
          && canUseXPerfectMode(parseAdofaiVersion(current.adofaiVersion, ADOFAI_VERSION.V3_4_0)),
      };

      const submittedLevelId = current.levelId;
      await submitPass(payload);
      toast.success(t('passSubmission.alert.success'));
      setFormStateKey((prevKey) => prevKey + 1);
      setForm(PASS_SUBMISSION_INITIAL_FORM);
      setSearchInput('');
      if (submittedLevelId) {
        setVotePopupLevelId(submittedLevelId);
      }
    } catch (err) {
      console.error('Submission error:', err);
      const errMsg = getSubmissionErrorMessage(err);
      toast.error(`${t('passSubmission.alert.error')} ${truncateString(errMsg, 120)}`);
    } finally {
      setSubmission(false);
      setSubmitAttempt(false);
    }
  };

  const proceedAfterTagWarnings = async () => {
    const current = formValueRef.current;
    const rawHitSum = getPassJudgementHitCountFromForm(current);
    if (
      isIncludedMidspinOnLatestVersion({
        adofaiVersion: parseAdofaiVersion(current.adofaiVersion, ADOFAI_VERSION.V3_4_0),
        levelTilecount: level?.tilecount,
        autoTileCount: level?.autoTileCount,
        midspinCount: level?.midspinCount,
        hitCount: rawHitSum,
        perfect: current.perfect,
      })
    ) {
      setTilecountMismatchKind('wrongVersion');
      setShowTilecountMismatchModal(true);
      return;
    }
    const hitSum = previewPassFormHitCount(current, level);
    if (isTilecountJudgementMismatch(level?.tilecount, hitSum, level?.autoTileCount, level?.midspinCount)) {
      setTilecountMismatchKind('generic');
      setShowTilecountMismatchModal(true);
      return;
    }
    await performSubmit();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      console.error('No user logged in');
      toast.error(t('passSubmission.alert.login'));
      return;
    }

    commitDomFields();
    const validity = validateForm(formValueRef.current) || {};
    const validityEntries = Object.entries(validity);
    const invalidKeys = validityEntries.filter(([, ok]) => !ok).map(([k]) => k);

    if (invalidKeys.length > 0) {
      setSubmitAttempt(true);

      const labelForKey = (k) => {
        const fallback = {
          levelId: 'Level ID',
          videoLink: 'Video link',
          player: 'Player',
          speed: 'Speed',
          feelingRating: 'Feeling difficulty',
          expectedRating: 'Expected difficulty',
          keyCount: 'Key count',
          ePerfect: 'EPerfect',
          perfectMinus: 'Perfect−',
          perfect: 'Perfect',
          perfectPlus: 'Perfect+',
          lPerfect: 'LPerfect',
          tooEarly: 'Too Early',
          early: 'Early',
          late: 'Late',
          rulesAccepted: 'Rules accepted',
        };
        return t(`passSubmission.fieldShort.${k}`, { defaultValue: fallback[k] || k });
      };

      const shownCount = 3;
      const invalidFieldsText = invalidKeys.map(labelForKey).slice(0, shownCount).join(', ');
      const remainingCount = invalidKeys.length - shownCount;
      const moreText =
        remainingCount > 0
          ? ` ${t('passSubmission.alert.more', { count: remainingCount })}`
          : '';
      toast.error(`${t('passSubmission.alert.form')}: ${invalidFieldsText}${moreText}`);
      return;
    }

    if (tagWarnings.length > 0) {
      setShowTagWarningsModal(true);
      return;
    }

    await proceedAfterTagWarnings();
  };

  return (
    <div className="pass-submission-page">
      <MetaTags {...pageMeta} />
      <div className="form-container">
        {import.meta.env.MODE !== 'production' && <StagingModeWarning />}
        <div className="pass-submission-page__form-shell">
          <button
            type="button"
            className="pass-submission-page__calculator-link"
            onClick={() =>
              navigate('/submission/pass/calculator', {
                state: {
                  form,
                  searchInput,
                  overrides: location.state?.overrides,
                  targetScore: location.state?.targetScore,
                  compareForm: location.state?.compareForm,
                },
              })
            }
            aria-label={t('passSubmission.calculator.openCalculator')}
            title={t('passSubmission.calculator.openCalculator')}
          >
            <CalculatorIcon size="22px" color="currentColor" />
          </button>
          <PassSubmissionCore
          mode="submit"
          formKey={formStateKey}
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
          handleAdofaiVersionChange={handleAdofaiVersionChange}
          difficultyDict={difficultyDict}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          formDomRef={formDomRef}
          renderBelowJudgements={() => (
            <div className="rules-checkbox-container">
              <div className="rules-checkbox">
                <input
                  type="checkbox"
                  id="rules-checkbox"
                  checked={hasReadPassRules}
                  onChange={(e) => setHasReadRules(e.target.checked)}
                  style={{
                    outline: submitAttempt && !isFormValid.rulesAccepted ? '2px solid red' : 'none',
                  }}
                />
                <label htmlFor="rules-checkbox">
                  {t('passSubmission.rules.checkbox')}{' '}
                  <button
                    type="button"
                    className="rules-link"
                    onClick={() => setShowRulesPopup(true)}
                  >
                    {t('passSubmission.rules.rulesLink')}
                  </button>
                </label>
              </div>
            </div>
          )}
          renderSubmitActions={() => (
            <button
              className="submit btn-fill-primary alt"
              onClick={handleSubmit}
              disabled={submission}
            >
              {submission
                ? t('loading.submitting', { ns: 'common' })
                : t('buttons.submit', { ns: 'common' })}
            </button>
          )}
        />
        </div>
      </div>

      {votePopupLevelId ? (
        <CommunityTagVotePopup
          levelId={votePopupLevelId}
          user={user}
          afterPassSubmit
          onClose={() => setVotePopupLevelId(null)}
        />
      ) : null}

      {showRulesPopup && <RulePopup setShowRulesPopup={setShowRulesPopup} />}

      {showTagWarningsModal && tagWarnings.length > 0 && (
        <PopupShell
          onClose={() => setShowTagWarningsModal(false)}
          overlayClassName="tag-warnings-modal-overlay"
          panelClassName="tag-warnings-modal"
          ariaLabelledBy="tag-warnings-title"
        >
            <h2 id="tag-warnings-title">{t('passSubmission.tagWarnings.title')}</h2>
            <ul className="tag-warnings-modal-list">
              {tagWarnings.map((warning) => (
                <li key={warning.tagName} className="tag-warnings-modal-item">
                  <span
                    className="tag-warnings-modal-icon"
                    data-letter-only={!warning.icon}
                    style={warning.color ? { '--tag-bg-color': warning.color } : undefined}
                  >
                    {warning.icon ? (
                      <img src={selectIconSize(warning.icon, ICON_SIZE.SMALL)} alt="" />
                    ) : (
                      <span className="tag-warnings-modal-letter">
                        {warning.tagName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="tag-warnings-modal-text">
                    {t(warning.i18nKey, warning.values)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="tag-warnings-modal-actions">
              <button
                type="button"
                className="tag-warnings-review-btn btn-fill-secondary"
                onClick={() => setShowTagWarningsModal(false)}
              >
                {t('buttons.cancel', { ns: 'common' })}
              </button>
              <button
                type="button"
                className="tag-warnings-continue-btn btn-fill-primary alt"
                onClick={async () => {
                  setShowTagWarningsModal(false);
                  await proceedAfterTagWarnings();
                }}
                disabled={submission}
              >
                {t('passSubmission.tagWarnings.continue')}
              </button>
            </div>
        </PopupShell>
      )}

      {showTilecountMismatchModal && (
        <PopupShell
          onClose={() => setShowTilecountMismatchModal(false)}
          overlayClassName="tilecount-mismatch-modal-overlay"
          panelClassName="tilecount-mismatch-modal"
          ariaLabelledBy="tilecount-mismatch-title"
        >
            <h2 id="tilecount-mismatch-title">
              {t(
                tilecountMismatchKind === 'wrongVersion'
                  ? 'passSubmission.tilecountMismatch.wrongVersion.title'
                  : 'passSubmission.tilecountMismatch.title',
              )}
            </h2>
            <p className="tilecount-mismatch-modal-body">
              {tilecountMismatchKind === 'wrongVersion' ? (
                <Trans
                  i18nKey="passSubmission.tilecountMismatch.wrongVersion.body"
                  ns="pages"
                  values={{
                    hitSum: getPassJudgementHitCountFromForm(form),
                    tilecount: getEffectiveTilecount(level?.tilecount, level?.autoTileCount, level?.midspinCount),
                    midspins: Math.floor(Number(level?.midspinCount) || 0),
                  }}
                  components={{
                    b: <b />,
                  }}
                />
              ) : (
                <Trans
                  i18nKey={`passSubmission.tilecountMismatch.body${getTilecountMismatchI18nSuffix(level?.autoTileCount, level?.midspinCount)}`}
                  ns="pages"
                  values={{
                    tilecount: getEffectiveTilecount(level?.tilecount, level?.autoTileCount, level?.midspinCount),
                    rawTilecount: level?.tilecount,
                    autoTileCount: level?.autoTileCount ?? 0,
                    midspinCount: level?.midspinCount ?? 0,
                    hitSum: previewPassFormHitCount(form, level),
                  }}
                  components={{ b: <b /> }}
                />
              )}
            </p>
            <div className="tilecount-mismatch-modal-actions">
              <button
                type="button"
                className="tilecount-mismatch-review-btn btn-fill-secondary"
                onClick={() => setShowTilecountMismatchModal(false)}
              >
                {t('passSubmission.tilecountMismatch.reviewInputs')}
              </button>
              <button
                type="button"
                className="tilecount-mismatch-submit-anyway-btn btn-fill-danger alt"
                onClick={async () => {
                  setShowTilecountMismatchModal(false);
                  await performSubmit();
                }}
                disabled={submission}
              >
                {t('passSubmission.tilecountMismatch.submitAnyway')}
              </button>
            </div>
        </PopupShell>
      )}
    </div>
  );
};

export default PassSubmissionPage;
