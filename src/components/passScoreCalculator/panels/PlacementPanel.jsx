// tuf-search: #PlacementPanel #passScoreCalculator
import { useTranslation } from 'react-i18next';

export function PlacementPanel({ result }) {
  const { t } = useTranslation('pages');

  if (result?.customScoring) {
    return (
      <div className="psc-panel psc-panel--placement">
        <h3>{t('passSubmission.calculator.panels.placement')}</h3>
        <p className="psc-muted">{t('passSubmission.calculator.placement.customScoring')}</p>
      </div>
    );
  }

  if (!result?.placement) {
    return (
      <div className="psc-panel psc-panel--placement">
        <h3>{t('passSubmission.calculator.panels.placement')}</h3>
        <p className="psc-muted">{t('passSubmission.calculator.placement.needLevel')}</p>
      </div>
    );
  }

  const { rank, total, tied } = result.placement;
  return (
    <div className="psc-panel psc-panel--placement">
      <h3>{t('passSubmission.calculator.panels.placement')}</h3>
      <div className="psc-stat">
        <span className="psc-stat__value psc-stat__value--lg">
          {t('passSubmission.calculator.placement.rankOf', { rank, total })}
        </span>
      </div>
      {tied > 0 && (
        <p className="psc-muted">{t('passSubmission.calculator.placement.tied', { count: tied })}</p>
      )}
    </div>
  );
}
