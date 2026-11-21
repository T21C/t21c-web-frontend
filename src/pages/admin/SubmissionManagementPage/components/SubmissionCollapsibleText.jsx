// tuf-search: #SubmissionCollapsibleText #submissionCollapsibleText #admin #submissionManagement
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/common/Collapsible';

/**
 * Compact disclosure for free-text that can grow very large (details, notes).
 * Empty values stay a single row. Text is mounted only while open.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {import('react').ReactNode} props.children
 * @param {boolean} [props.empty]
 * @param {import('react').ReactNode} [props.emptyLabel]
 * @param {string} [props.className]
 * @param {import('react').ReactNode} [props.actions]
 * @param {boolean} [props.open]
 * @param {boolean} [props.defaultOpen]
 * @param {(open: boolean) => void} [props.onOpenChange]
 */
export default function SubmissionCollapsibleText({
  label,
  children,
  empty = false,
  emptyLabel = null,
  className = '',
  actions = null,
  open,
  defaultOpen = false,
  onOpenChange,
}) {
  const rootClass = ['submission-collapsible-text', className].filter(Boolean).join(' ');

  if (empty) {
    return (
      <div className={`${rootClass} submission-collapsible-text--empty`}>
        <div className="submission-collapsible-text__header">
          <span className="detail-label">{label}</span>
          {emptyLabel ? <span className="detail-value-none">{emptyLabel}</span> : null}
          {actions ? <div className="submission-collapsible-text__actions">{actions}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <Collapsible
      className={rootClass}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      fade={false}
    >
      <div className="submission-collapsible-text__header">
        <CollapsibleTrigger preset="chevron" className="submission-collapsible-text__trigger">
          <span className="detail-label">{label}</span>
        </CollapsibleTrigger>
        {actions ? <div className="submission-collapsible-text__actions">{actions}</div> : null}
      </div>
      <CollapsibleContent
        className="submission-collapsible-text__region"
        clipClassName="submission-collapsible-text__clip"
      >
        <div className="submission-collapsible-text__body">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
