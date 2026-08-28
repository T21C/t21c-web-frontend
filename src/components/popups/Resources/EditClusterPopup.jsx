import { useMemo, useState } from 'react';
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

const EditClusterPopup = ({ cluster, onClose, onUpdate, onDelete, onClusterChange }) => {
  const { t } = useTranslation(['pages', 'common']);
  const { user } = useAuth();
  const isAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);
  const [name, setName] = useState(cluster.name || '');
  const [description, setDescription] = useState(cluster.description || '');
  const [iconUrl, setIconUrl] = useState(cluster.iconUrl || '');
  const [viewMode, setViewMode] = useState(cluster.viewMode);
  const [isPinned, setIsPinned] = useState(Boolean(cluster.isPinned));
  const [isOfficial, setIsOfficial] = useState(Boolean(cluster.isOfficial));
  const [saving, setSaving] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [showImageSelector, setShowImageSelector] = useState(false);

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

  const applyCluster = (data) => {
    if (!data) return;
    setIconUrl(data.iconUrl || '');
    onClusterChange?.(data);
  };

  const handleIconUpload = async (file) => {
    setUploadingIcon(true);
    try {
      const formData = new FormData();
      formData.append('icon', file);
      const { data } = await api.post(routes.usefulLinkClusters.icon(cluster.id), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      applyCluster(data);
      toast.success(t('resources.clusters.icon.uploaded'));
    } catch (error) {
      toast.error(getCdnErrorMessage(error, t('resources.clusters.icon.uploadFailed')));
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleIconRemove = async () => {
    setUploadingIcon(true);
    try {
      const { data } = await api.delete(routes.usefulLinkClusters.icon(cluster.id));
      applyCluster(data);
      toast.success(t('resources.clusters.icon.removed'));
    } catch (error) {
      toast.error(
        getRateLimitMessage(error) ||
          error?.response?.data?.error ||
          t('resources.clusters.icon.removeFailed'),
      );
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error(t('resources.clusters.create.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      await onUpdate({
        name: name.trim(),
        description,
        viewMode,
        ...(isAdmin ? { isPinned, isOfficial } : {}),
      });
      toast.success(t('resources.clusters.edit.updated'));
      onClose();
    } catch (error) {
      toast.error(
        getRateLimitMessage(error) ||
          error?.response?.data?.error ||
          t('resources.clusters.edit.updateFailed'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `${t('resources.clusters.edit.deleteMessage', { name: cluster.name })}\n\n${t(
        'resources.clusters.edit.deleteDescription',
      )}`,
    );
    if (!confirmed) return;
    setSaving(true);
    try {
      await onDelete();
      toast.success(t('resources.clusters.edit.deleted'));
      onClose();
    } catch (error) {
      toast.error(
        getRateLimitMessage(error) ||
          error?.response?.data?.error ||
          t('resources.clusters.edit.deleteFailed'),
      );
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || uploadingIcon;

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
          <h2>{t('resources.clusters.edit.title')}</h2>
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
                iconUrl ? ' resource-cluster-popup__icon-slot--filled' : ''
              }`}
              onClick={() => setShowImageSelector(true)}
              disabled={busy}
              aria-label={
                uploadingIcon
                  ? t('resources.clusters.icon.uploading')
                  : t('resources.clusters.icon.upload')
              }
            >
              {iconUrl ? <img src={iconUrl} alt="" /> : <PlusIcon size="1.5rem" />}
            </button>
            {iconUrl ? (
              <button
                type="button"
                className="btn-fill-danger resource-cluster-popup__icon-remove"
                onClick={handleIconRemove}
                disabled={busy}
                aria-label={
                  uploadingIcon
                    ? t('resources.clusters.icon.removing')
                    : t('resources.clusters.icon.remove')
                }
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
          <button type="button" className="btn-fill-danger" onClick={handleDelete} disabled={busy}>
            {t('buttons.delete', { ns: 'common' })}
          </button>
          <button type="button" className="btn-fill-secondary" onClick={onClose}>
            {t('buttons.cancel', { ns: 'common' })}
          </button>
          <button type="submit" className="btn-fill-primary" disabled={busy}>
            {t('resources.clusters.edit.updateButton')}
          </button>
        </div>
      </form>
      {showImageSelector ? (
        <ImageSelectorPopup
          isOpen={showImageSelector}
          onClose={() => setShowImageSelector(false)}
          onSave={handleIconUpload}
          currentAvatar={iconUrl}
          title={t('resources.clusters.icon.label')}
          outputFileName="cluster-icon.jpg"
        />
      ) : null}
    </div>
  );
};

export default EditClusterPopup;
