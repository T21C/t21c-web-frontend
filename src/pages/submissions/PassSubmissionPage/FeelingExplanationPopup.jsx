// tuf-search: #FeelingExplanationPopup #passSubmission #feelingExplanation
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { PopupShell } from '@/components/common/PopupShell';
import { reratingComparisonFromRefs } from '@/components/requests/levelRequestShared';
import { collectLevelReferenceIds, getLevelReferences, peekLevelReferences } from '@/utils/levelReferences';

const FEELING_EXPLANATION_MAX = 1000;

function comparisonIdsFromExplanation(text, levelId) {
  const currentId = Number(levelId);
  return collectLevelReferenceIds(text).filter((id) => id !== currentId);
}

export function FeelingExplanationPopup({
  levelId,
  submitting,
  onClose,
  onSubmit,
}) {
  const { t } = useTranslation(['pages', 'common']);
  const [explanation, setExplanation] = useState('');
  const [step, setStep] = useState('write');
  const [reratingComparison, setReratingComparison] = useState(null);

  const comparisonIds = useMemo(
    () => comparisonIdsFromExplanation(explanation, levelId),
    [explanation, levelId],
  );

  useEffect(() => {
    if (comparisonIds.length === 0) {
      setReratingComparison(null);
      return undefined;
    }
    const apply = (map) => {
      setReratingComparison(reratingComparisonFromRefs(comparisonIds, map));
    };
    const cached = peekLevelReferences(comparisonIds);
    if (cached) {
      apply(cached);
      return undefined;
    }
    let cancelled = false;
    getLevelReferences(comparisonIds).then((map) => {
      if (!cancelled) apply(map);
    });
    return () => {
      cancelled = true;
    };
  }, [comparisonIds]);

  const close = () => {
    if (submitting) return;
    onClose();
  };

  const skip = () => {
    if (submitting) return;
    if (!window.confirm(t('passSubmission.feelingExplanation.skipConfirm'))) return;
    onSubmit(null);
  };

  const submitExplanation = async () => {
    if (submitting) return;
    const trimmed = explanation.trim();
    if (comparisonIds.length > 0) {
      const map = await getLevelReferences(comparisonIds);
      const rerating = reratingComparisonFromRefs(comparisonIds, map);
      if (rerating) {
        setReratingComparison(rerating);
        toast.error(t('levelRequests.errors.comparison_rerating', { label: rerating.label }));
        return;
      }
      await onSubmit(trimmed);
      return;
    }
    setStep('suggest');
  };

  return (
    <PopupShell
      onClose={close}
      overlayClassName="feeling-explanation-modal-overlay"
      panelClassName="feeling-explanation-modal"
      ariaLabelledBy="feeling-explanation-title"
      closeDisabled={submitting}
    >
      {step === 'suggest' ? (
        <>
          <h2 id="feeling-explanation-title">{t('passSubmission.feelingExplanation.suggestTitle')}</h2>
          <p className="feeling-explanation-modal-body">
            {t('passSubmission.feelingExplanation.suggestBody')}
          </p>
          <div className="feeling-explanation-modal-actions">
            <button
              type="button"
              className="feeling-explanation-add-ref-btn btn-fill-secondary"
              onClick={() => setStep('write')}
              disabled={submitting}
            >
              {t('passSubmission.feelingExplanation.addReference')}
            </button>
            <button
              type="button"
              className="feeling-explanation-submit-anyway-btn btn-fill-primary alt"
              onClick={() => onSubmit(explanation.trim() || null)}
              disabled={submitting}
            >
              {t('passSubmission.feelingExplanation.submitAnyway')}
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 id="feeling-explanation-title">{t('passSubmission.feelingExplanation.title')}</h2>
          <p className="feeling-explanation-modal-body">
            {t('passSubmission.feelingExplanation.body')}
          </p>
          <label className="feeling-explanation-modal-field">
            <textarea
              value={explanation}
              maxLength={FEELING_EXPLANATION_MAX}
              onChange={(event) => setExplanation(event.target.value)}
              placeholder={t('passSubmission.feelingExplanation.placeholder')}
              disabled={submitting}
            />
          </label>
          {reratingComparison && (
            <p className="feeling-explanation-modal-issue">
              {t('levelRequests.errors.comparison_rerating', { label: reratingComparison.label })}
            </p>
          )}
          <div className="feeling-explanation-modal-actions">
            <button
              type="button"
              className="feeling-explanation-skip-btn btn-fill-secondary"
              onClick={skip}
              disabled={submitting}
            >
              {t('passSubmission.feelingExplanation.skip')}
            </button>
            <button
              type="button"
              className="feeling-explanation-submit-btn btn-fill-primary alt"
              onClick={submitExplanation}
              disabled={submitting || Boolean(reratingComparison)}
            >
              {t('passSubmission.feelingExplanation.submitExplanation')}
            </button>
          </div>
        </>
      )}
    </PopupShell>
  );
}
