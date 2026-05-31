// tuf-search: #PassAdofaiV2Flag #adofaiV2 #cards
import { Trans } from 'react-i18next';
import { AdofaiIcon } from '@/components/common/icons';

const adofaiV2TransComponents = {
  adofaiicon: <AdofaiIcon size={14} color="currentColor" rotation={-20} aria-hidden />,
};

const PassAdofaiV2Flag = ({
  className = 'flag',
  i18nKey = 'cards.pass.flags.adofaiV2',
  ns = 'components',
  title,
}) => (
  <span className={className} title={title}>
    <Trans i18nKey={i18nKey} ns={ns} components={adofaiV2TransComponents} />
  </span>
);

export default PassAdofaiV2Flag;
