// tuf-search: #LikeButton #likeButton #buttons
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { LikeIcon } from '@/components/common/icons';
import './likebutton.css';

/**
 * Count + heart like control. Parents pass the PUT via onRequest;
 * this component owns optimistic state, login gating, and toasts.
 */
export default function LikeButton({
  liked = false,
  count = 0,
  onRequest,
  onChange,
  className = '',
  iconSize = 22,
  stopPropagation = false,
  invisibleWhenEmpty = false,
  disabled = false,
}) {
  const { user } = useAuth();
  const { t } = useTranslation('common');
  const [isLiked, setIsLiked] = useState(Boolean(liked));
  const [likeCount, setLikeCount] = useState(Number(count) || 0);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    setIsLiked(Boolean(liked));
    setLikeCount(Number(count) || 0);
  }, [liked, count]);

  const handleToggle = async (event) => {
    if (stopPropagation) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
    }
    if (!user) {
      toast.error(t('like.loginRequired'));
      return;
    }
    if (isLiking || disabled || !onRequest) return;

    const action = isLiked ? 'unlike' : 'like';
    const prevLiked = isLiked;
    const prevCount = likeCount;
    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, (prevCount ?? 0) + (action === 'like' ? 1 : -1));

    setIsLiked(nextLiked);
    setLikeCount(nextCount);
    onChange?.({ liked: nextLiked, count: nextCount });
    setIsLiking(true);

    try {
      const result = await onRequest(action);
      if (result && result.success === false) {
        throw new Error('like failed');
      }
      const resolvedCount = result?.likes !== undefined ? result.likes : nextCount;
      if (result?.likes !== undefined) setLikeCount(result.likes);
      onChange?.({ liked: nextLiked, count: resolvedCount });
      toast.success(action === 'like' ? t('like.liked') : t('like.unliked'));
    } catch {
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
      onChange?.({ liked: prevLiked, count: prevCount });
      toast.error(t('like.failed'));
    } finally {
      setIsLiking(false);
    }
  };

  const hidden = invisibleWhenEmpty && !likeCount;
  const classes = ['tuf-like', isLiked ? 'liked' : '', className].filter(Boolean).join(' ');
  const countNode = <span className="tuf-like__count">{likeCount || 0}</span>;
  const iconNode = <LikeIcon size={iconSize} />;

  if (!user) {
    return (
      <div
        className={`${classes} tuf-like--static`.trim()}
        data-opacity={hidden ? 0 : 1}
      >
        {countNode}
        {iconNode}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      data-opacity={hidden ? 0 : 1}
      onClick={handleToggle}
      disabled={isLiking || disabled}
      aria-pressed={isLiked}
      aria-label={isLiked ? t('like.unlike') : t('like.like')}
    >
      {countNode}
      {iconNode}
    </button>
  );
}
