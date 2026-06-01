// tuf-search: #WorldsFirstFlag #worldsFirst #wf #cards
import { Tooltip } from 'react-tooltip';
import { useTranslation } from 'react-i18next';
import './worldsFirstFlag.css';

const FLAG_LABELS = {
  clear: 'WF',
  pp: 'WF PP',
};

const TOOLTIP_KEYS = {
  clear: 'cards.pass.flags.worldsFirstClearTooltip',
  pp: 'cards.pass.flags.worldsFirstPurePerfectTooltip',
};

export default function WorldsFirstFlag({ variant, tooltipIndex, className = '' }) {
  const { t } = useTranslation('components');
  const tooltipId = `worlds-first-flag-${tooltipIndex}-${variant}`;

  return (
    <>
      <span
        className={`worlds-first-flag worlds-first-flag--${variant} ${className}`.trim()}
        data-tooltip-id={tooltipId}
      >
        {FLAG_LABELS[variant]}
      </span>
      <Tooltip
        className="tooltip"
        id={tooltipId}
        place="top"
        effect="solid"
        style={{
          maxWidth: '280px',
          zIndex: 100,
          background: 'var(--color-black)',
        }}
      >
        {t(TOOLTIP_KEYS[variant])}
      </Tooltip>
    </>
  );
}