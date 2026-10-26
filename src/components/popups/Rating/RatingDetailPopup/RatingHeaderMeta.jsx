import { Fragment, useMemo } from 'react';
import { ChartIcon, MetronomeIcon, TimeIcon } from '@/components/common/icons';
import { Tooltip } from '@/components/common/display/Tooltip';
import TagConfidenceBar from '@/components/common/display/TagConfidenceBar/TagConfidenceBar';
import { PpBasescoreEditTooltip } from '@/components/common/display/PpDifficultyIcon/PpDifficultyIcon';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { clampFloat, ICON_SIZE, selectIconSize } from '@/utils/Utility';
import { formatAutoTilecountTooltip, formatDuration } from '@/utils/levelHelpers';
import {
  getCurationTypesResolved,
  sortCurationsForDisplay,
  sortCurationTypesForDisplay,
} from '@/utils/curationTypeUtils';
import {
  COMMUNITY_TAG_CARD_CAP,
  communityTagHoverTitle,
  selectLevelCardDisplayTags,
} from '@/utils/communityTags';

/** Same names the level card hides from its difficulty-arc curation icons. */
const HIDDEN_CURATION_TYPE_NAMES = new Set(['C0', 'V0']);

export function RatingHeaderMeta({ level }) {
  const { difficultyDict, curationTypesDict, tagsDict } = useDifficultyContext();

  const curationIcons = useMemo(() => {
    if (!level) return [];
    const raw = level.curations?.length
      ? level.curations
      : level.curation
        ? [level.curation]
        : [];
    const seen = new Set();
    const types = [];
    for (const curation of sortCurationsForDisplay(raw, curationTypesDict)) {
      for (const type of getCurationTypesResolved(curation, curationTypesDict)) {
        if (type?.id == null || seen.has(type.id)) continue;
        seen.add(type.id);
        types.push(type);
      }
    }
    return sortCurationTypesForDisplay(types, curationTypesDict)
      .filter((type) => {
        const info = curationTypesDict[type.id] || type;
        const name = info?.name ?? type.name;
        return !HIDDEN_CURATION_TYPE_NAMES.has(name);
      })
      .map((type) => {
        const info = curationTypesDict[type.id] || type;
        return {
          key: type.id,
          name: info?.name ?? type.name ?? '',
          icon: info?.icon,
        };
      })
      .filter((slot) => slot.icon);
  }, [level, curationTypesDict]);

  const tags = useMemo(() => {
    const assignedList = level?.tags || [];
    const merged = assignedList
      .map((assigned) => {
        if (!assigned || assigned.id == null) return null;
        const catalog = tagsDict[assigned.id];
        const source = catalog || assigned;
        if (typeof source.name !== 'string' || source.name.length === 0) return null;
        return {
          ...source,
          pinned: Boolean(assigned.pinned),
          score: assigned.score ?? null,
          isCommunity: Boolean(catalog?.isCommunity ?? assigned.isCommunity),
          sortOrder: catalog?.sortOrder ?? assigned.sortOrder,
          groupSortOrder: catalog?.groupSortOrder ?? assigned.groupSortOrder,
          group: catalog?.group ?? assigned.group,
        };
      })
      .filter(Boolean);
    return selectLevelCardDisplayTags(merged, COMMUNITY_TAG_CARD_CAP);
  }, [tagsDict, level?.tags]);

  if (!level) return null;

  const showBpm = level.bpm != null;
  const showTiles = level.tilecount != null;
  const showTime = level.levelLengthInMs != null;
  const hasStats = showBpm || showTiles || showTime;
  const hasCuration = curationIcons.length > 0;
  const hasTags = tags.length > 0;
  if (!hasStats && !hasCuration && !hasTags) return null;

  const autoTilecountTooltip = showTiles
    ? formatAutoTilecountTooltip(level.tilecount, level.autoTileCount, level.midspinCount)
    : null;
  const tilecountTooltipId = `rating-header-tilecount-${level.id}`;

  const sections = [];

  if (hasStats) {
    sections.push({
      key: 'stats',
      node: (
        <div className="rating-header-meta__group">
          {showBpm && (
            <div className="rating-header-meta__stat">
              <MetronomeIcon size={18} />
              <span className="rating-header-meta__stat-value">{clampFloat(level.bpm, 2)}</span>
            </div>
          )}
          {showTiles && (
            <div
              className="rating-header-meta__stat"
              {...(autoTilecountTooltip
                ? {
                    'data-tooltip-id': tilecountTooltipId,
                    'data-tooltip-content': autoTilecountTooltip,
                  }
                : {})}
            >
              <ChartIcon size={18} />
              <span className="rating-header-meta__stat-value">{level.tilecount}</span>
              {autoTilecountTooltip && (
                <Tooltip
                  style={{ fontSize: '0.85rem', fontWeight: 500 }}
                  id={tilecountTooltipId}
                  place="bottom"
                />
              )}
            </div>
          )}
          {showTime && (
            <div className="rating-header-meta__stat">
              <TimeIcon size={18} />
              <span className="rating-header-meta__stat-value">{formatDuration(level.levelLengthInMs)}</span>
            </div>
          )}
        </div>
      ),
    });
  }

  if (hasCuration) {
    sections.push({
      key: 'curation',
      node: (
        <div className="rating-header-meta__group rating-header-meta__group--icons">
          {curationIcons.map((slot) => (
            <img
              key={slot.key}
              className="rating-header-meta__curation-icon"
              src={selectIconSize(slot.icon, ICON_SIZE.SMALL)}
              alt={slot.name}
              title={slot.name}
            />
          ))}
        </div>
      ),
    });
  }

  if (hasTags) {
    sections.push({
      key: 'tags',
      node: (
        <div className="rating-header-meta__group rating-header-meta__group--icons">
          {tags.map((tag) => (
            <PpBasescoreEditTooltip
              key={tag.id}
              tag={tag}
              level={level}
              difficultyDict={difficultyDict}
            >
              <div
                className="rating-header-meta__tag"
                data-letter-only={!tag.icon}
                style={{
                  '--tag-bg-color': `${tag.color}50`,
                  '--tag-border-color': tag.color,
                  '--tag-text-color': tag.color,
                }}
                title={communityTagHoverTitle(tag)}
              >
                <TagConfidenceBar score={tag.score} show={Boolean(tag.isCommunity)}>
                  {tag.icon ? (
                    <img src={selectIconSize(tag.icon, ICON_SIZE.SMALL)} alt={tag.name} />
                  ) : (
                    <span className="rating-header-meta__tag-letter">{tag.name.charAt(0).toUpperCase()}</span>
                  )}
                </TagConfidenceBar>
              </div>
            </PpBasescoreEditTooltip>
          ))}
        </div>
      ),
    });
  }

  return (
    <div className="rating-header-meta">
      {sections.map((section, index) => (
        <Fragment key={section.key}>
          {index > 0 && <span className="rating-header-meta__sep" aria-hidden="true">|</span>}
          {section.node}
        </Fragment>
      ))}
    </div>
  );
}
