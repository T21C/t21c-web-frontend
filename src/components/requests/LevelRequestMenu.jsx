import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { PopupShell } from '@/components/common/PopupShell';
import { CloseButton } from '@/components/common/buttons';
import { RefreshIcon } from '@/components/common/icons';
import { REQUEST_TYPES, requestErrorMessage, userCanEditLevel } from './levelRequestShared';
import LevelRequestFormPopup from './LevelRequestFormPopup';
import './levelRequests.css';

const LevelRequestMenu = ({ level, user }) => {
  const { t } = useTranslation('pages');
  const [open, setOpen] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [formType, setFormType] = useState(null);

  useEffect(() => {
    if (!open || !level?.id) return undefined;
    let cancelled = false;
    api.get(routes.database.levelRequests.eligibility(level.id))
      .then((response) => {
        if (!cancelled) setEligibility(response.data || {});
      })
      .catch((err) => {
        if (!cancelled) toast.error(requestErrorMessage(t, err));
      });
    return () => {
      cancelled = true;
    };
  }, [open, level?.id, t]);

  if (!user || !level?.id) return null;

  const choose = (type) => {
    const gate = eligibility?.[type];
    if (gate && !gate.allowed) {
      toast.error(t(`levelRequests.errors.${gate.code}`, { defaultValue: t('levelRequests.errors.generic') }));
      return;
    }
    setFormType(type);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="svg-stroke"
        onClick={() => setOpen(true)}
        title={t('levelRequests.menu')}
        aria-label={t('levelRequests.menu')}
      >
        <RefreshIcon color="#ffffff" size="28px" />
      </button>
      {open && !formType && (
        <PopupShell onClose={() => setOpen(false)} panelClassName="level-requests level-requests__popup level-requests__popup--menu">
          <CloseButton variant="floating" onClick={() => setOpen(false)} />
          <div className="popup-header">
            <h2>{t('levelRequests.menu')}</h2>
          </div>
          <div className="level-requests__choices">
            {REQUEST_TYPES.map((type) => (
              <button key={type} type="button" className="level-requests__choice" onClick={() => choose(type)} disabled={!eligibility}>
                {t(`levelRequests.types.${type}`)}
              </button>
            ))}
          </div>
        </PopupShell>
      )}
      {formType && (
        <LevelRequestFormPopup
          levelId={level.id}
          type={formType}
          level={level}
          levelTags={level.tags}
          canEditChart={userCanEditLevel(user, level)}
          onClose={() => setFormType(null)}
        />
      )}
    </>
  );
};

export default LevelRequestMenu;
