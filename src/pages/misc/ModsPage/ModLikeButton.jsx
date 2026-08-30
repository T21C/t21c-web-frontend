import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { useAuth } from '@/contexts/AuthContext';
import { LikeIcon } from '@/components/common/icons';

const ModLikeButton = ({ mod, onLikesChange, className = '' }) => {
  const { user } = useAuth();
  const { t } = useTranslation('pages');
  const [isLiked, setIsLiked] = useState(Boolean(mod?.isLiked));
  const [likeCount, setLikeCount] = useState(Number(mod?.likes || 0));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setIsLiked(Boolean(mod?.isLiked));
    setLikeCount(Number(mod?.likes || 0));
  }, [mod?.id, mod?.slug, mod?.likes, mod?.isLiked]);

  const toggle = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!user) {
      toast.error(t('mods.like.loginRequired'));
      return;
    }
    if (busy || !mod?.slug) return;
    const action = isLiked ? 'unlike' : 'like';
    const prevLiked = isLiked;
    const prevCount = likeCount;
    setIsLiked(!prevLiked);
    setLikeCount(Math.max(0, prevCount + (action === 'like' ? 1 : -1)));
    setBusy(true);
    try {
      const { data } = await api.put(routes.mods.like(mod.slug), { action });
      if (data?.likes != null) {
        setLikeCount(data.likes);
        onLikesChange?.(data.likes, action === 'like');
      }
    } catch (error) {
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
      toast.error(error?.response?.data?.error || t('mods.like.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`mods-page__like ${isLiked ? 'is-liked' : ''} ${className}`.trim()}
      onClick={toggle}
      aria-pressed={isLiked}
      aria-label={t('mods.like.label')}
    >
      <LikeIcon size={16} color={isLiked ? 'var(--btn-danger)' : 'currentColor'} />
      <span>{likeCount}</span>
    </button>
  );
};

export default ModLikeButton;
