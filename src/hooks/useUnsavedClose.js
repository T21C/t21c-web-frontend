// tuf-search: #useUnsavedClose
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export function useUnsavedClose({ isDirty, onClose }) {
  const { t } = useTranslation('common');

  const requestClose = useCallback(() => {
    if (isDirty && !window.confirm(t('confirmations.unsavedChanges'))) {
      return;
    }
    onClose();
  }, [isDirty, onClose, t]);

  return { requestClose };
}
