// tuf-search: #JudgementInputs #passCoreForm #judgementInputs
import { useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@/components/common/display/Tooltip';
import { SparkleIcon } from '@/components/common/icons';
import calcAcc from '@/utils/CalcAcc';
import { formatAccuracyRatio } from '@/utils/statFormatters';
import { judgementsAreComplete, parseJudgements } from '@/utils/ParseJudgements';
import {
  getJudgementRemainderFill,
  getJudgementZeroRemainderFields,
  shouldShowPurePerfectAutofill,
} from '@/utils/passJudgementHitCount';
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
  fillRemainder: 'passSubmission.judgements.fillRemainder',
  fillRemainingZero: 'passSubmission.judgements.fillRemainingZero',
  purePerfect: 'passSubmission.judgements.purePerfect',
  purePerfectTooltip: 'passSubmission.judgements.purePerfectTooltip',
  accPrefix: 'passSubmission.acc',
  scorePrefix: 'passSubmission.scoreCalc',
};

const TOP_FIELDS = [
  { name: 'ePerfect', color: 'var(--color-marv, #FCFF4D)' },
  { name: 'perfect', color: 'var(--color-perf, #5FFF4E)' },
  { name: 'lPerfect', color: 'var(--color-great, #FCFF4D)' },
];

const XPERFECT_TOP_FIELDS = [
  { name: 'perfectMinus', color: 'var(--color-perf, #5FFF4E)' },
  { name: 'perfect', color: 'var(--color-xperfect, #ffffff)' },
  { name: 'perfectPlus', color: 'var(--color-perf, #5FFF4E)' },
];

const XPERFECT_MID_FIELDS = [
  { name: 'ePerfect', color: 'var(--color-marv, #FCFF4D)' },
  { name: 'lPerfect', color: 'var(--color-great, #FCFF4D)' },
];

const BOTTOM_FIELDS = [
  { name: 'tooEarly', color: 'var(--color-early-2, #FF0000)' },
  { name: 'early', color: 'var(--color-early-1, #FF6F4D)' },
  { name: 'late', color: 'var(--color-late-1, #FF6F4D)' },
];

const PURE_PERFECT_ZERO_FIELDS = ['ePerfect', 'perfectMinus', 'perfectPlus', 'lPerfect', 'tooEarly', 'early', 'late'];

function isIntegerInputValue(value) {
  return value === '' || /^\d+$/.test(value);
}

function normalizePurePerfectCount(value) {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
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
  achievableCount = null,
  purePerfectCount: purePerfectCountProp = null,
}) {
  const copy = copyProp || DEFAULT_COPY;
  const { t } = useTranslation([copy.ns, 'common']);
  const shouldShowScore = showScore ?? score != null;
  const topFields = showXPerfectFields ? XPERFECT_TOP_FIELDS : TOP_FIELDS;
  const fillTooltipId = `judgement-remainder-${useId().replace(/:/g, '')}`;
  const purePerfectTooltipId = `judgement-pure-perfect-${useId().replace(/:/g, '')}`;
  const purePerfectCount = normalizePurePerfectCount(purePerfectCountProp);
  const remainderFill = useMemo(
    () => getJudgementRemainderFill(values, achievableCount, { includeXPerfect: showXPerfectFields }),
    [values, achievableCount, showXPerfectFields],
  );
  const zeroRemainderFields = useMemo(
    () => getJudgementZeroRemainderFields(values, achievableCount, { includeXPerfect: showXPerfectFields }),
    [values, achievableCount, showXPerfectFields],
  );
  const showPurePerfect = purePerfectCount != null
    && shouldShowPurePerfectAutofill(values, { includeXPerfect: showXPerfectFields });
  const fillLabel = remainderFill
    ? t(copy.fillRemainder || DEFAULT_COPY.fillRemainder, {
        ns: copy.ns,
        count: remainderFill.value,
        defaultValue: 'Fill remaining {{count}}',
      })
    : '';
  const zeroFillLabel = t(copy.fillRemainingZero || DEFAULT_COPY.fillRemainingZero, {
    ns: copy.ns,
    defaultValue: 'Set remaining judgements to 0',
  });
  const purePerfectLabel = t(copy.purePerfect || DEFAULT_COPY.purePerfect, {
    ns: copy.ns,
    defaultValue: 'Pure Perfect',
  });
  const purePerfectTooltip = showPurePerfect
    ? t(copy.purePerfectTooltip || DEFAULT_COPY.purePerfectTooltip, {
        ns: copy.ns,
        count: purePerfectCount,
        defaultValue: 'Set Perfect to {{count}} and every other judgement to 0',
      })
    : '';

  const resolvedAccuracy = useMemo(() => {
    if (accuracy !== undefined) return accuracy;
    const parsed = parseJudgements(values);
    if (!judgementsAreComplete(parsed, { requireXPerfectFields: showXPerfectFields })) return null;
    return formatAccuracyRatio(calcAcc(parsed));
  }, [accuracy, values, showXPerfectFields]);

  const renderField = ({ name, color }) => {
    const valid = !isValidDisplay || isValidDisplay[name];
    const fullKey = copy[name];
    const label = fullKey ? t(fullKey, { ns: copy.ns, defaultValue: name }) : name;
    const showZeroFill = Boolean(zeroRemainderFields?.includes(name));
    const showRemainderFill = !showZeroFill && remainderFill?.field === name;
    const showFill = showZeroFill || showRemainderFill;
    return (
      <div
        className={`judgement-inputs__field judgement-inputs__field--${name}${showFill ? ' judgement-inputs__field--has-fill' : ''}`}
        key={name}
      >
        <p>{label}</p>
        <div className="judgement-inputs__control">
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
          {showZeroFill && (
            <button
              type="button"
              className="judgement-inputs__fill"
              aria-label={zeroFillLabel}
              data-tooltip-id={fillTooltipId}
              data-tooltip-content={zeroFillLabel}
              onClick={(event) => {
                event.preventDefault();
                const patch = {};
                for (const field of zeroRemainderFields) patch[field] = '0';
                onChange({ patch });
              }}
            >
              <SparkleIcon size={16} />
            </button>
          )}
          {showRemainderFill && (
            <button
              type="button"
              className="judgement-inputs__fill"
              aria-label={fillLabel}
              data-tooltip-id={fillTooltipId}
              data-tooltip-content={fillLabel}
              onClick={(event) => {
                event.preventDefault();
                onChange({
                  target: { name, value: String(remainderFill.value), type: 'text' },
                });
              }}
            >
              <SparkleIcon size={16} />
            </button>
          )}
          {name === 'perfect' && showPurePerfect && (
            <button
              type="button"
              className="judgement-inputs__pure-perfect"
              data-tooltip-id={purePerfectTooltipId}
              data-tooltip-content={purePerfectTooltip}
              onClick={(event) => {
                event.preventDefault();
                const patch = { perfect: String(purePerfectCount) };
                for (const field of PURE_PERFECT_ZERO_FIELDS) patch[field] = '0';
                onChange({ patch });
              }}
            >
              {purePerfectLabel}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`judgement-inputs${showXPerfectFields ? ' judgement-inputs--xperfect' : ''}${className ? ` ${className}` : ''}`}>
      <div className="judgement-inputs__row judgement-inputs__row--top">
        {topFields.map(renderField)}
      </div>
      {showXPerfectFields && (
        <div className="judgement-inputs__row judgement-inputs__row--mid">
          {XPERFECT_MID_FIELDS.map(renderField)}
        </div>
      )}
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
      {(remainderFill || zeroRemainderFields) && (
        <Tooltip className="tooltip" id={fillTooltipId} place="top" effect="solid" />
      )}
      {showPurePerfect && (
        <Tooltip className="tooltip" id={purePerfectTooltipId} place="top" effect="solid" />
      )}
    </div>
  );
}
