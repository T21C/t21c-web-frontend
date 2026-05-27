// tuf-search: #XaccPassPickerJudgementStrip #xaccCurve
import PropTypes from 'prop-types'
import {
    JUDGEMENT_INPUT_FIELDS,
    judgementFormFromPass,
} from '@/utils/xaccPinJudgements.js'

function parseDisplayCount(value) {
    const n = parseInt(String(value), 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
}

export function XaccPassPickerJudgementStrip({ pass, form }) {
    const counts = form ?? judgementFormFromPass(pass)

    return (
        <div
            className="admin-level-xacc-curve-popup__pass-picker-judgements"
            aria-hidden="true"
        >
            {JUDGEMENT_INPUT_FIELDS.map(({ key, variant, color }) => {
                const count = parseDisplayCount(counts[key])
                return (
                    <span
                        key={key}
                        className={`admin-level-xacc-curve-popup__pass-picker-judgement admin-level-xacc-curve-popup__pass-picker-judgement--${variant}`}
                        style={{ color }}
                    >
                        {count}
                    </span>
                )
            })}
        </div>
    )
}

XaccPassPickerJudgementStrip.propTypes = {
    pass: PropTypes.object,
    form: PropTypes.object,
}
