// tuf-search: #PpBasescoreEditTooltip #ppBasescoreEditTooltip #display
import { Children, cloneElement, isValidElement, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ICON_SIZE, formatBaseScore, formatScore, selectIconSize } from '@/utils/Utility';
import { resolvePurePerfectScoreV2 } from '@/utils/scoreV2XaccCurvePins';
import { resolvePpDifficulty } from '@/utils/ppDifficulty';
import { Tooltip } from '@/components/common/display/Tooltip';
import './ppdifficultyicon.css';

export const PP_BASESCORE_EDIT_TAG_NAME = 'Pure Perfect Basescore Edit';

export function PpBasescoreEditTooltip({ tag, level, difficultyDict, children }) {
  const { t } = useTranslation('components');
  const reactId = useId();
  const tooltipId = `pp-basescore${reactId.replace(/:/g, '')}`;
  const isPpTag = tag?.name === PP_BASESCORE_EDIT_TAG_NAME;
  const ppDiff = isPpTag ? resolvePpDifficulty(level, difficultyDict) : null;
  const score = useMemo(
    () => (isPpTag ? resolvePurePerfectScoreV2(level, difficultyDict, level?.tilecount) : 0),
    [isPpTag, level, difficultyDict],
  );

  if (!isPpTag) return children;

  const child = Children.toArray(children).find((node) => isValidElement(node));
  if (!child) return children;

  const scoreLabel = t('cards.level.tooltips.purePerfectScore', { score: formatScore(score) });
  const basescoreLabel = `${formatBaseScore(level?.ppBaseScore)}PP`;

  return (
    <>
      {cloneElement(child, {
        'data-tooltip-id': tooltipId,
        title: '',
      })}
      <Tooltip id={tooltipId} place="bottom">
        <div className="pp-basescore-tooltip">
          <div className="pp-basescore-tooltip-row">
            {ppDiff?.icon && (
              <img
                className="pp-basescore-tooltip-icon"
                src={selectIconSize(ppDiff.icon, ICON_SIZE.SMALL)}
                alt={ppDiff.name || ''}
              />
            )}
            <span>{scoreLabel}</span>
          </div>
          <div className="pp-basescore-tooltip-basescore">{basescoreLabel}</div>
        </div>
      </Tooltip>
    </>
  );
}
