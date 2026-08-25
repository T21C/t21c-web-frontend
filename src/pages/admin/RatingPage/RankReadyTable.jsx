// tuf-search: #RankReadyTable #rankReadyTable #admin #rating
import MarqueeText from '@/components/common/display/MarqueeText/MarqueeText';
import { EyeIcon } from '@/components/common/icons';
import { VirtualList } from '@/components/common/VirtualList';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { useTranslation } from 'react-i18next';
import { getSongDisplayName } from '@/utils/levelHelpers';


const AUTORATER_USER_ID = 'b19522b7-c12b-42d8-9fcd-08b0cdbf8b7e';

export const isAutoraterDetail = (detail) => detail?.userId === AUTORATER_USER_ID;

export const countDetails = (details = []) => {
  let manager = 0;
  let community = 0;
  for (const detail of details) {
    if (isAutoraterDetail(detail)) continue;
    if (detail?.isCommunityRating) community += 1;
    else manager += 1;
  }
  return { manager, community };
};

export const rankReadyPguBand = (difficulty) => {
  const letter = String(difficulty?.name || '').charAt(0).toUpperCase();
  if (letter === 'U' || letter === 'Q') return 0;
  if (letter === 'G') return 1;
  if (letter === 'P') return 2;
  return 3;
};

export const compareRankReadyRows = (a, b, difficultyDict, sortType, sortOrder) => {
  const dict = difficultyDict || {};
  const bandDiff =
    rankReadyPguBand(dict[a?.averageDifficultyId]) - rankReadyPguBand(dict[b?.averageDifficultyId]);
  if (bandDiff !== 0) return bandDiff;

  const isDesc = String(sortOrder).toUpperCase() !== 'ASC';
  const dir = isDesc ? -1 : 1;
  if (sortType === 'ratings') {
    const countA = countDetails(a?.details).manager;
    const countB = countDetails(b?.details).manager;
    if (countA !== countB) return (countA - countB) * dir;
  } else if (sortType === 'updatedAt') {
    const timeA = new Date(a?.updatedAt || 0).getTime();
    const timeB = new Date(b?.updatedAt || 0).getTime();
    if (timeA !== timeB) return (timeA - timeB) * dir;
  } else {
    const idA = Number(a?.level?.id ?? a?.levelId ?? 0);
    const idB = Number(b?.level?.id ?? b?.levelId ?? 0);
    if (idA !== idB) return (idA - idB) * dir;
  }
  return Number(a?.id ?? 0) - Number(b?.id ?? 0);
};

const getAutoraterRating = (details = []) => {
  const match = details.find(
    (detail) => detail?.userId === AUTORATER_USER_ID,
  );
  return match?.rating || '';
};

const RankReadyHeader = ({ t }) => (
  <div className="rank-ready-table__header">
    <span className="rank-ready-table__col rank-ready-table__col--name">
      {t('rating.rankReady.columns.name')}
    </span>
    <span className="rank-ready-table__col rank-ready-table__col--avg">
      {t('rating.rankReady.columns.managerAvg')}
    </span>
    <span className="rank-ready-table__col rank-ready-table__col--avg">
      {t('rating.rankReady.columns.communityAvg')}
    </span>
    <span className="rank-ready-table__col rank-ready-table__col--counts">
      {t('rating.rankReady.columns.mgrCom')}
    </span>
    <span className="rank-ready-table__col rank-ready-table__col--autorater">
      {t('rating.rankReady.columns.autorater')}
    </span>
    <span className="rank-ready-table__col rank-ready-table__col--edit">
      {t('buttons.edit', { ns: 'common' })}
    </span>
  </div>
);

const RankReadyRow = ({ rating, settled, onViewRating, onEditLevel, t, difficultyDict }) => {
  const levelId = rating.level?.id;
  const { manager, community } = countDetails(rating.details);
  const songName = getSongDisplayName(rating.level) || `#${levelId}`;
  const managerAvg = difficultyDict[rating.averageDifficultyId]?.name || '—';
  const communityAvg = difficultyDict[rating.communityDifficultyId]?.name || '—';
  const autoraterRating = getAutoraterRating(rating.details);

  return (
    <div className={`rank-ready-table__row${settled ? ' rank-ready-table__row--settled' : ''}`}>
      <span className="rank-ready-table__col rank-ready-table__col--name">
        <MarqueeText className="rank-ready-table__name" title={songName}>
          {songName}
        </MarqueeText>
      </span>
      <span className="rank-ready-table__col rank-ready-table__col--avg">{managerAvg}</span>
      <span className="rank-ready-table__col rank-ready-table__col--avg">{communityAvg}</span>
      <span className="rank-ready-table__col rank-ready-table__col--counts">
        {manager}/{community}
      </span>
      <span className="rank-ready-table__col rank-ready-table__col--autorater">
        {autoraterRating}
      </span>
      <span className="rank-ready-table__col rank-ready-table__col--edit">
        <div className="rank-ready-table__actions">
          <button
            type="button"
            className="rank-ready-table__view-btn"
            aria-label={t('rating.rankReady.view')}
            onClick={() => onViewRating(rating)}
          >
            <EyeIcon size="14px" color="currentColor" />
          </button>
          <button
            type="button"
            className="rank-ready-table__edit-btn"
            disabled={settled}
            onClick={() => onEditLevel(levelId)}
          >
            {t('buttons.edit', { ns: 'common' })}
          </button>
        </div>
      </span>
    </div>
  );
};

export const RankReadyTable = ({
  ratings,
  settledLevelIds,
  onViewRating,
  onEditLevel,
  loadMore,
  hasMore,
  loadingMore,
}) => {
  const { t } = useTranslation('pages');
  const { difficultyDict } = useDifficultyContext();

  return (
    <div className="rank-ready-table">
      <RankReadyHeader t={t} />
      <VirtualList
        style={{ paddingBottom: '4rem', overflow: 'visible' }}
        items={ratings}
        loadMore={loadMore}
        hasMore={hasMore}
        loadingMore={loadingMore}
        listClassName="rank-ready-table__body"
        scrollStorePath="/rating"
        stateKey="admin-rating-rank-ready"
        loader={<div className="loader loader-relative" />}
        endMessage={
          ratings.length > 0 && !hasMore && (
            <p className="end-message">
              <b>{t('rating.infiniteScroll.end')}</b>
            </p>
          )
        }
        renderItem={(rating) => (
          <RankReadyRow
            rating={rating}
            settled={settledLevelIds.has(rating.level?.id)}
            onViewRating={onViewRating}
            onEditLevel={onEditLevel}
            t={t}
            difficultyDict={difficultyDict}
          />
        )}
        computeItemKey={(index, rating) => rating?.id ?? index}
      />
    </div>
  );
};

export default RankReadyTable;
