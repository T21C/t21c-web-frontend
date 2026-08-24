// tuf-search: #FollowersPopup #followersPopup #popups #account #followers
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import { formatNumber } from '@/utils';
import { UserAvatar } from '@/components/layout';
import { userAvatarUrls } from '@/utils/playerAvatarDisplay';
import './followerspopup.css';

function followerHref(item) {
  if (item?.playerId != null && Number.isFinite(Number(item.playerId))) {
    return `/profile/${item.playerId}`;
  }
  if (item?.creatorId != null && Number.isFinite(Number(item.creatorId))) {
    return `/creator/${item.creatorId}`;
  }
  return null;
}

const FollowersPopup = ({ followersUrl, onClose }) => {
  const { t } = useTranslation(['pages', 'common']);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [visibleCount, setVisibleCount] = useState(0);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadPage = useCallback(
    async (nextPage) => {
      if (!followersUrl) return;
      setLoading(true);
      setError(false);
      try {
        const { data } = await api.get(followersUrl, { params: { page: nextPage, limit: 20 } });
        setItems(Array.isArray(data?.items) ? data.items : []);
        setPage(Number(data?.page) || nextPage);
        setLimit(Number(data?.limit) || 20);
        setVisibleCount(Number(data?.visibleCount) || 0);
        setHiddenCount(Number(data?.hiddenCount) || 0);
      } catch {
        setError(true);
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [followersUrl],
  );

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const totalPages = Math.max(1, Math.ceil(visibleCount / Math.max(1, limit)));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="followers-popup" role="menu" aria-label={t('profile.followersPopup.title')}>
      <div className="followers-popup__list">
        {loading ? (
          <p className="followers-popup__status">{t('profile.followersPopup.loading')}</p>
        ) : error ? (
          <p className="followers-popup__status">{t('profile.followersPopup.error')}</p>
        ) : items.length === 0 ? (
          <p className="followers-popup__status">{t('profile.followersPopup.empty')}</p>
        ) : (
          items.map((item) => {
            const href = followerHref(item);
            const name = item.nickname || item.username || t('profile.followersPopup.unknown');
            const inner = (
              <>
                <UserAvatar {...userAvatarUrls(item)} />
                <span className="followers-popup__row-copy">
                  <span className="followers-popup__row-name">{name}</span>
                  {item.username ? (
                    <span className="followers-popup__row-handle">@{item.username}</span>
                  ) : null}
                </span>
              </>
            );
            return href ? (
              <Link
                key={item.userId}
                className="followers-popup__row"
                role="menuitem"
                to={href}
                onClick={onClose}
              >
                {inner}
              </Link>
            ) : (
              <div key={item.userId} className="followers-popup__row followers-popup__row--static">
                {inner}
              </div>
            );
          })
        )}
      </div>

      {hiddenCount > 0 ? (
        <div className="followers-popup__hidden">
          {t('profile.hiddenFollowers', {
            count: hiddenCount,
            formatted: formatNumber(hiddenCount, 0),
          })}
        </div>
      ) : null}

      {totalPages > 1 ? (
        <div className="followers-popup__pager">
          <button
            type="button"
            className="followers-popup__pager-btn"
            disabled={!hasPrev || loading}
            onClick={() => loadPage(page - 1)}
          >
            {t('profile.followersPopup.previous')}
          </button>
          <span className="followers-popup__pager-info">
            {t('profile.followersPopup.pageInfo', { current: page, total: totalPages })}
          </span>
          <button
            type="button"
            className="followers-popup__pager-btn"
            disabled={!hasNext || loading}
            onClick={() => loadPage(page + 1)}
          >
            {t('profile.followersPopup.next')}
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default FollowersPopup;
