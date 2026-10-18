import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { PopupShell } from '@/components/common/PopupShell';
import { CloseButton } from '@/components/common/buttons';
import { InfoIcon, RefreshIcon, ShuffleIcon, SparkleIcon } from '@/components/common/icons';
import techIcon from '@/assets/icons/Tech RITKnew.png';
import { requestErrorMessage, userCanEditLevel } from './levelRequestShared';
import LevelRequestFormPopup from './LevelRequestFormPopup';
import './levelRequests.css';

const MENU_REQUEST_TYPES = ['rerate', 'info_change', 'tag', 'curation_rerate'];

const REQUEST_TYPE_ICONS = {
  rerate: <ShuffleIcon size={20} />,
  info_change: <InfoIcon size={20} color="currentColor" />,
  tag: <img src={techIcon} alt="" />,
  curation_rerate: <SparkleIcon size={20} />,
};

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
    if (gate?.code === 'open') return;
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
        onClick={() => {
          setEligibility(null);
          setOpen(true);
        }}
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
            {MENU_REQUEST_TYPES.map((type) => {
              const exists = eligibility?.[type]?.code === 'open';
              return (
                <button
                  key={type}
                  type="button"
                  className={`level-requests__choice${exists ? ' level-requests__choice--exists' : ''}`}
                  onClick={() => choose(type)}
                  disabled={!eligibility || exists}
                >
                  <span className="level-requests__choice-icon" aria-hidden="true">
                    {REQUEST_TYPE_ICONS[type]}
                  </span>
                  <span className="level-requests__choice-label">{t(`levelRequests.types.${type}`)}</span>
                  {exists && (
                    <span className="level-requests__choice-exists">{t('levelRequests.alreadyExists')}</span>
                  )}
                </button>
              );
            })}
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
