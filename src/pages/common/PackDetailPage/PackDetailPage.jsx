import "./packdetailpage.css";
import { useEffect, useState, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CompleteNav } from "@/components/layout";
import { LevelCard } from "@/components/cards";
import { MetaTags } from "@/components/common/display";
import { ScrollButton } from "@/components/common/buttons";
import { EditIcon, PinIcon, LockIcon, EyeIcon, UsersIcon, ArrowIcon } from "@/components/common/icons";
import { EditPackPopup } from "@/components/popups";
import { useAuth } from "@/contexts/AuthContext";
import { PackContext } from "@/contexts/PackContext";
import api from "@/utils/api";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { UserAvatar } from "@/components/layout";
import { Tooltip } from "react-tooltip";
import toast from 'react-hot-toast';

const PackDetailPage = () => {
  const { t } = useTranslation('pages');
  const tPack = (key, params = {}) => t(`packDetail.${key}`, params);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const packContext = useContext(PackContext);
  const { updatePack } = packContext || { updatePack: null };
  
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const scrollRef = useRef(null);

  // Fetch pack details
  const fetchPack = async () => {
    try {
      setLoading(true);
      setError(false);
      
      const response = await api.get(`/v2/database/levels/packs/${id}`);
      setPack(response.data);
    } catch (error) {
      console.error('Error fetching pack:', error);
      setError(true);
      if (error.response?.status === 404) {
        toast.error(tPack('error.notFound'));
      } else if (error.response?.status === 403) {
        toast.error(tPack('error.accessDenied'));
      } else {
        toast.error(tPack('error.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPack();
    }
  }, [id]);

  // Handle edit pack
  const handleEditPack = async (updatedPack) => {
    // Update local pack state with the updated pack data
    setPack(updatedPack);
    setShowEditPopup(false);
    toast.success(tPack('edit.success'));
  };

  // Handle delete pack - navigate back to packs list
  const handleDeletePack = () => {
    navigate('/packs');
  };

  // Get view mode icon and text
  const getViewModeIcon = () => {
    if (!pack) return null;
    
    switch (pack.viewMode) {
      case 1: // PUBLIC
        return <EyeIcon className="pack-detail__view-icon public" />;
      case 2: // LINKONLY
        return <UsersIcon className="pack-detail__view-icon linkonly" />;
      case 3: // PRIVATE
        return <LockIcon className="pack-detail__view-icon private" />;
      case 4: // FORCED_PRIVATE
        return <LockIcon className="pack-detail__view-icon forced-private" />;
      default:
        return <EyeIcon className="pack-detail__view-icon public" />;
    }
  };

  const getViewModeText = () => {
    if (!pack) return '';
    
    switch (pack.viewMode) {
      case 1: return tPack('viewMode.public');
      case 2: return tPack('viewMode.linkonly');
      case 3: return tPack('viewMode.private');
      case 4: return tPack('viewMode.forcedPrivate');
      default: return tPack('viewMode.public');
    }
  };

  // Check if user can edit pack
  const canEdit = user && pack && (
    pack.packOwnerId === user.id || 
    hasFlag(user, permissionFlags.SUPER_ADMIN)
  );

  if (loading) {
    return (
      <div className="pack-detail-page">
        <CompleteNav />
        <div className="pack-detail-page__loading">
          <div className="pack-detail-page__loading-spinner"></div>
          <p>{tPack('loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="pack-detail-page">
        <CompleteNav />
        <div className="pack-detail-page__error">
          <h2>{tPack('error.title')}</h2>
          <p>{tPack('error.message')}</p>
          <button 
            className="pack-detail-page__retry-btn"
            onClick={fetchPack}
          >
            {tPack('error.retry')}
          </button>
          <button 
            className="pack-detail-page__back-btn"
            onClick={() => navigate('/packs')}
          >
            {tPack('backToPacks')}
          </button>
        </div>
      </div>
    );
  }

  const currentUrl = window.location.origin + location.pathname;

  return (
    <div className="pack-detail-page">
      <MetaTags 
        title={`${pack.name} - Pack - TUF`}
        description={`Level pack: ${pack.name} by ${pack.packOwner?.username || 'Unknown'}. Contains ${pack.packItems?.length || 0} levels.`}
        url={currentUrl}
      />
      
      <CompleteNav />
      
      <div className="pack-body">
        {/* Header */}
        <div className="pack-detail-page__header">
          <button 
            className="pack-detail-page__back-btn"
            onClick={() => navigate('/packs')}
          >
            <ArrowIcon />
            <span>{tPack('backToPacks')}</span>
          </button>

          <div className="pack-detail-page__title-section">
            <div className="pack-detail-page__icon">
              {pack.iconUrl ? (
                <img 
                  src={pack.iconUrl} 
                  alt={pack.name}
                  className="pack-detail-page__icon-img"
                />
              ) : (
                <div className="pack-detail-page__icon-placeholder">
                  📦
                </div>
              )}
            </div>
            
            <div className="pack-detail-page__title-content">
              <h1 className="pack-detail-page__title">
                {pack.name}
                {pack.isPinned && (
                  <PinIcon className="pack-detail-page__pinned-icon" />
                )}
              </h1>
              
              <div className="pack-detail-page__meta">
                <div className="pack-detail-page__owner">
                  <UserAvatar 
                    primaryUrl={pack.packOwner?.avatarUrl || 'Unknown'} 
                    className="pack-detail-page__owner-avatar"
                  />
                  <span className="pack-detail-page__owner-name">
                    {tPack('by')} {pack.packOwner?.username || 'Unknown'}
                  </span>
                </div>
                
                <div className="pack-detail-page__view-mode">
                  {getViewModeIcon()}
                  <span className="pack-detail-page__view-mode-text">
                    {getViewModeText()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="pack-detail-page__actions">
              <button
                className="pack-detail-page__edit-btn"
                onClick={() => setShowEditPopup(true)}
                data-tooltip-id="edit-pack-tooltip"
                data-tooltip-content={tPack('actions.edit')}
              >
                <EditIcon />
                <span>{tPack('actions.edit')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="pack-detail-page__stats">
          <div className="pack-detail-page__stat">
            <span className="pack-detail-page__stat-value">
              {pack.packItems?.length || 0}
            </span>
            <span className="pack-detail-page__stat-label">
              {tPack('stats.levels')}
            </span>
          </div>
          
          <div className="pack-detail-page__stat">
            <span className="pack-detail-page__stat-value">
              {new Date(pack.createdAt).toLocaleDateString()}
            </span>
            <span className="pack-detail-page__stat-label">
              {tPack('stats.created')}
            </span>
          </div>
        </div>

        {/* Levels */}
        <div className="pack-detail-page__content" ref={scrollRef}>
          <div className="pack-detail-page__levels-header">
            <h2 className="pack-detail-page__levels-title">
              {tPack('levels.title')}
            </h2>
            <span className="pack-detail-page__levels-count">
              {pack.packItems?.length || 0} {tPack('levels.count')}
            </span>
          </div>

          {pack.packItems && pack.packItems.length > 0 ? (
            <div className="pack-detail-page__levels-list">
              {pack.packItems.map((item, index) => (
                <LevelCard
                  key={item.levelId}
                  index={index}
                  level={item.level}
                  user={user}
                  sortBy="RECENT"
                  displayMode="normal"
                  size="medium"
                />
              ))}
            </div>
          ) : (
            <div className="pack-detail-page__empty">
              <p>{tPack('levels.empty')}</p>
            </div>
          )}
        </div>

        <ScrollButton targetRef={scrollRef} />
      </div>

      {showEditPopup && (
        <EditPackPopup
          pack={pack}
          onClose={() => setShowEditPopup(false)}
          onUpdate={handleEditPack}
          onDelete={handleDeletePack}
        />
      )}

      {/* Tooltips */}
      <Tooltip id="edit-pack-tooltip" />
    </div>
  );
};

export default PackDetailPage;
