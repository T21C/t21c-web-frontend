// tuf-search: #InversePanel #passScoreCalculator
import { useTranslation } from 'react-i18next';

export function InversePanel({ result }) {
  const { t } = useTranslation('pages');
  if (!result?.inverse) {
    return (
      <div className="psc-panel psc-panel--inverse">
        <h3>{t('passSubmission.calculator.panels.inverse')}</h3>
        <p className="psc-muted">{t('passSubmission.calculator.inverse.hint')}</p>
      </div>
    );
  }

  const inv = result.inverse;
  return (
    <div className="psc-panel psc-panel--inverse">
      <h3>{t('passSubmission.calculator.panels.inverse')}</h3>
      {inv.unreachable ? (
        <p className="psc-muted">{t('passSubmission.calculator.inverse.unreachable')}</p>
      ) : (
        <div className="psc-primary-grid">
          <div className="psc-stat">
            <span className="psc-stat__label">{t('passSubmission.calculator.labels.accuracy')}</span>
            <span className="psc-stat__value">{(inv.accuracy * 100).toFixed(4)}%</span>
          </div>
          <div className="psc-stat">
            <span className="psc-stat__label">{t('passSubmission.calculator.labels.score')}</span>
            <span className="psc-stat__value">{inv.scoreV2.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
