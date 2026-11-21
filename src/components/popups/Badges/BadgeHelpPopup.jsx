import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import SearchHelpPopup from '@/components/common/SearchHelpPopup';
import { CopyIcon } from '@/components/common/icons';
import { BADGE_HELP_SECTIONS } from './badgeHelpSections';
import { buildBadgeEngineMarkdown } from './badgeEngineMarkdown';

async function copyText(value) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {
    // Some browsers expose clipboard.writeText but reject it; fall back below.
  }
  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  document.body.appendChild(input);
  input.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(input);
  if (!ok) throw new Error('copy failed');
}

const BadgeHelpPopup = ({ onClose, defaultOpenSection = 'lists' }) => {
  const { t } = useTranslation('pages');

  const copyMarkdown = useCallback(async () => {
    try {
      await copyText(buildBadgeEngineMarkdown(t, BADGE_HELP_SECTIONS));
      toast.success(t('badges.help.copyMarkdownCopied'));
    } catch {
      toast.error(t('badges.help.copyMarkdownFailed'));
    }
  }, [t]);

  return (
    <SearchHelpPopup
      onClose={onClose}
      titleKey="badges.help.title"
      subtitleKey="badges.help.subtitle"
      closeButtonKey="badges.help.close"
      examplesTitleKey="badges.help.examplesTitle"
      sections={BADGE_HELP_SECTIONS}
      defaultOpenSection={defaultOpenSection}
      translationNs="pages"
      headerActions={(
        <button
          type="button"
          className="btn-fill-secondary btn-sm"
          onClick={copyMarkdown}
          aria-label={t('badges.help.copyMarkdownAria')}
        >
          <CopyIcon size={16} color="currentColor" aria-hidden />
          {t('badges.help.copyMarkdown')}
        </button>
      )}
    />
  );
};

export default BadgeHelpPopup;
