// tuf-search: #SubmissionPage #submissionPage #submissions
import "./submissionpage.css"

import { useNavigate, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next";
import { MetaTags } from "@/components/common/display";
import { buildStaticPageMeta } from '@/utils/meta';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { hasFlag, isUserBanned, permissionFlags } from "@/utils/UserPermissions";
import { hasAccountEmail } from "@/utils/accountEmail";
import { useSubmissionLabelWaypoints } from './useSubmissionLabelWaypoints';
import { useSubmissionMinimalMotion } from '@/hooks/useMinimalMotionPreference';
import { useDisableMascotsPreference } from '@/hooks/useDisableMascotsPreference';

import ameliaChar from "@/assets/submission/amelia.png";
import ameliaStars from "@/assets/submission/amelia_bgSTARS.png";
import ameliaTiles from "@/assets/submission/amelia_bgTILES.png";
import ameliaC2 from "@/assets/submission/amelia_C2.png";
import ameliaC2Glow from "@/assets/submission/amelia_C2_glow.png";
import ellieChar from "@/assets/submission/ellie.png";
import ellieStars from "@/assets/submission/ellie_bgSTARS.png";
import ellieCam from "@/assets/submission/ellie_bgCAM.png";
import keyboardBlack from "@/assets/submission/keyboardblack.png";
import magicShape from "@/assets/submission/magicshape.png";
import tile0 from "@/assets/submission/tile 0.png";
import tile90 from "@/assets/submission/tile 90.png";
import tile135 from "@/assets/submission/tile 135.png";
import tile180 from "@/assets/submission/tile 180.png";
import tileEnd from "@/assets/submission/tile end.png";
import { AdofaiIcon } from '@/components/common/icons';
import { CreatorIcon } from '@/components/common/icons/CreatorIcon';
import { SubmissionBinaryStar } from './SubmissionBinaryStar';

const LEVEL_TILES = [
  { src: tile0, key: '0' },
  { src: tile90, key: '90' },
  { src: tile135, key: '135' },
  { src: tile180, key: '180' },
  { src: tileEnd, key: 'end' },
  { src: tile0, key: '0b' },
  { src: tile90, key: '90b' },
  { src: tile135, key: '135b' },
  { src: tile180, key: '180b' },
];

const MOTION_EASE = 0.1;

const SubmissionPage = () => {
  const { t } = useTranslation('pages');
  const { user } = useAuth()
  const navigate = useNavigate();
  const location = useLocation();
  const stageRef = useRef(null);
  const hoverSideRef = useRef(null);
  const focusSideRef = useRef(null);
  const activeSideRef = useRef(null);
  const motionRef = useRef({ pass: 0, level: 0 });
  const [activeSide, setActiveSide] = useState(null);
  const minimalMotion = useSubmissionMinimalMotion();
  const [disableMascots] = useDisableMascotsPreference();

  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('submission.meta.title'),
        description: t('submission.meta.description'),
        pathname: location.pathname,
        image: '/submission-preview.jpg',
        type: t('submission.meta.type'),
        noindex: true,
      }),
    [t, location.pathname],
  );

  const syncActiveSide = () => {
    const next = hoverSideRef.current ?? focusSideRef.current;
    activeSideRef.current = next;
    setActiveSide(next);
  };

  const setHoverSide = (side) => {
    hoverSideRef.current = side;
    syncActiveSide();
  };

  const setFocusSide = (side) => {
    focusSideRef.current = side;
    syncActiveSide();
  };

  useEffect(() => {
    if (!user || hasFlag(user, permissionFlags.SUBMISSIONS_PAUSED) || isUserBanned(user) || !hasFlag(user, permissionFlags.EMAIL_VERIFIED)) {
      return undefined;
    }

    let rafId = 0;

    const tick = () => {
      const targets = {
        pass: activeSideRef.current === 'pass' ? 1 : 0,
        level: activeSideRef.current === 'level' ? 1 : 0,
      };

      for (const side of ['pass', 'level']) {
        const current = motionRef.current[side];
        const target = targets[side];
        const next = minimalMotion
          ? target
          : current + (target - current) * MOTION_EASE;
        const value = Math.abs(target - next) < 0.01 ? target : next;
        if (value !== current) {
          motionRef.current[side] = value;
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [user, minimalMotion]);

  const labelsEnabled = Boolean(
    user
    && !(hasFlag(user, permissionFlags.SUBMISSIONS_PAUSED) || isUserBanned(user))
    && hasFlag(user, permissionFlags.EMAIL_VERIFIED),
  );

  useSubmissionLabelWaypoints({
    enabled: labelsEnabled && !minimalMotion,
    stageRef,
    motionRef,
  });

  if (!user) {
    navigate('/login')
  }

  const handleSubmitLevelClick = () => {
    navigate('/submission/level');
  };

  const handleSubmitPassClick = () => {
    navigate('/submission/pass');
  };

  const noAccess = hasFlag(user, permissionFlags.SUBMISSIONS_PAUSED) || isUserBanned(user) || !hasFlag(user, permissionFlags.EMAIL_VERIFIED)
  const stageClassName = [
    'submission-stage',
    activeSide === 'pass' ? 'submission-stage--pass-active' : '',
    activeSide === 'level' ? 'submission-stage--level-active' : '',
  ].filter(Boolean).join(' ');

  const pageClassName = [
    'submission-page',
    minimalMotion ? 'submission-page--minimal-motion' : '',
    disableMascots ? 'submission-page--no-mascots' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={pageClassName}>
      <MetaTags {...pageMeta} />

      <div className={`submission-container${noAccess ? " banner-container" : ""}`}>
      {hasFlag(user, permissionFlags.SUBMISSIONS_PAUSED) ? (
        <div className="banner">
          <span className="banner-text">
            <span className="submissions-paused">{t('submission.banner.submissionSuspended')}</span>
            <br />
            <span className="contact">{t('submission.banner.contact')}</span>
          </span>
        </div>
      ) : isUserBanned(user) ? (
        <div className="banner">
          <span className="banner-text">
            <span className="banned">{t('submission.banner.banned')}</span>
            <br />
            <span className="contact">{t('submission.banner.contact')}</span>
          </span>
        </div>
      ) : !hasFlag(user, permissionFlags.EMAIL_VERIFIED) ? (
        <div className="email-not-verified banner">
          <span className="banner-text verify-email">
            {hasAccountEmail(user)
              ? t('submission.banner.emailVerification')
              : t('submission.banner.addEmail')}
          </span>
          <span className="verify-email">
            <button
              className="button btn-fill-primary"
              onClick={() =>
                navigate(hasAccountEmail(user) ? '/profile/verify-email' : '/settings/account')
              }
            >
              {hasAccountEmail(user)
                ? t('submission.banner.verifyEmail')
                : t('submission.banner.addEmailButton')}
            </button>
          </span>
        </div>
      ) : (
        <div className={stageClassName} ref={stageRef}>
          <SubmissionBinaryStar enabled={labelsEnabled && !minimalMotion} scale={4} />

          <div className="submission-glow submission-glow--pass" aria-hidden="true" />
          <div className="submission-glow submission-glow--level" aria-hidden="true" />

          <div className="submission-art submission-art--pass" aria-hidden="true">
            <img className="submission-art__layer submission-art__layer--bg submission-art__layer--stars" src={ellieStars} alt="" />
            <img className="submission-art__layer submission-art__layer--bg submission-art__layer--cam" src={ellieCam} alt="" />
            <img className="submission-art__layer submission-art__layer--char" src={ellieChar} alt="" />
          </div>
          <div className="submission-mascot-icon submission-mascot-icon--pass" aria-hidden="true">
            <AdofaiIcon color="var(--side-color)" size="100%" rotation={-20} />
          </div>

          <div className="submission-prop submission-prop--keyboard" aria-hidden="true">
            <div className="submission-prop__keyboard-float">
              <div className="submission-prop__keyboard-tilt">
                <img src={keyboardBlack} alt="" draggable={false} />
              </div>
            </div>
          </div>

          <div className="submission-art submission-art--level" aria-hidden="true">
            <img className="submission-art__layer submission-art__layer--bg submission-art__layer--tiles" src={ameliaTiles} alt="" />
            <img className="submission-art__layer submission-art__layer--bg submission-art__layer--stars" src={ameliaStars} alt="" />
            <img className="submission-art__layer submission-art__layer--char" src={ameliaChar} alt="" />
            <div className="submission-art__layer-group-c2">
              <img className="submission-art__layer submission-art__layer--c2" src={ameliaC2} alt="" />
              <img className="submission-art__layer submission-art__layer--c2-glow" src={ameliaC2Glow} alt="" />
            </div>
          </div>
          <div className="submission-mascot-icon submission-mascot-icon--level" aria-hidden="true">
            <CreatorIcon color="var(--side-color)" size="100%" />
          </div>

          <div className="submission-prop submission-prop--magic" aria-hidden="true">
            <img className="submission-prop__spin" src={magicShape} alt="" />
          </div>

          <div className="submission-prop submission-prop--tiles" aria-hidden="true">
            {LEVEL_TILES.map(({ src, key }) => (
              <div
                key={key}
                className={`submission-prop__tile submission-prop__tile--${key}`}
              >
                <div className="submission-prop__tile-float">
                  <img src={src} alt="" draggable={false} />
                </div>
              </div>
            ))}
          </div>

          <p className="submission-label submission-label--pass" aria-hidden="true">
            <span className="submission-label__motion">
              <span className="submission-label__line">
                <span className="submission-label__bob">
                  <span className="submission-label__spin">{t('submission.label.submit')}</span>
                </span>
              </span>
              <span className="submission-label__line">
                <span className="submission-label__bob">
                  <span className="submission-label__spin">{t('submission.label.pass')}</span>
                </span>
              </span>
            </span>
          </p>
          <p className="submission-label submission-label--level" aria-hidden="true">
            <span className="submission-label__motion">
              <span className="submission-label__line">
                <span className="submission-label__bob">
                  <span className="submission-label__spin">{t('submission.label.submit')}</span>
                </span>
              </span>
              <span className="submission-label__line">
                <span className="submission-label__bob">
                  <span className="submission-label__spin">{t('submission.label.level')}</span>
                </span>
              </span>
            </span>
          </p>

          <div className="submission-zones">
            <button
              type="button"
              className="submission-zone submission-zone--pass"
              onClick={handleSubmitPassClick}
              onMouseEnter={() => setHoverSide('pass')}
              onMouseLeave={() => setHoverSide(null)}
              onFocus={() => setFocusSide('pass')}
              onBlur={() => setFocusSide(null)}
              aria-label={t('submission.button.buttonPass')}
            />
            <div className="submission-zone submission-zone--dead" aria-hidden="true" />
            <button
              type="button"
              className="submission-zone submission-zone--level"
              onClick={handleSubmitLevelClick}
              onMouseEnter={() => setHoverSide('level')}
              onMouseLeave={() => setHoverSide(null)}
              onFocus={() => setFocusSide('level')}
              onBlur={() => setFocusSide(null)}
              aria-label={t('submission.button.buttonLevel')}
            />
          </div>
        </div>
      )}
      </div>
      {!noAccess && (
        <div className="submission-calculator-link-wrap">
          <button
            type="button"
            className="submission-calculator-link btn-fill-neutral-dark"
            onClick={() => navigate('/submission/pass/calculator')}
          >
            {t('passSubmission.calculator.hubLink')}
          </button>
        </div>
      )}
    </div>
  )
}

export default SubmissionPage
