// tuf-search: #ProfileFollowButton #profileFollowButton #account
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { BellIcon } from '@/components/common/icons';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import './profileFollowButton.css';

const ProfileFollowButton = ({
  following = false,
  notifyLevel = null,
  followRoute,
  onFollowChange,
}) => {
  const { t } = useTranslation('pages');
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(Boolean(following));
  const [level, setLevel] = useState(notifyLevel === 'none' ? 'none' : following ? 'all' : null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    setIsFollowing(Boolean(following));
    setLevel(notifyLevel === 'none' ? 'none' : following ? 'all' : null);
  }, [following, notifyLevel]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  const applyState = (data) => {
    const resolvedFollowing = Boolean(data?.following);
    const resolvedLevel = resolvedFollowing
      ? (data?.notifyLevel === 'none' ? 'none' : 'all')
      : null;
    setIsFollowing(resolvedFollowing);
    setLevel(resolvedLevel);
    onFollowChange?.({
      following: resolvedFollowing,
      followerCount: data?.followerCount,
      notifyLevel: resolvedLevel,
    });
  };

  const save = async (body) => {
    if (!user) {
      toast.error(t('profile.followLogin'));
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const { data } = await api.put(followRoute, body);
      applyState(data);
      setMenuOpen(false);
    } catch {
      toast.error(t('profile.followError'));
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerClick = () => {
    if (!user) {
      toast.error(t('profile.followLogin'));
      return;
    }
    if (isFollowing) {
      setMenuOpen((open) => !open);
      return;
    }
    void save({ following: true, notifyLevel: 'all' });
  };

  const filled = isFollowing && level === 'all';
  const label = isFollowing
    ? (level === 'none' ? t('profile.followNotifyNone') : t('profile.following'))
    : t('profile.follow');

  return (
    <div className="profile-follow-button" ref={rootRef}>
      <button
        type="button"
        className={`profile-header__action-btn${filled ? ' profile-header__action-btn--following' : ''}${isFollowing && level === 'none' ? ' profile-follow-button__btn--silent' : ''}`}
        onClick={handleTriggerClick}
        title={label}
        aria-label={label}
        aria-pressed={isFollowing}
        aria-expanded={isFollowing ? menuOpen : undefined}
        disabled={saving}
      >
        <BellIcon
          color="currentColor"
          size={28}
          className={filled ? 'profile-follow-button__bell--filled' : ''}
        />
      </button>
      {menuOpen ? (
        <div className="profile-follow-button__menu" role="menu" aria-label={t('profile.followMenuAria')}>
          <button
            type="button"
            role="menuitem"
            className={`profile-follow-button__option${level === 'all' ? ' profile-follow-button__option--active' : ''}`}
            onClick={() => save({ following: true, notifyLevel: 'all' })}
            disabled={saving}
          >
            <BellIcon
              color="currentColor"
              size={18}
              className="profile-follow-button__bell--filled"
            />
            {t('profile.followNotifyAll')}
          </button>
          <button
            type="button"
            role="menuitem"
            className={`profile-follow-button__option${level === 'none' ? ' profile-follow-button__option--active' : ''}`}
            onClick={() => save({ following: true, notifyLevel: 'none' })}
            disabled={saving}
          >
            <BellIcon color="currentColor" size={18} />
            {t('profile.followNotifyNone')}
          </button>
          <button
            type="button"
            role="menuitem"
            className="profile-follow-button__option profile-follow-button__option--unfollow"
            onClick={() => save({ following: false })}
            disabled={saving}
          >
            <span className="profile-follow-button__slash-bell" aria-hidden="true">
              <BellIcon color="currentColor" size={18} />
            </span>
            {t('profile.unfollow')}
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default ProfileFollowButton;
