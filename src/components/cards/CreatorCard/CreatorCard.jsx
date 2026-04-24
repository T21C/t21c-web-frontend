import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useContext } from "react";
import "./creatorcard.css";
import { UserAvatar } from "@/components/layout";
import { CreatorStatusBadge } from "@/components/common/display";
import { CreatorListContext } from "@/contexts/CreatorListContext";

const SECONDARY_KEYS = ["totalChartClears", "totalChartLikes"];

const CreatorCard = ({ creator }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('pages');
  const ctx = useContext(CreatorListContext);
  const sortBy = ctx?.sortBy || 'chartsTotal';

  const sortLabels = {
    name: t('creators.sortOptions.name'),
    chartsTotal: t('creators.sortOptions.chartsTotal'),
    chartsCharted: t('creators.sortOptions.chartsCharted'),
    chartsVfxed: t('creators.sortOptions.chartsVfxed'),
    chartsTeamed: t('creators.sortOptions.chartsTeamed'),
    totalChartClears: t('creators.sortOptions.totalChartClears'),
    totalChartLikes: t('creators.sortOptions.totalChartLikes'),
  };

  const value = (key) => {
    if (key === 'name') return creator.name ?? '-';
    return Math.trunc(Number(creator[key] ?? 0)).toLocaleString('en-US');
  };

  const primaryKey = sortBy in sortLabels ? sortBy : 'chartsTotal';
  const secondaryKeys = SECONDARY_KEYS.filter((k) => k !== primaryKey);

  const redirect = () => {
    navigate(`/creator/${creator.id}`);
  };

  return (
    <div className="creator-card" onClick={redirect}>
      <div className="creator-card__avatar">
        <UserAvatar
          primaryUrl={creator.user?.avatarUrl}
          fallbackUrl={null}
        />
      </div>

      <div className="creator-card__name-wrapper">
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

      <div className="creator-card__info">
        <div className="creator-card__score">
          <p className="creator-card__exp">{sortLabels[primaryKey]}</p>
          <div className="creator-card__desc">{value(primaryKey)}</div>
        </div>
        {secondaryKeys.map((key) => (
          <div className="creator-card__score creator-card__score--secondary" key={key}>
            <p className="creator-card__exp">{sortLabels[key]}</p>
            <div className="creator-card__desc">{value(key)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreatorCard;
