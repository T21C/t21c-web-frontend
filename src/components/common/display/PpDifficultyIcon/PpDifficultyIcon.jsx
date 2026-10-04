// tuf-search: #PpDifficultyIcon #ppDifficultyIcon #display
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ICON_SIZE, formatScore, selectIconSize } from '@/utils/Utility';
import { resolvePurePerfectScoreV2 } from '@/utils/scoreV2XaccCurvePins';
import { resolvePpDifficulty } from '@/utils/ppDifficulty';
import { Tooltip } from '@/components/common/display/Tooltip';
import './ppdifficultyicon.css';

export function PpDifficultyIcon({
  level,
  difficultyDict,
  tooltipId,
  tooltipPlace = 'top',
  tooltipNs = 'components',
  tooltipKey = 'cards.level.tooltips.purePerfectScore',
}) {
  const { t } = useTranslation(tooltipNs);
  const ppDiff = resolvePpDifficulty(level, difficultyDict);
  const score = useMemo(
    () => resolvePurePerfectScoreV2(level, difficultyDict, level?.tilecount),
    [level, difficultyDict],
  );
  const tooltipContent = t(tooltipKey, { score: formatScore(score) });

  if (!ppDiff?.icon || !tooltipId) return null;

  return (
    <>
      <img
        className="pp-difficulty-icon"
        src={selectIconSize(ppDiff.icon, ICON_SIZE.SMALL)}
        alt={ppDiff.name || 'Pure perfect difficulty'}
        data-tooltip-id={tooltipId}
        data-tooltip-content={tooltipContent}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />
      <Tooltip id={tooltipId} place={tooltipPlace} />
    </>
  );
}
