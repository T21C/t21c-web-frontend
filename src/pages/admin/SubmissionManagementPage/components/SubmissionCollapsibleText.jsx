// tuf-search: #SubmissionCollapsibleText #submissionCollapsibleText #admin #submissionManagement
import { useLayoutEffect, useRef, useState } from 'react';
import { Collapsible, CollapsibleTrigger } from '@/components/common/Collapsible';

/** Matches --submission-text-peek. About two lines, enough to see if the text matters. */
const PEEK_REM = 3.6;

function peekLimitPx() {
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return (Number.isFinite(root) ? root : 16) * PEEK_REM;
}

/**
 * Free-text disclosure for submission cards (details, notes, feeling explanation).
 * Collapsed text keeps a short preview. The rest opens only when it does not fit.
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
  const bodyRef = useRef(null);
  const [overflows, setOverflows] = useState(false);
  const rootClass = ['submission-collapsible-text', overflows && 'is-overflowing', className]
    .filter(Boolean)
    .join(' ');

  useLayoutEffect(() => {
    const node = bodyRef.current;
    if (!node) {
      setOverflows((prev) => (prev ? false : prev));
      return undefined;
    }
    const measure = () => {
      const next = node.scrollHeight > peekLimitPx() + 2;
      setOverflows((prev) => (prev === next ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [empty, children, open]);

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
        {overflows ? (
          <CollapsibleTrigger preset="chevron" className="submission-collapsible-text__trigger">
            <span className="detail-label">{label}</span>
          </CollapsibleTrigger>
        ) : (
          <span className="detail-label">{label}</span>
        )}
        {actions ? <div className="submission-collapsible-text__actions">{actions}</div> : null}
      </div>
      <div className="submission-collapsible-text__body" ref={bodyRef}>
        {children}
      </div>
    </Collapsible>
  );
}
