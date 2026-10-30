import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { canApplyAutoRank, hasFlag, permissionFlags } from '@/utils/UserPermissions';

export function RatingFlowMarks({ rating }) {
  const { t } = useTranslation('components');
  const manualFlow = rating?.flow === 2 || rating?.flow === 3;
  const indicators = rating?.indicators || {};
  const block = manualFlow ? null : rating?.autoRankBlock;
  const marks = [];
  if (!manualFlow && rating?.showRankable) {
    marks.push({ key: 'rankable', label: t('rating.ratingCard.marks.rankable') });
  }
  if (!manualFlow && rating?.showRatingOff) {
    marks.push({ key: 'rating-off', label: t('rating.ratingCard.marks.ratingOff') });
  }
  if (!manualFlow && indicators.judgementLimit) {
    marks.push({ key: 'judgement', label: t('rating.ratingCard.marks.judgementLimit') });
  }
  if (!manualFlow && indicators.keyLimit) {
    marks.push({ key: 'key', label: t('rating.ratingCard.marks.keyLimit') });
  }

  if (marks.length === 0 && !block) return null;

  return (
    <div className="rating-flow-marks">
      {marks.map((mark) => (
        <span key={mark.key} className={`rating-flow-mark rating-flow-mark--${mark.key}`}>
          {mark.label}
        </span>
      ))}
      {block && (
        <span className="rating-flow-block">
          <span>{t('rating.ratingCard.marks.blockedBy')}</span>
          <span className="rating-flow-block__who">
            {block.avatarUrl && (
              <img src={block.avatarUrl} alt="" className="rating-flow-block__avatar" />
            )}
            <span className="rating-flow-block__name">
              {block.nickname || block.username}
              {block.reason && `: ${block.reason}`}
            </span>
          </span>
        </span>
      )}
    </div>
  );
}

export function RatingFlowActions({ rating, user, onChange, only = null }) {
  const { t } = useTranslation('components');
  const [busy, setBusy] = useState('');
  if (!rating?.id || rating.confirmedAt) return null;
  if (rating.flow === 2 || rating.flow === 3) return null;

  const canSettle = Boolean(
    canApplyAutoRank(user) && rating.settleActor === 'rater' && rating.suggestedDiffName,
  );
  const canBlock = Boolean(canApplyAutoRank(user) && !rating.autoRankBlock);
  const canUnblock = Boolean(hasFlag(user, permissionFlags.SUPER_ADMIN) && rating.autoRankBlock);
  const showSettle = only !== 'block' && canSettle;
  const showBlock = only === 'block' && canBlock;
  const showUnblock = only === 'block' && canUnblock;
  if (!showSettle && !showBlock && !showUnblock) return null;

  const run = async (action, body) => {
    setBusy(action);
    try {
      const response = await api.post(`${routes.admin.rating()}/${rating.id}/${action}`, body);
      toast.success(t(`rating.ratingCard.messages.${action}Success`));
      if (response.data?.complete && onChange) onChange(response.data.complete);
    } catch (error) {
      toast.error(
        error.response?.data?.error
          || t(`rating.ratingCard.messages.${action}Failed`),
      );
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="rating-flow-actions">
      {showSettle && (
        <button
          type="button"
          className="rating-flow-btn rating-flow-btn--settle"
          disabled={Boolean(busy)}
          onClick={() => run('settle')}
        >
          {t('rating.ratingCard.buttons.settle', { difficulty: rating.suggestedDiffName })}
        </button>
      )}
      {showBlock && (
        <button
          type="button"
          className="rating-flow-btn rating-flow-btn--block"
          disabled={Boolean(busy)}
          onClick={() => {
            const reason = window.prompt(t('rating.ratingCard.prompts.blockReason'));
            if (reason == null) return;
            run('block', { reason });
          }}
        >
          {t('rating.ratingCard.buttons.block')}
        </button>
      )}
      {showUnblock && (
        <button
          type="button"
          className="rating-flow-btn rating-flow-btn--unblock"
          disabled={Boolean(busy)}
          onClick={() => run('unblock')}
        >
          {t('rating.ratingCard.buttons.unblock')}
        </button>
      )}
    </div>
  );
}
