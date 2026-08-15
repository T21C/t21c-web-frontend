// tuf-search: #RankedImpactPanel #passScoreCalculator
import { useTranslation } from 'react-i18next';

export function RankedImpactPanel({ result }) {
  const { t } = useTranslation('pages');
  if (!result?.rankedImpact) {
    return (
      <div className="psc-panel psc-panel--ranked">
        <h3>{t('passSubmission.calculator.panels.ranked')}</h3>
        <p className="psc-muted">{t('passSubmission.calculator.ranked.needPlayer')}</p>
      </div>
    );
  }

  const r = result.rankedImpact;
  return (
    <div className="psc-panel psc-panel--ranked">
      <h3>{t('passSubmission.calculator.panels.ranked')}</h3>
      <div className="psc-primary-grid">
        <div className="psc-stat">
          <span className="psc-stat__label">{t('passSubmission.calculator.ranked.before')}</span>
          <span className="psc-stat__value">{r.beforeRanked.toFixed(2)}</span>
        </div>
        <div className="psc-stat">
          <span className="psc-stat__label">{t('passSubmission.calculator.ranked.after')}</span>
          <span className="psc-stat__value">{r.afterRanked.toFixed(2)}</span>
        </div>
        <div className="psc-stat">
          <span className="psc-stat__label">{t('passSubmission.calculator.ranked.delta')}</span>
          <span className="psc-stat__value">
            {r.delta >= 0 ? '+' : ''}
            {r.delta.toFixed(2)}
          </span>
        </div>
        <div className="psc-stat">
          <span className="psc-stat__label">{t('passSubmission.calculator.ranked.generalDelta')}</span>
          <span className="psc-stat__value">+{r.generalDelta.toFixed(2)}</span>
        </div>
        <div className="psc-stat">
          <span className="psc-stat__label">{t('passSubmission.calculator.ranked.ppDelta')}</span>
          <span className="psc-stat__value">+{(r.ppDelta || 0).toFixed(2)}</span>
        </div>
        {r.slotIndex != null && (
          <div className="psc-stat">
            <span className="psc-stat__label">{t('passSubmission.calculator.ranked.slot')}</span>
            <span className="psc-stat__value">#{r.slotIndex}</span>
          </div>
        )}
      </div>
    </div>
  );
}
