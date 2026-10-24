// tuf-search: #PasswordStrength #passwordStrength #auth
import { useTranslation } from 'react-i18next';
import { PASSWORD_REQUIREMENT_IDS } from '@/utils/passwordPolicy';
import './passwordStrength.css';

function PasswordStrength({ evaluation }) {
  const { t } = useTranslation('common');
  if (!evaluation) return null;

  const commonState = evaluation.compositionValid
    ? (evaluation.common ? 'missing' : 'met')
    : 'idle';
  const commonLabel = commonState === 'idle'
    ? t('validation.password.commonIdle')
    : t('validation.password.common');

  return (
    <div className="password-strength">
      <div
        className={`password-strength__rating password-strength__rating--${evaluation.rating}`}
        aria-live="polite"
      >
        {t(`validation.password.rating.${evaluation.rating}`)}
      </div>
      <ul className="password-strength__requirements">
        {PASSWORD_REQUIREMENT_IDS.map((id) => {
          const met = evaluation.requirements[id].met;
          return (
            <li
              key={id}
              className={`password-strength__item password-strength__item--${met ? 'met' : 'missing'}`}
            >
              <span className="password-strength__marker" aria-hidden="true" />
              <span>{t(`validation.password.${id}`)}</span>
            </li>
          );
        })}
        <li className={`password-strength__item password-strength__item--${commonState}`}>
          <span className="password-strength__marker" aria-hidden="true" />
          <span>{commonLabel}</span>
        </li>
      </ul>
    </div>
  );
}

export default PasswordStrength;
