import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { PopupShell } from '@/components/common/PopupShell';
import { CloseButton } from '@/components/common/buttons';
import { useUnsavedClose } from '@/hooks/useUnsavedClose';
import { requestErrorMessage } from './levelRequestShared';

const LevelRequestStatusPopup = ({ request, onClose, onSaved }) => {
  const { t } = useTranslation('pages');
  const initialPublicNote = request.publicNote || '';
  const initialInternalNote = request.internalNote || '';
  const [publicNote, setPublicNote] = useState(initialPublicNote);
  const [internalNote, setInternalNote] = useState(initialInternalNote);
  const [saving, setSaving] = useState(false);
  const isDirty = useMemo(
    () => publicNote !== initialPublicNote || internalNote !== initialInternalNote,
    [publicNote, internalNote, initialPublicNote, initialInternalNote],
  );
  const { requestClose } = useUnsavedClose({ isDirty, onClose });

  const save = async () => {
    setSaving(true);
    try {
      const response = await api.patch(routes.database.levelRequests.staff(request.id), {
        publicNote,
        internalNote,
      });
      toast.success(t('levelRequests.statusPopup.saved'));
      onSaved?.(response.data?.request);
      onClose();
    } catch (err) {
      toast.error(requestErrorMessage(t, err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PopupShell onClose={requestClose} closeDisabled={saving} panelClassName="level-requests level-requests__popup">
      <CloseButton variant="floating" onClick={requestClose} />
      <h2>{t('levelRequests.statusPopup.title')}</h2>
      <div className="level-requests__form">
        <label className="level-requests__field">
          <span>{t('levelRequests.statusPopup.publicNote')}</span>
          <textarea value={publicNote} maxLength={1000} onChange={(event) => setPublicNote(event.target.value)} />
        </label>
        <label className="level-requests__field">
          <span>{t('levelRequests.statusPopup.internalNote')}</span>
          <textarea value={internalNote} maxLength={1000} onChange={(event) => setInternalNote(event.target.value)} />
        </label>
        <div className="level-requests__actions">
          <button type="button" className="level-requests__button level-requests__button--primary" onClick={save} disabled={saving}>
            {saving ? t('levelRequests.form.submitting') : t('levelRequests.statusPopup.save')}
          </button>
        </div>
      </div>
    </PopupShell>
  );
};

export default LevelRequestStatusPopup;
