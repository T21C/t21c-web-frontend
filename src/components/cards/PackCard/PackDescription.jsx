// tuf-search: #PackDescription #packDescription #pack #description
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  useCollapsible,
} from '@/components/common/Collapsible';
import './packDescription.css';

function PackDescriptionTriggerLabel() {
  const { t } = useTranslation('pages');
  const { open } = useCollapsible();

  return (
    <span className="pack-description__label">
      {open
        ? t('packDetail.description.showLess')
        : t('packDetail.description.readMore')}
    </span>
  );
}

const PackDescription = ({
  description,
  variant = 'detail',
  footer = null,
  itemCount = 0,
}) => {
  const text = typeof description === 'string' ? description.trim() : '';
  const disableAnimation = itemCount > 50;

  if (variant === 'card') {
    if (!text) return null;
    return (
      <p className="pack-description pack-description--card">
        {text}
      </p>
    );
  }

  if (!text && !footer) return null;

  return (
    <div
      className={[
        'pack-description',
        'pack-description--detail',
        !text && 'pack-description--meta-only',
        disableAnimation && 'pack-description--no-animation',
      ].filter(Boolean).join(' ')}
    >
      <Collapsible
        defaultOpen={false}
        fade={false}
        duration={disableAnimation ? '0s' : '0.35s'}
        className="pack-description__collapsible"
      >
        <div className="pack-description__trigger-spacer" aria-hidden="true" />

        <CollapsibleTrigger
          preset="chevron"
          className="pack-description__trigger"
        >
          <PackDescriptionTriggerLabel />
        </CollapsibleTrigger>

        <CollapsibleContent className="pack-description__content-region">
          <div className="pack-description__body">
            {text ? (
              <p className="pack-description__text">{text}</p>
            ) : null}

            {footer ? (
              <div className="pack-description__footer">
                {footer}
              </div>
            ) : null}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

PackDescription.propTypes = {
  description: PropTypes.string,
  variant: PropTypes.oneOf(['detail', 'card']),
  footer: PropTypes.node,
  itemCount: PropTypes.number,
};

export default PackDescription;
