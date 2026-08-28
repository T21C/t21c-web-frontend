import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { CloseButton } from '@/components/common/buttons';
import { CustomSelect, ImageSelectorPopup } from '@/components/common/selectors';
import { PlusIcon, TrashIcon } from '@/components/common/icons';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { useAuth } from '@/contexts/AuthContext';
import { UsefulLinkClusterViewModes } from '@/utils/constants';
import { getRateLimitMessage } from '@/utils/rateLimitError';
import { getCdnErrorMessage } from '@/utils/uploadErrors';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import './clusterPopups.css';

const CreateClusterPopup = ({ onClose, onCreate }) => {
  const { t } = useTranslation(['pages', 'common']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconPreview, setIconPreview] = useState('');
  const [iconFile, setIconFile] = useState(null);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [viewMode, setViewMode] = useState(UsefulLinkClusterViewModes.PRIVATE);
  const [isPinned, setIsPinned] = useState(false);
  const [isOfficial, setIsOfficial] = useState(false);
  const [saving, setSaving] = useState(false);

  const viewModeOptions = useMemo(() => {
    const options = [
      { value: String(UsefulLinkClusterViewModes.LINKONLY), label: t('resources.viewMode.linkonly') },
      { value: String(UsefulLinkClusterViewModes.PRIVATE), label: t('resources.viewMode.private') },
    ];
    if (isAdmin) {
      options.unshift({
        value: String(UsefulLinkClusterViewModes.PUBLIC),
        label: t('resources.viewMode.public'),
      });
    }
    return options;
  }, [isAdmin, t]);

  const handleIconSelect = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setIconPreview(typeof event.target?.result === 'string' ? event.target.result : '');
        setIconFile(file);
        toast.success(t('resources.clusters.icon.selected'));
        resolve();
      };
      reader.onerror = () => {
        toast.error(t('resources.clusters.icon.uploadFailed'));
        reject(new Error('Failed to read icon'));
      };
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error(t('resources.clusters.create.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      const cluster = await onCreate({
        name: name.trim(),
        description,
        viewMode,
        ...(isAdmin ? { isPinned, isOfficial } : {}),
      });
      if (iconFile && cluster?.id) {
        try {
          const formData = new FormData();
          formData.append('icon', iconFile);
          await api.post(routes.usefulLinkClusters.icon(cluster.id), formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          toast.success(t('resources.clusters.icon.uploaded'));
        } catch (iconError) {
          toast.error(getCdnErrorMessage(iconError, t('resources.clusters.icon.uploadFailed')));
        }
      }
      toast.success(t('resources.clusters.create.created'));
      onClose();
      navigate(`/resources/${cluster.linkCode || cluster.id}`);
    } catch (error) {
      toast.error(
        getRateLimitMessage(error) ||
          error?.response?.data?.error ||
          t('resources.clusters.create.createFailed'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="resource-cluster-popup"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="resource-cluster-popup__content"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="resource-cluster-popup__header">
          <h2>{t('resources.clusters.create.title')}</h2>
          <CloseButton onClick={onClose} aria-label={t('buttons.close', { ns: 'common' })} />
        </div>
        <label>
          {t('resources.clusters.create.name')}
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={255} required />
        </label>
        <label>
          {t('resources.clusters.create.description')}
          <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <div className="resource-cluster-popup__icon">
          <span>{t('resources.clusters.icon.label')}</span>
          <div className="resource-cluster-popup__icon-row">
            <button
              type="button"
              className={`resource-cluster-popup__icon-slot${
                iconPreview ? ' resource-cluster-popup__icon-slot--filled' : ''
              }`}
              onClick={() => setShowImageSelector(true)}
              disabled={saving}
              aria-label={t('resources.clusters.icon.upload')}
            >
              {iconPreview ? <img src={iconPreview} alt="" /> : <PlusIcon size="1.5rem" />}
            </button>
            {iconPreview ? (
              <button
                type="button"
                className="btn-fill-danger resource-cluster-popup__icon-remove"
                onClick={() => {
                  setIconPreview('');
                  setIconFile(null);
                }}
                disabled={saving}
                aria-label={t('resources.clusters.icon.remove')}
              >
                <TrashIcon color="#fff" size="16px" />
              </button>
            ) : null}
          </div>
          <p className="resource-cluster-popup__help">{t('resources.clusters.icon.help')}</p>
        </div>
        <label>
          {t('resources.clusters.create.viewMode')}
          <CustomSelect
            options={viewModeOptions}
            value={viewModeOptions.find((option) => option.value === String(viewMode))}
            onChange={(option) => setViewMode(Number(option?.value))}
            width="100%"
          />
        </label>
        {isAdmin ? (
          <>
            <label className="resource-cluster-popup__check">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(event) => setIsPinned(event.target.checked)}
              />
              <span>{t('resources.clusters.edit.pin')}</span>
            </label>
            <label className="resource-cluster-popup__check">
              <input
                type="checkbox"
                checked={isOfficial}
                onChange={(event) => setIsOfficial(event.target.checked)}
              />
              <span>{t('resources.clusters.edit.official')}</span>
            </label>
          </>
        ) : null}
        <div className="resource-cluster-popup__actions">
          <button type="button" className="btn-fill-secondary" onClick={onClose}>
            {t('buttons.cancel', { ns: 'common' })}
          </button>
          <button type="submit" className="btn-fill-primary" disabled={saving}>
            {t('resources.clusters.create.createButton')}
          </button>
        </div>
      </form>
      {showImageSelector ? (
        <ImageSelectorPopup
          isOpen={showImageSelector}
          onClose={() => setShowImageSelector(false)}
          onSave={handleIconSelect}
          currentAvatar={iconPreview}
          title={t('resources.clusters.icon.label')}
          outputFileName="cluster-icon.jpg"
        />
      ) : null}
    </div>
  );
};

export default CreateClusterPopup;
