// tuf-search: #CommunityTagVotePopup #communityTagVotePopup
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import { Portal } from '@/components/common/Portal';
import { CloseButton } from '@/components/common/buttons';
import TagConfidenceBar from '@/components/common/display/TagConfidenceBar/TagConfidenceBar';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { formatCommunityTagScore, groupTagsByGroup } from '@/utils/communityTags';
import './communitytagvotepopup.css';

export default function CommunityTagVotePopup({
  levelId,
  user,
  disabled = false,
  onClose,
  onAssignedTagsChange,
}) {
  const { t } = useTranslation(['pages', 'common', 'components']);
  const [tags, setTags] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);

  const isBanned =
    hasFlag(user, permissionFlags.TAG_VOTE_BANNED) || Boolean(user?.isTagVoteBanned);
  const canVote = Boolean(user) && !isBanned && !disabled;
  const tooltipId = `community-tag-vote-popup-${levelId}`;

  useBodyScrollLock(true);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const loadTags = useCallback(async () => {
    if (!levelId) return;
    setIsLoading(true);
    try {
      const response = await api.get(routes.database.levels.communityTags(levelId));
      setTags(response.data?.tags || []);
    } catch (error) {
      console.error('Error fetching community tags:', error);
      toast.error(t('errors.generic', { ns: 'common' }));
      setTags([]);
    } finally {
      setIsLoading(false);
    }
  }, [levelId]);

  useEffect(() => {
    loadTags();
  }, [loadTags, user?.id]);

  const filteredTags = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return tags;
    return tags.filter((tag) => String(tag.name || '').toLowerCase().includes(q));
  }, [tags, search]);

  const groups = useMemo(() => groupTagsByGroup(filteredTags), [filteredTags]);

  const handleVote = async (tag) => {
    if (!canVote || isVoting) return;
    setIsVoting(true);
    const action = tag.voted ? 'unvote' : 'vote';
    try {
      const response = await api.put(
        routes.database.levels.communityTagVote(levelId, tag.id),
        { action },
      );
      setTags(response.data?.tags || []);
      toast.success(
        action === 'vote'
          ? t('levelDetail.tags.vote.voted', { tag: tag.name })
          : t('levelDetail.tags.vote.unvoted', { tag: tag.name }),
      );
      if (onAssignedTagsChange) {
        const assignedResponse = await api.get(routes.database.difficulties.levelTags(levelId));
        onAssignedTagsChange(assignedResponse.data || []);
      }
    } catch (error) {
      console.error('Error toggling community tag vote:', error);
      const status = error.response?.status;
      if (status === 401) {
        toast.error(t('levelDetail.tags.vote.loginRequired'));
      } else if (status === 403) {
        toast.error(t('levelDetail.tags.vote.banned'));
      } else {
        toast.error(t('levelDetail.tags.vote.failed'));
      }
    } finally {
      setIsVoting(false);
    }
  };

  const itemTooltip = (tag) => {
    if (!user) return t('levelDetail.tags.vote.loginRequired');
    if (isBanned) return t('levelDetail.tags.vote.banned');
    return tag.voted ? t('levelDetail.tags.vote.unvote') : t('levelDetail.tags.vote.vote');
  };

  return (
    <Portal>
      <div
        className="community-tag-vote-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-tag-vote-popup-title"
      >
        <button
          type="button"
          className="community-tag-vote-popup__backdrop"
          aria-label={t('buttons.close', { ns: 'common' })}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
        <div
          className="community-tag-vote-popup__dialog"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="community-tag-vote-popup__header">
            <h3 id="community-tag-vote-popup-title" className="community-tag-vote-popup__title">
              {t('levelDetail.tags.vote.header')}
            </h3>
            <CloseButton
              variant="inline"
              size="sm"
              onClick={onClose}
              aria-label={t('buttons.close', { ns: 'common' })}
            />
          </div>
          <input
            type="search"
            className="community-tag-vote-popup__search"
            placeholder={t('facetQueryBuilder.searchPlaceholder', { ns: 'components' })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="community-tag-vote-popup__scroll">
            {isLoading ? (
              <p className="community-tag-vote-popup__empty">
                {t('loading.generic', { ns: 'common' })}
              </p>
            ) : filteredTags.length === 0 ? (
              <p className="community-tag-vote-popup__empty">
                {t('facetQueryBuilder.pickerEmpty', { ns: 'components' })}
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.name || 'ungrouped'} className="community-tag-vote-popup__group">
                  {group.name ? (
                    <h4 className="community-tag-vote-popup__group-title">{group.name}</h4>
                  ) : null}
                  <div className="community-tag-vote-popup__list">
                    {group.tags.map((tag) => {
                      const scoreLabel = formatCommunityTagScore(tag.score);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          data-tooltip-id={tooltipId}
                          data-tooltip-content={itemTooltip(tag)}
                          className={`community-tag-vote-popup__item${canVote ? ' available' : ''}${tag.voted ? ' voted' : ''}`}
                          style={{
                            '--tag-bg-color': `${tag.color}40`,
                            '--tag-border-color': tag.color,
                            '--tag-text-color': tag.color,
                          }}
                          disabled={!canVote || isVoting}
                          aria-pressed={Boolean(tag.voted)}
                          onClick={() => handleVote(tag)}
                        >
                          <span className="community-tag-vote-popup__icon">
                            <TagConfidenceBar score={tag.score} show>
                              {tag.icon ? (
                                <img src={tag.icon} alt="" />
                              ) : (
                                <span className="community-tag-vote-popup__letter">
                                  {String(tag.name || '?').charAt(0).toUpperCase()}
                                </span>
                              )}
                            </TagConfidenceBar>
                          </span>
                          <span className="community-tag-vote-popup__name">{tag.name}</span>
                          {scoreLabel ? (
                            <span className="community-tag-vote-popup__score">{scoreLabel}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <Tooltip id={tooltipId} place="bottom" noArrow style={{ zIndex: 10001 }} />
      </div>
    </Portal>
  );
}
