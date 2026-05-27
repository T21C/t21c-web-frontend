// tuf-search: #XaccPinJudgementInputs #xaccCurve #judgements
import PropTypes from 'prop-types'
import {
    JUDGEMENT_INPUT_FIELDS,
    accuracyFromJudgementForm,
} from '@/utils/xaccPinJudgements.js'

export function XaccPinJudgementInputs({ form, onChange, computedAccuracyLabel }) {
    const acc = accuracyFromJudgementForm(form)
    const accPct =
        acc != null && Number.isFinite(acc) ? `${(acc * 100).toFixed(2)}%` : '—'

    return (
        <div className="admin-level-xacc-curve-popup__judgements">
            <div className="admin-level-xacc-curve-popup__judgements-accuracy">
                <span className="admin-level-xacc-curve-popup__judgements-accuracy-label">
                    {computedAccuracyLabel}
                </span>
                <span className="admin-level-xacc-curve-popup__judgements-accuracy-value">
                    {accPct}
                </span>
            </div>
            <div
                className="admin-level-xacc-curve-popup__judgement-row"
                role="group"
                aria-label="Judgement counts"
            >
                {JUDGEMENT_INPUT_FIELDS.map(({ key, variant, color }) => (
                    <input
                        key={key}
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        className={`admin-level-xacc-curve-popup__judgement-input admin-level-xacc-curve-popup__judgement-input--${variant}`}
                        style={{ color, borderColor: color }}
                        value={form[key] ?? '0'}
                        onChange={(e) => onChange(key, e.target.value)}
                        aria-label={variant}
                    />
                ))}
            </div>
        </div>
    )
}

XaccPinJudgementInputs.propTypes = {
    form: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    computedAccuracyLabel: PropTypes.string,
}
