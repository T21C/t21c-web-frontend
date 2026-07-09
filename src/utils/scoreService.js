/**
 * Client preview scoring facade — keep API in sync with
 * server/src/misc/utils/pass/scoreService.ts
 */
import calcAcc from './CalcAcc.js'
import { getScoreV2 } from './CalcScore.js'

/**
 * @param {object | null | undefined} level
 * @param {object} [overrides]
 * @returns {object}
 */
export function buildLevelScoreContext(level = {}, overrides = {}) {
    const xaccCurveMeta = Object.prototype.hasOwnProperty.call(
        overrides,
        'xaccCurveMeta',
    )
        ? overrides.xaccCurveMeta
        : (level?.xaccCurveMeta ?? null)

    return {
        ...level,
        ...overrides,
        baseScore:
            overrides.baseScore !== undefined
                ? overrides.baseScore
                : (level?.baseScore ?? null),
        ppBaseScore:
            overrides.ppBaseScore !== undefined
                ? overrides.ppBaseScore
                : (level?.ppBaseScore ?? null),
        difficulty: overrides.difficulty ?? level?.difficulty,
        xaccCurveMeta,
        diffId: level?.diffId ?? overrides.diffId,
    }
}

/**
 * @param {{ speed: number, judgements: unknown, isNoHoldTap?: boolean }} pass
 * @param {object | null | undefined} level
 * @param {object} [overrides]
 * @param {object} [difficultyDict]
 * @returns {{ scoreV2: number, accuracy: number }}
 */
export function computePassScoreV2(
    pass,
    level,
    overrides = {},
    difficultyDict = {},
) {
    const lvl = buildLevelScoreContext(level, overrides)
    const accuracy = calcAcc(pass.judgements)
    const scoreV2 = getScoreV2(
        {
            speed: pass.speed ?? 1,
            judgements: pass.judgements,
            isNoHoldTap: pass.isNoHoldTap ?? false,
        },
        lvl,
        difficultyDict,
    )
    return { scoreV2, accuracy }
}
