import { useNavigate } from "react-router-dom";
import "./packcard.css"
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { EditPackPopup } from "@/components/popups";
import { EditIcon, PinIcon, LockIcon, EyeIcon, LikeIcon } from "@/components/common/icons";
import toast from 'react-hot-toast';
import { usePackContext } from "@/contexts/PackContext";
import { UserAvatar } from "@/components/layout";
import { permissionFlags } from "@/utils/UserPermissions";
import { hasFlag } from "@/utils/UserPermissions";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { LinkIcon } from "@/components/common/icons/LinkIcon";
import { LevelPackViewModes } from "@/utils/constants";

const PackCard = ({
  index,
  packId,
  user,
  sortBy,
  displayMode = 'normal',
  size = 'medium'
}) => {
  const { t } = useTranslation('components');
  const tCard = (key) => t(`cards.pack.${key}`) || key;
  
  const [showEditPopup, setShowEditPopup] = useState(false);
  const { difficultyDict } = useDifficultyContext();
  const { toggleFavorite } = usePackContext();
  const navigate = useNavigate();
  const { packs, getPackById } = usePackContext();
  const [pack, setPack] = useState(getPackById(packId));


  const levelCount = pack.packItems.filter(item => item.type === 'level').length || 0;

  const isFavorited = pack.isFavorited;

  // Add effect to handle body overflow when edit popup is open
  useEffect(() => {
    if (showEditPopup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showEditPopup]);

  const handlePackClick = () => {
    // Use linkCode if available, otherwise fall back to numerical ID
    navigate(`/packs/${pack.id}`);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    setShowEditPopup(true);
  };

  const handleFavoriteClick = async (e) => {
    e.stopPropagation();

    if (!user) {
      toast.error('Please log in to favorite packs');
      return;
    }

    try {
      const { success, isFavorited } = await toggleFavorite(pack.id);
      if (success) {
      setPack(prevPack => ({
          ...prevPack,
          isFavorited: isFavorited,
          favoritesCount: isFavorited ? (pack.favoritesCount + 1) : (pack.favoritesCount - 1)
        }));
      }
      if (!success) {
        toast.error('Failed to update favorite status');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error(error.response?.data?.error || 'Failed to update favorite status');
    }
  };

  const getViewModeIcon = () => {
    switch (parseInt(pack.viewMode)) {
      case 1: // PUBLIC
        return <EyeIcon className="pack-view-icon public" />;
      case 2: // LINKONLY
        return <LinkIcon color="#db4" size={14} className="pack-view-icon linkonly" />;
      case 3: // PRIVATE
        return <LockIcon className="pack-view-icon private" />;
      case 4: // FORCED_PRIVATE
        return <LockIcon className="pack-view-icon forced-private" />;
      default:
        return <EyeIcon className="pack-view-icon public" />;
    }
  };

  const getViewModeText = () => {
    switch (parseInt(pack.viewMode)) {
      case LevelPackViewModes.PUBLIC: return tCard('viewMode.public');
      case LevelPackViewModes.LINKONLY: return tCard('viewMode.linkonly');
      case LevelPackViewModes.PRIVATE: return tCard('viewMode.private');
      case LevelPackViewModes.FORCED_PRIVATE: return tCard('viewMode.forcedPrivate');
      default: return tCard('viewMode.public');
    }
  };

  const canEdit = user && (
    pack.ownerId === user.id || 
    hasFlag(user, permissionFlags.SUPER_ADMIN)
  );

  const cardClasses = [
    'pack-card',
    `pack-card--${size}`,
    `pack-card--${displayMode}`,
    pack.isPinned ? 'pack-card--pinned' : '',
    pack.viewMode === LevelPackViewModes.FORCED_PRIVATE ? 'pack-card--forced-private' : ''
  ].filter(Boolean).join(' ');

  return (
    <>
      <div 
        className={cardClasses}
        onClick={handlePackClick}
        data-tooltip-id={`pack-tooltip-${pack.id}`}
        data-tooltip-content={`${tCard('clickToView')} ${pack.name}`}
      >
        <div className="pack-card__header">
          <div className="pack-card__icon">
            {pack.iconUrl ? (
              <img 
                src={pack.iconUrl} 
                alt={pack.name}
                className="pack-card__icon-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className="pack-card__icon-placeholder"
              style={{ display: pack.iconUrl ? 'none' : 'flex' }}
            >
              📦
            </div>
          </div>
          
          <div className="pack-card__info">
            <h3 className="pack-card__name">{pack.name}</h3>
            <div className="pack-card__meta">
              <span className="pack-card__level-count">
                {levelCount} {tCard('stats.levels')}
              </span>
              {pack.isPinned && (
                <PinIcon className="pack-card__pin-icon" />
              )}
            </div>
          </div>

          <div className="pack-card__actions">
            {canEdit && (
              <button
                className="pack-card__edit-btn"
                onClick={handleEditClick}
                data-tooltip-id={`pack-edit-tooltip-${pack.id}`}
                data-tooltip-content={tCard('edit')}
              >
                <EditIcon />
              </button>
            )}

              <button
                className='pack-card__favorite-btn'
                onClick={handleFavoriteClick}
                data-tooltip-id={`pack-favorite-tooltip-${pack.id}`}
                disabled={!user}
                data-tooltip-content={isFavorited ? tCard('removeFromFavorites') : tCard('addToFavorites')}
              >
                <LikeIcon color={isFavorited ? "#ffffff" : "none"} />
                <span className="pack-card__favorite-count">{pack.favoritesCount}</span>
              </button>
          </div>
        </div>

        <div className="pack-card__footer">
          <div className="pack-card__owner">
            <UserAvatar 
              primaryUrl={pack.packOwner?.avatarUrl || 'Unknown'} 
              className="pack-card__owner-avatar"
            />
            <span className="pack-card__owner-name">
              {pack.packOwner?.username || 'Unknown'}
            </span>
          </div>
          
          <div className="pack-card__view-mode">
            {getViewModeIcon()}
            <span className="pack-card__view-mode-text">
              {getViewModeText()}
            </span>
          </div>
        </div>

        {levelCount > 0 && (
          <div className="pack-card__preview">
            <div className="pack-card__preview-levels">
              {pack.packItems
                .filter(item => item.type === 'level')
                .slice(0, 3)
                .map((item, idx) => (
                  <div key={idx} className="pack-card__preview-level">
                    <span className="pack-card__preview-level-name">
                      <img className="pack-card__preview-level-icon" src={difficultyDict[item.referencedLevel?.diffId]?.icon} alt={item.referencedLevel?.song} />
                      <span className="pack-card__preview-level-name-text">{item.referencedLevel?.song || `Level ${item.levelId}`}</span>
                    </span>
                  </div>
                ))}
              {levelCount > 3 && (
                <div className="pack-card__preview-more">
                  +{levelCount - 3} {tCard('more')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showEditPopup && (
        <EditPackPopup
          pack={pack}
          onClose={() => setShowEditPopup(false)}
          onUpdate={(updatedPack) => {setPack({...pack, ...updatedPack})}}
        />
      )}
    </>
  );
};

export default PackCard;
