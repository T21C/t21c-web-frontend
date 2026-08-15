// tuf-search: #ComparePanel #passScoreCalculator
import { useTranslation } from 'react-i18next';

export function ComparePanel({ result }) {
  const { t } = useTranslation('pages');
  if (!result?.compare) {
    return (
      <div className="psc-panel psc-panel--compare">
        <h3>{t('passSubmission.calculator.panels.compare')}</h3>
        <p className="psc-muted">{t('passSubmission.calculator.compare.hint')}</p>
      </div>
    );
  }

  const c = result.compare;
  return (
    <div className="psc-panel psc-panel--compare">
      <h3>{t('passSubmission.calculator.panels.compare')}</h3>
      <div className="psc-primary-grid">
        <div className="psc-stat">
          <span className="psc-stat__label">{t('passSubmission.calculator.compare.primary')}</span>
          <span className="psc-stat__value">{c.primary.toFixed(2)}</span>
        </div>
        <div className="psc-stat">
          <span className="psc-stat__label">{t('passSubmission.calculator.compare.secondary')}</span>
          <span className="psc-stat__value">{c.secondary.toFixed(2)}</span>
        </div>
        <div className="psc-stat">
          <span className="psc-stat__label">{t('passSubmission.calculator.compare.delta')}</span>
          <span className="psc-stat__value">{c.delta >= 0 ? '+' : ''}{c.delta.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
