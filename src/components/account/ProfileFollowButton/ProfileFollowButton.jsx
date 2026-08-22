// tuf-search: #ProfileFollowButton #profileFollowButton #account
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { BellIcon } from '@/components/common/icons';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';

const ProfileFollowButton = ({ following = false, followRoute, onFollowChange }) => {
  const { t } = useTranslation('pages');
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(Boolean(following));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setIsFollowing(Boolean(following));
  }, [following]);

  const label = isFollowing ? t('profile.following') : t('profile.follow');

  const handleClick = async () => {
    if (!user) {
      toast.error(t('profile.followLogin'));
      return;
    }
    if (saving) return;
    const next = !isFollowing;
    setIsFollowing(next);
    setSaving(true);
    try {
      const { data } = await api.put(followRoute, { following: next });
      const resolvedFollowing = Boolean(data?.following);
      setIsFollowing(resolvedFollowing);
      onFollowChange?.({
        following: resolvedFollowing,
        followerCount: data?.followerCount,
      });
    } catch {
      setIsFollowing(!next);
      toast.error(t('profile.followError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      className={`profile-header__action-btn${isFollowing ? ' profile-header__action-btn--following' : ''}`}
      onClick={handleClick}
      title={label}
      aria-label={label}
      aria-pressed={isFollowing}
      disabled={saving}
    >
      <BellIcon color="currentColor" size={28} />
    </button>
  );
};

export default ProfileFollowButton;
