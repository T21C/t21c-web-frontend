// tuf-search: #CreatorCard #creatorCard #cards
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useContext, useMemo } from "react";
import "./creatorcard.css";
import { UserAvatar } from "@/components/layout";
import { CreatorStatusBadge } from "@/components/common/display";
import { CreatorListContext } from "@/contexts/CreatorListContext";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { normalizeCreatorLeaderboardSortBy } from "@/utils/creatorLeaderboardSort";
import { buildCreatorIconSlots } from "@/utils/profileIconSlots";
import {
  curationCountsRecordFromLeaderboardHit,
  displayCurationTypeIdsFromHit,
} from "@/utils/creatorCurationCountsFromSource";

const SECONDARY_KEYS = ["totalChartClears", "totalChartLikes"];

const CreatorCard = ({ creator }) => {
  const { t } = useTranslation('pages');
  const ctx = useContext(CreatorListContext);
  const { curationTypesDict } = useDifficultyContext();
  const sortBy = normalizeCreatorLeaderboardSortBy(ctx?.sortBy);

  const sortLabels = {
    name: t('creators.sortOptions.name'),
    chartsTotal: t('creators.sortOptions.chartsTotal'),
    chartsCharted: t('creators.sortOptions.chartsCharted'),
    chartsVfxed: t('creators.sortOptions.chartsVfxed'),
    chartsTeamed: t('creators.sortOptions.chartsTeamed'),
    totalChartClears: t('creators.sortOptions.totalChartClears'),
    totalChartLikes: t('creators.sortOptions.totalChartLikes'),
  };

  const curationTypeCounts = useMemo(
    () => curationCountsRecordFromLeaderboardHit(creator),
    [creator],
  );
  const displayCurationTypeIds = useMemo(
    () => displayCurationTypeIdsFromHit(creator),
    [creator],
  );

  const headerIconSlots = useMemo(
    () => buildCreatorIconSlots(curationTypeCounts, curationTypesDict || {}, displayCurationTypeIds),
    [curationTypeCounts, curationTypesDict, displayCurationTypeIds],
  );

  const value = (key) => {
    if (key === 'name') return creator.name ?? '-';
    return Math.trunc(Number(creator[key] ?? 0)).toLocaleString('en-US');
  };

  const primaryKey = sortBy in sortLabels ? sortBy : 'chartsTotal';
  /** Name is already shown in the title row; keep the lead stat as chart count. */
  const displayPrimaryKey = primaryKey === 'name' ? 'chartsTotal' : primaryKey;
  const secondaryKeys = SECONDARY_KEYS.filter((k) => k !== displayPrimaryKey);

  return (
    <Link className="creator-card" to={`/creator/${creator.id}`}>
      <div className="creator-card__avatar">
        <UserAvatar
          primaryUrl={creator.user?.avatarUrl}
          fallbackUrl={null}
        />
      </div>

      <div className="creator-card__name-wrapper">
        <div className="creator-card__name-main">
          <p className="creator-card__exp">
            {t('creators.card.verified', { defaultValue: 'Creator' })} | ID: {creator.id}
          </p>
          <div className="creator-card__name-row">
            <span className="creator-card__name">{creator.name}</span>
            {creator.verificationStatus && (
              <CreatorStatusBadge
                status={creator.verificationStatus}
                size="small"
                showLabel={false}
                className="creator-card__status"
              />
            )}
          </div>
          {creator.user?.username ? (
            <span className="creator-card__handle">@{creator.user.username}</span>
          ) : (
            <span className="creator-card__handle creator-card__handle--muted">
              {t('creators.card.noUser')}
            </span>
          )}
        </div>
        {headerIconSlots.length > 0 ? (
          <div className="creator-card__header-badges" role="list" aria-label={t('creators.card.curationBadgesAria')}>
            {headerIconSlots.map((slot) => (
              <div
                key={slot.key}
                className="creator-card__badge-slot"
                role="listitem"
                title={slot.tooltip ?? slot.title}
              >
                {slot.iconUrl ? (
                  <img
                    className="creator-card__badge-slot-img"
                    src={slot.iconUrl}
                    alt=""
                    decoding="async"
                  />
                ) : (
                  <span className="creator-card__badge-slot-letter">{slot.letter}</span>
                )}
                <span className="creator-card__badge-slot-count">{slot.badge ?? slot.count ?? 0}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="creator-card__info">
        <div className="creator-card__score">
          <p className="creator-card__exp">{sortLabels[displayPrimaryKey]}</p>
          <div className="creator-card__desc">{value(displayPrimaryKey)}</div>
        </div>
        {secondaryKeys.map((key) => (
          <div className="creator-card__score creator-card__score--secondary" key={key}>
            <p className="creator-card__exp">{sortLabels[key]}</p>
            <div className="creator-card__desc">{value(key)}</div>
          </div>
        ))}
      </div>
    </Link>
  );
};

export default CreatorCard;
