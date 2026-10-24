import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GraphIcon } from '@/components/common/icons';
import { AdminLevelXaccCurvePopup } from '@/components/popups/Levels/EditLevelPopup/AdminLevelXaccCurvePopup';
import {
  curveEditorLevelFromRequest,
  formatRequestedScore,
  payloadHasRequestedCurve,
  payloadHasRerateScoreTargets,
} from './levelRequestShared';
import './levelRequests.css';

const LevelRequestScoreTargets = ({
  payload,
  level,
  compact = false,
  preview = true,
}) => {
  const { t } = useTranslation('pages');
  const [showCurve, setShowCurve] = useState(false);
  if (!payloadHasRerateScoreTargets(payload)) return null;
  const hasCurve = payloadHasRequestedCurve(payload);
  if (compact) {
    if (!hasCurve) return null;
    return <span>{t('levelRequests.detail.scoreCurve')}</span>;
  }
  const editorLevel = hasCurve ? curveEditorLevelFromRequest(level, payload) : null;
  const baseScore = formatRequestedScore(payload?.baseScore);
  const ppBaseScore = formatRequestedScore(payload?.ppBaseScore);
  return (
    <>
      <div className="level-requests__section level-requests__score-targets">
        {baseScore && (
          <div>
            <span>{t('levelRequests.detail.baseScore')}</span>
            <span>{baseScore}PP</span>
          </div>
        )}
        {ppBaseScore && (
          <div>
            <span>{t('levelRequests.detail.ppBaseScore')}</span>
            <span>{ppBaseScore}PP</span>
          </div>
        )}
        {hasCurve && (
          <button
            type="button"
            className="level-requests__button"
            onClick={() => setShowCurve(true)}
            disabled={!editorLevel}
          >
            <GraphIcon size="16px" />
            {t('levelRequests.detail.scoreCurveOpen')}
          </button>
        )}
      </div>
      {showCurve && editorLevel && (
        <AdminLevelXaccCurvePopup
          level={editorLevel}
          sandbox
          preview={preview}
          title={t('levelRequests.detail.scoreCurveTitle')}
          hint={t('levelRequests.detail.scoreCurveHint')}
          onClose={() => setShowCurve(false)}
        />
      )}
    </>
  );
};

export default LevelRequestScoreTargets;
