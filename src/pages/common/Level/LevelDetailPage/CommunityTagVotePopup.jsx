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
import { communityTagHoverTitle, formatCommunityTagScore, groupTagsByGroup } from '@/utils/communityTags';
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
  const [chartCleared, setChartCleared] = useState(true);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);

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
      setChartCleared(response.data?.chartCleared !== false);
    } catch (error) {
      console.error('Error fetching community tags:', error);
      toast.error(t('errors.generic', { ns: 'common' }));
      setTags([]);
    } finally {
      setIsLoading(false);
    }
  }, [levelId, t]);

  useEffect(() => {
    loadTags();
  }, [loadTags, user?.id]);

  const filteredTags = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return tags;
    return tags.filter((tag) => {
      const name = String(tag.name || '').toLowerCase();
      const description = String(tag.description || '').toLowerCase();
      return name.includes(q) || description.includes(q);
    });
  }, [tags, search]);

  const groups = useMemo(() => groupTagsByGroup(filteredTags), [filteredTags]);

  const blockReasonLabel = (reason) => {
    if (!reason) return '';
    const reasonKeys = {
      login: 'loginRequired',
      banned: 'banned',
      uncleared: 'uncleared',
      topPlay: 'topPlay',
      mustClear: 'mustClear',
      band: 'band',
      deleted: 'deleted',
    };
    const suffix = reasonKeys[reason] || reason;
    const key = `levelDetail.tags.vote.${suffix}`;
    const translated = t(key);
    return translated === key ? t('levelDetail.tags.vote.failed') : translated;
  };

  const voteButtonTooltip = (tag, direction) => {
    if (disabled) return t('levelDetail.tags.vote.deleted');
    if (tag.voteBlockReason) return blockReasonLabel(tag.voteBlockReason);
    if (tag.voteDirection === direction) return t('levelDetail.tags.vote.unvote');
    return direction === 1
      ? t('levelDetail.tags.vote.upvote')
      : t('levelDetail.tags.vote.downvote');
  };

  const handleVote = async (tag, requestedAction) => {
    if (!tag.canVote || isVoting || disabled) return;
    const current = tag.voteDirection;
    let action = requestedAction;
    if (requestedAction === 'upvote' && current === 1) action = 'unvote';
    if (requestedAction === 'downvote' && current === -1) action = 'unvote';
    setIsVoting(true);
    try {
      const response = await api.put(
        routes.database.levels.communityTagVote(levelId, tag.id),
        { action },
      );
      setTags(response.data?.tags || []);
      if (typeof response.data?.chartCleared === 'boolean') {
        setChartCleared(response.data.chartCleared);
      }
      const toastKey =
        action === 'upvote'
          ? 'levelDetail.tags.vote.upvoted'
          : action === 'downvote'
            ? 'levelDetail.tags.vote.downvoted'
            : 'levelDetail.tags.vote.unvoted';
      toast.success(t(toastKey, { tag: tag.name }));
      if (onAssignedTagsChange) {
        const assignedResponse = await api.get(routes.database.difficulties.levelTags(levelId));
        onAssignedTagsChange(assignedResponse.data || []);
      }
    } catch (error) {
      console.error('Error toggling community tag vote:', error);
      const reason = error.response?.data?.reason;
      if (reason) {
        toast.error(blockReasonLabel(reason));
      } else if (error.response?.status === 401) {
        toast.error(t('levelDetail.tags.vote.loginRequired'));
      } else if (error.response?.status === 403) {
        toast.error(t('levelDetail.tags.vote.banned'));
      } else {
        toast.error(t('levelDetail.tags.vote.failed'));
      }
    } finally {
      setIsVoting(false);
    }
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
          {!chartCleared ? (
            <p className="community-tag-vote-popup__banner">
              {t('levelDetail.tags.vote.uncleared')}
            </p>
          ) : null}
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
                      const canVote = Boolean(tag.canVote) && !disabled && !isVoting;
                      return (
                        <div
                          key={tag.id}
                          className={`community-tag-vote-popup__item${canVote ? ' available' : ''}${tag.voteDirection === 1 ? ' upvoted' : ''}${tag.voteDirection === -1 ? ' downvoted' : ''}`}
                          style={{
                            '--tag-bg-color': `${tag.color}40`,
                            '--tag-border-color': tag.color,
                            '--tag-text-color': tag.color,
                          }}
                        >
                          <span
                            className="community-tag-vote-popup__icon"
                            data-letter-only={!tag.icon}
                            title={communityTagHoverTitle(tag)}
                          >
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
                          <span
                            className="community-tag-vote-popup__name"
                            title={communityTagHoverTitle(tag)}
                          >
                            {tag.name}
                          </span>
                          {scoreLabel ? (
                            <span className="community-tag-vote-popup__score">{scoreLabel}</span>
                          ) : null}
                          <div className="community-tag-vote-popup__votes">
                            <button
                              type="button"
                              className={`community-tag-vote-popup__vote community-tag-vote-popup__vote--up${tag.voteDirection === 1 ? ' active' : ''}`}
                              data-tooltip-id={tooltipId}
                              data-tooltip-content={voteButtonTooltip(tag, 1)}
                              disabled={!canVote}
                              aria-pressed={tag.voteDirection === 1}
                              aria-label={t('levelDetail.tags.vote.upvote')}
                              onClick={() => handleVote(tag, 'upvote')}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              className={`community-tag-vote-popup__vote community-tag-vote-popup__vote--down${tag.voteDirection === -1 ? ' active' : ''}`}
                              data-tooltip-id={tooltipId}
                              data-tooltip-content={voteButtonTooltip(tag, -1)}
                              disabled={!canVote}
                              aria-pressed={tag.voteDirection === -1}
                              aria-label={t('levelDetail.tags.vote.downvote')}
                              onClick={() => handleVote(tag, 'downvote')}
                            >
                              ▼
                            </button>
                          </div>
                        </div>
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
