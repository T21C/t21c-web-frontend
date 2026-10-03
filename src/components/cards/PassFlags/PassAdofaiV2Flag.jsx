// tuf-search: #PassAdofaiV2Flag #adofaiV2 #cards
import { useId } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { AdofaiIcon } from '@/components/common/icons';
import { Tooltip } from '@/components/common/display/Tooltip';
import './passAdofaiVersionFlag.css';

function VersionIcon() {
  return <AdofaiIcon size={14} color="currentColor" rotation={-20} aria-hidden />;
}

const TOOLTIP_KEYS = {
  v2: 'cards.pass.flags.adofaiV2Tooltip',
  pre340: 'cards.pass.flags.adofaiPre340Tooltip',
};

const tooltipStyle = {
  maxWidth: '320px',
  zIndex: 100,
  background: 'var(--color-black)',
};

export function AdofaiVersionFlagTooltip({
  variant,
  className = '',
  tooltipKey,
  tooltipNs = 'components',
  children,
}) {
  const tooltipId = `adofai-version-${variant}-${useId().replace(/:/g, '')}`;
  const key = tooltipKey || TOOLTIP_KEYS[variant];

  return (
    <>
      <span
        className={['pass-adofai-version-flag', className].filter(Boolean).join(' ')}
        data-tooltip-id={tooltipId}
      >
        {children}
      </span>
      <Tooltip
        className="tooltip"
        id={tooltipId}
        place="bottom"
        effect="solid"
        style={tooltipStyle}
      >
        <Trans i18nKey={key} ns={tooltipNs} components={{ b: <b /> }} />
      </Tooltip>
    </>
  );
}

const PassAdofaiV2Flag = ({
  className = 'flag',
  i18nKey = 'cards.pass.flags.adofaiV2',
  ns = 'components',
  tooltipKey,
  tooltipNs,
}) => (
  <AdofaiVersionFlagTooltip
    variant="v2"
    className={className}
    tooltipKey={tooltipKey}
    tooltipNs={tooltipNs}
  >
    <Trans i18nKey={i18nKey} ns={ns} components={{ adofaiicon: <VersionIcon /> }} />
  </AdofaiVersionFlagTooltip>
);

export function PassAdofaiPre340Flag({
  className = 'flag',
  i18nKey = 'cards.pass.flags.adofaiPre340',
  ns = 'components',
  tooltipKey,
  tooltipNs,
}) {
  const { t } = useTranslation(ns);

  return (
    <AdofaiVersionFlagTooltip
      variant="pre340"
      className={className}
      tooltipKey={tooltipKey}
      tooltipNs={tooltipNs}
    >
      <VersionIcon />
      {t(i18nKey)}
    </AdofaiVersionFlagTooltip>
  );
}

export default PassAdofaiV2Flag;
