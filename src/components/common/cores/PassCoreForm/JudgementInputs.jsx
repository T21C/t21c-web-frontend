// tuf-search: #JudgementInputs #passCoreForm #judgementInputs
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import calcAcc from '@/utils/CalcAcc';
import { formatAccuracyRatio } from '@/utils/statFormatters';
import { parseJudgements } from '@/utils/ParseJudgements';
import './JudgementInputs.css';

const DEFAULT_COPY = {
  ns: 'pages',
  ePerfect: 'passSubmission.judgements.ePerfect',
  perfect: 'passSubmission.judgements.perfect',
  lPerfect: 'passSubmission.judgements.lPerfect',
  tooEarly: 'passSubmission.judgements.tooearly',
  early: 'passSubmission.judgements.early',
  late: 'passSubmission.judgements.late',
  accPrefix: 'passSubmission.acc',
  scorePrefix: 'passSubmission.scoreCalc',
};

const TOP_FIELDS = [
  { name: 'ePerfect', color: '#FCFF4D' },
  { name: 'perfect', color: '#5FFF4E' },
  { name: 'lPerfect', color: '#FCFF4D' },
];

const BOTTOM_FIELDS = [
  { name: 'tooEarly', color: '#FF0000' },
  { name: 'early', color: '#FF6F4D' },
  { name: 'late', color: '#FF6F4D' },
];

export function JudgementInputs({
  values,
  onChange,
  isValidDisplay,
  accuracy,
  score,
  showAccuracy = true,
  showScore,
  copy: copyProp,
  className = '',
}) {
  const copy = copyProp || DEFAULT_COPY;
  const { t } = useTranslation([copy.ns, 'common']);
  const shouldShowScore = showScore ?? score != null;

  const resolvedAccuracy = useMemo(() => {
    if (accuracy !== undefined) return accuracy;
    const parsed = parseJudgements(values);
    if (!parsed.every(Number.isInteger)) return null;
    return formatAccuracyRatio(calcAcc(parsed));
  }, [accuracy, values]);

  const renderField = ({ name, color }) => {
    const valid = !isValidDisplay || isValidDisplay[name];
    return (
      <div className="judgement-inputs__field" key={name}>
        <p>{t(copy[name], { ns: copy.ns })}</p>
        <input
          type="text"
          autoComplete="off"
          placeholder="#"
          name={name}
          value={values[name] ?? ''}
          onChange={onChange}
          style={{ borderColor: valid ? '' : 'red', color }}
        />
      </div>
    );
  };

  return (
    <div className={`judgement-inputs${className ? ` ${className}` : ''}`}>
      <div className="judgement-inputs__row judgement-inputs__row--top">
        {TOP_FIELDS.map(renderField)}
      </div>
      <div className="judgement-inputs__row judgement-inputs__row--bottom">
        {BOTTOM_FIELDS.map(renderField)}
      </div>
      {showAccuracy || shouldShowScore ? (
        <div className="judgement-inputs__summary">
          {showAccuracy ? (
            <p>
              {t(copy.accPrefix, { ns: copy.ns })}
              {resolvedAccuracy !== null ? resolvedAccuracy : 'N/A'}
            </p>
          ) : null}
          {shouldShowScore ? (
            <p>
              {t(copy.scorePrefix, { ns: copy.ns })}
              {score}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
