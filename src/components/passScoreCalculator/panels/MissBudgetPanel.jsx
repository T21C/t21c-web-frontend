// tuf-search: #MissBudgetPanel #passScoreCalculator
import { useTranslation } from 'react-i18next';

export function MissBudgetPanel({ result }) {
  const { t } = useTranslation('pages');
  if (!result?.missBudget?.length) return null;

  return (
    <div className="psc-panel psc-panel--miss-budget">
      <h3>{t('passSubmission.calculator.panels.missBudget')}</h3>
      <table className="psc-table">
        <thead>
          <tr>
            <th>{t('passSubmission.calculator.labels.misses')}</th>
            <th>{t('passSubmission.calculator.labels.missMtp')}</th>
            <th>{t('passSubmission.calculator.labels.score')}</th>
          </tr>
        </thead>
        <tbody>
          {result.missBudget.map((row) => (
            <tr key={row.misses}>
              <td>{row.misses}</td>
              <td>{row.missMtp.toFixed(4)}</td>
              <td>{row.scoreV2.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
