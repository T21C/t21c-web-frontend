// tuf-search: #ModReleasesSection
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { getRateLimitMessage } from '@/utils/rateLimitError';
import { getCdnErrorMessage } from '@/utils/uploadErrors';
import ModReleasePopup, { buildModReleaseBody } from './ModReleasePopup';

function apiError(error, fallback) {
  return getRateLimitMessage(error) || getCdnErrorMessage(error, fallback);
}

export default function ModReleasesSection({
  versions,
  versionsUrl,
  versionUrl,
  onModUpdate,
  listClassName = 'mods-page__version-list',
  badgeClassName = 'mods-page__release-badge',
  addButtonClassName = 'confirm-button',
  deleteButtonClassName = 'cancel-button',
  editButtonClassName = 'cancel-button',
}) {
  const { t } = useTranslation(['pages', 'common']);
  const [popup, setPopup] = useState(null);

  const applyResponse = (data) => {
    if (data?.mod) onModUpdate?.(data.mod);
  };

  const saveRelease = async ({ version, notes, releasedAt, githubUrl, file }) => {
    const body = buildModReleaseBody({ version, notes, releasedAt, githubUrl, file });
    try {
      if (popup?.release) {
        const { data } = await api.patch(versionUrl(popup.release.id), body);
        applyResponse(data);
        toast.success(t('mods.releases.updated'));
      } else {
        const { data } = await api.post(versionsUrl, body);
        applyResponse(data);
        toast.success(t('mods.releases.created'));
      }
      setPopup(null);
    } catch (error) {
      toast.error(
        apiError(
          error,
          popup?.release ? t('mods.releases.updateFailed') : t('mods.releases.createFailed'),
        ),
      );
      throw error;
    }
  };

  const deleteRelease = async (release) => {
    if (!window.confirm(t('mods.releases.deleteConfirm', { version: release.version }))) return;
    try {
      const { data } = await api.delete(versionUrl(release.id));
      applyResponse(data);
      toast.success(t('mods.releases.deleted'));
    } catch (error) {
      toast.error(apiError(error, t('mods.releases.deleteFailed')));
    }
  };

  return (
    <div className="mods-page__assign">
      <p className="mods-page__assign-title">{t('mods.releases.title')}</p>
      {(versions || []).length === 0 ? (
        <span className="mods-page__assign-empty">{t('mods.releases.empty')}</span>
      ) : (
        <ul className={listClassName}>
          {(versions || []).map((release) => (
            <li key={release.id}>
              <div className="mods-page__release-meta">
                <strong>{release.version}</strong>
                <span className={`${badgeClassName} ${badgeClassName}--${release.source || 'external'}`}>
                  {t(`mods.releases.sources.${release.source || 'external'}`)}
                </span>
              </div>
              <div className="mods-page__release-actions">
                <button
                  type="button"
                  className={editButtonClassName}
                  onClick={() => setPopup({ release })}
                >
                  {t('buttons.edit', { ns: 'common' })}
                </button>
                <button
                  type="button"
                  className={deleteButtonClassName}
                  onClick={() => void deleteRelease(release)}
                >
                  {t('buttons.delete', { ns: 'common' })}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className={addButtonClassName} onClick={() => setPopup({ release: null })}>
        {t('mods.releases.add')}
      </button>
      <ModReleasePopup
        key={popup ? String(popup.release?.id || 'new') : 'closed'}
        isOpen={Boolean(popup)}
        release={popup?.release || null}
        onClose={() => setPopup(null)}
        onSubmit={saveRelease}
      />
    </div>
  );
}
