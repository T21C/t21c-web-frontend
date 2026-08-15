// tuf-search: #ReclearPanel #passScoreCalculator
import { useTranslation } from 'react-i18next';

export function ReclearPanel({ result }) {
  const { t } = useTranslation('pages');
  if (!result?.reclear) {
    return (
      <div className="psc-panel psc-panel--reclear">
        <h3>{t('passSubmission.calculator.panels.reclear')}</h3>
        <p className="psc-muted">{t('passSubmission.calculator.reclear.needPlayer')}</p>
      </div>
    );
  }

  const r = result.reclear;
  return (
    <div className="psc-panel psc-panel--reclear">
      <h3>{t('passSubmission.calculator.panels.reclear')}</h3>
      {!r.hasBest ? (
        <p>{t('passSubmission.calculator.reclear.noPrior')}</p>
      ) : (
        <div className="psc-primary-grid">
          <div className="psc-stat">
            <span className="psc-stat__label">{t('passSubmission.calculator.reclear.best')}</span>
            <span className="psc-stat__value">{Number(r.bestScore).toFixed(2)}</span>
          </div>
          <div className="psc-stat">
            <span className="psc-stat__label">{t('passSubmission.calculator.reclear.status')}</span>
            <span className="psc-stat__value">
              {r.beatsBest
                ? t('passSubmission.calculator.reclear.beats')
                : r.equalBest
                  ? t('passSubmission.calculator.reclear.equal')
                  : t('passSubmission.calculator.reclear.worse')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
