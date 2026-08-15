// tuf-search: #usePassScoreCalculator #passScoreCalculator
import { useCallback, useState } from 'react';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { parseJudgements } from '@/utils/ParseJudgements';
import { runLocalCalculatorMath, isCustomScoring } from './passScoreCalculatorMath';

function parseOptionalJudgementForm(partial) {
  if (!partial) return null;
  const fake = {
    tooEarly: partial.tooEarly ?? '',
    early: partial.early ?? '',
    ePerfect: partial.ePerfect ?? '',
    perfect: partial.perfect ?? '',
    lPerfect: partial.lPerfect ?? '',
    late: partial.late ?? '',
  };
  const j = parseJudgements(fake);
  if (!j.every(Number.isInteger)) return null;
  return j;
}

/**
 * Manual Calculate runner — does not subscribe to every input.
 */
export function usePassScoreCalculator() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const run = useCallback(async ({
    form,
    level,
    overrides,
    difficultyDict,
    targetScore,
    compareForm,
  }) => {
    setIsCalculating(true);
    setError(null);
    try {
      const judgements = parseJudgements(form);
      if (!judgements.every(Number.isInteger)) {
        throw new Error('Enter all six judgement counts as integers');
      }

      const hasSandboxBase =
        Number(overrides?.baseScore) > 0 ||
        Number(overrides?.ppBaseScore) > 0 ||
        Number(overrides?.difficultyBaseScore) > 0;

      if (!level && !hasSandboxBase) {
        throw new Error('Select a level or set sandbox base score values');
      }

      const speedTrimmed = form.speed?.trim?.() ?? '';
      if (speedTrimmed !== '' && !(Number(speedTrimmed) >= 1)) {
        throw new Error('Speed must be empty or ≥ 1.0');
      }

      const custom = isCustomScoring(level, overrides, difficultyDict);
      const compareJudgements = parseOptionalJudgementForm(compareForm);

      let placement = null;
      let playerContext = null;

      const fetches = [];

      if (level?.id && !custom) {
        const scorePreview = runLocalCalculatorMath({
          form,
          judgements,
          level,
          overrides,
          difficultyDict,
        }).primary.scoreV2;

        fetches.push(
          api
            .get(routes.database.passes.levelPlacement(level.id), {
              params: { score: scorePreview },
            })
            .then((res) => {
              placement = res.data;
            })
            .catch((err) => {
              console.warn('[passScoreCalculator] placement failed', err);
            }),
        );
      }

      if (level?.id && form.playerId) {
        fetches.push(
          api
            .get(routes.database.passes.levelCalculatorPlayer(level.id), {
              params: { playerId: form.playerId },
            })
            .then((res) => {
              playerContext = res.data;
            })
            .catch((err) => {
              console.warn('[passScoreCalculator] player context failed', err);
            }),
        );
      }

      await Promise.all(fetches);

      const local = runLocalCalculatorMath({
        form,
        judgements,
        level,
        overrides,
        difficultyDict,
        targetScore: targetScore === '' || targetScore == null ? null : Number(targetScore),
        compareJudgements,
        playerContext,
      });

      setResult({
        ...local,
        placement,
        playerContext,
        calculatedAt: Date.now(),
      });
    } catch (err) {
      setResult(null);
      setError(err?.message || String(err));
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, error, isCalculating, run, clear };
}
