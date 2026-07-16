/**
 * Client preview scoring facade — keep API in sync with
 * server/src/misc/utils/pass/scoreService.ts
 */
import calcAcc from './CalcAcc.js'
import { getScoreV2, resolveScoreBase } from './CalcScore.js'

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

    const difficulty = overrides.difficulty ?? level?.difficulty ?? null

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
        difficulty: difficulty
            ? {
                  name: difficulty.name,
                  baseScore:
                      difficulty.baseScore != null &&
                      Number.isFinite(difficulty.baseScore)
                          ? difficulty.baseScore
                          : 0,
              }
            : { baseScore: 0 },
        xaccCurveMeta,
        diffId: level?.diffId ?? overrides.diffId,
    }
}

/**
 * Best-effort normalize of pass fields; missing values get safe defaults.
 * @param {{ speed?: number|null, judgements?: unknown, isNoHoldTap?: boolean|null }} pass
 * @returns {{ speed: number, judgements: unknown, isNoHoldTap: boolean, warnings: string[] }}
 */
export function normalizePassScoreInput(pass = {}) {
    const warnings = []

    let speed = 1
    if (pass.speed == null || !Number.isFinite(Number(pass.speed))) {
        warnings.push('speed missing/invalid; defaulting to 1')
    } else {
        speed = Number(pass.speed)
    }

    const judgements = Array.isArray(pass.judgements)
        ? pass.judgements
        : null
    if (judgements == null) {
        warnings.push('judgements missing; defaulting to zeros')
    }

    return {
        speed,
        judgements: judgements ?? [0, 0, 0, 0, 0, 0],
        isNoHoldTap: pass.isNoHoldTap === true,
        warnings,
    }
}

/**
 * @param {{ speed?: number|null, judgements?: unknown, isNoHoldTap?: boolean|null }} pass
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
    const normalized = normalizePassScoreInput(pass)
    const accuracy = calcAcc(normalized.judgements)
    const resolvedBase = resolveScoreBase(lvl, accuracy, difficultyDict)
    if (resolvedBase === 0) {
        normalized.warnings.push(
            'baseScore resolved to 0 (level/difficulty baseScore missing)',
        )
    }
    if (normalized.warnings.length) {
        console.warn('[computePassScoreV2] best-effort scoring with gaps', {
            warnings: normalized.warnings,
            speed: normalized.speed,
            levelBaseScore: lvl.baseScore,
            ppBaseScore: lvl.ppBaseScore,
            difficultyBaseScore: lvl.difficulty?.baseScore,
        })
    }

    const scoreV2 = getScoreV2(
        {
            speed: normalized.speed,
            judgements: normalized.judgements,
            isNoHoldTap: normalized.isNoHoldTap,
        },
        lvl,
        difficultyDict,
    )
    return { scoreV2, accuracy }
}
