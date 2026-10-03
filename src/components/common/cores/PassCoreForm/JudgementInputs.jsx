// tuf-search: #JudgementInputs #passCoreForm #judgementInputs
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import calcAcc from '@/utils/CalcAcc';
import { formatAccuracyRatio } from '@/utils/statFormatters';
import { judgementsAreComplete, parseJudgements } from '@/utils/ParseJudgements';
import './JudgementInputs.css';

const DEFAULT_COPY = {
  ns: 'pages',
  ePerfect: 'passSubmission.judgements.ePerfect',
  perfectMinus: 'passSubmission.judgements.perfectMinus',
  perfect: 'passSubmission.judgements.perfect',
  perfectPlus: 'passSubmission.judgements.perfectPlus',
  lPerfect: 'passSubmission.judgements.lPerfect',
  tooEarly: 'passSubmission.judgements.tooearly',
  early: 'passSubmission.judgements.early',
  late: 'passSubmission.judgements.late',
  accPrefix: 'passSubmission.acc',
  scorePrefix: 'passSubmission.scoreCalc',
};

const TOP_FIELDS = [
  { name: 'ePerfect', color: 'var(--color-marv, #FCFF4D)' },
  { name: 'perfect', color: 'var(--color-perf, #5FFF4E)' },
  { name: 'lPerfect', color: 'var(--color-great, #FCFF4D)' },
];

const XPERFECT_TOP_FIELDS = [
  { name: 'ePerfect', color: 'var(--color-marv, #FCFF4D)' },
  { name: 'perfectMinus', color: 'var(--color-perf, #5FFF4E)' },
  { name: 'perfect', color: 'var(--color-xperfect, #ffffff)' },
  { name: 'perfectPlus', color: 'var(--color-perf, #5FFF4E)' },
  { name: 'lPerfect', color: 'var(--color-great, #FCFF4D)' },
];

const BOTTOM_FIELDS = [
  { name: 'tooEarly', color: 'var(--color-early-2, #FF0000)' },
  { name: 'early', color: 'var(--color-early-1, #FF6F4D)' },
  { name: 'late', color: 'var(--color-late-1, #FF6F4D)' },
];

const XPERFECT_COMPACT_FIELDS = new Set([
  'ePerfect',
  'perfectMinus',
  'perfect',
  'perfectPlus',
  'lPerfect',
]);

function compactLabelKey(fullKey) {
  const dot = fullKey.lastIndexOf('.');
  if (dot < 0) return null;
  return `${fullKey.slice(0, dot)}.short.${fullKey.slice(dot + 1)}`;
}

function isIntegerInputValue(value) {
  return value === '' || /^\d+$/.test(value);
}

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
  integerOnly = false,
  showXPerfectFields = false,
}) {
  const copy = copyProp || DEFAULT_COPY;
  const { t, i18n } = useTranslation([copy.ns, 'common']);
  const shouldShowScore = showScore ?? score != null;
  const topFields = showXPerfectFields ? XPERFECT_TOP_FIELDS : TOP_FIELDS;

  const resolvedAccuracy = useMemo(() => {
    if (accuracy !== undefined) return accuracy;
    const parsed = parseJudgements(values);
    if (!judgementsAreComplete(parsed, { requireXPerfectFields: showXPerfectFields })) return null;
    return formatAccuracyRatio(calcAcc(parsed));
  }, [accuracy, values, showXPerfectFields]);

  const renderField = ({ name, color }) => {
    const valid = !isValidDisplay || isValidDisplay[name];
    const fullKey = copy[name];
    const fullLabel = fullKey ? t(fullKey, { ns: copy.ns, defaultValue: name }) : name;
    const shortKey = showXPerfectFields && XPERFECT_COMPACT_FIELDS.has(name) && fullKey
      ? compactLabelKey(fullKey)
      : null;
    const useShort = !!(shortKey && i18n.exists(shortKey, { ns: copy.ns }));
    const label = useShort ? t(shortKey, { ns: copy.ns }) : fullLabel;
    return (
      <div className={`judgement-inputs__field judgement-inputs__field--${name}`} key={name}>
        <p title={useShort ? fullLabel : undefined}>{label}</p>
        <input
          type="text"
          inputMode={integerOnly ? 'numeric' : undefined}
          pattern={integerOnly ? '[0-9]*' : undefined}
          autoComplete="off"
          placeholder="#"
          name={name}
          value={values[name] ?? ''}
          onChange={(e) => {
            if (integerOnly && !isIntegerInputValue(e.target.value)) return;
            onChange(e);
          }}
          style={{ borderColor: valid ? '' : 'red', color }}
        />
      </div>
    );
  };

  return (
    <div className={`judgement-inputs${showXPerfectFields ? ' judgement-inputs--xperfect' : ''}${className ? ` ${className}` : ''}`}>
      <div className="judgement-inputs__row judgement-inputs__row--top">
        {topFields.map(renderField)}
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
