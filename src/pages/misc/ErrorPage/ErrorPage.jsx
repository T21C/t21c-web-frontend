// tuf-search: #ErrorPage #errorPage #error
import './errorpage.css';

function formatErrorMessage(error) {
  if (!error) return 'An unexpected error occurred.';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  return String(error);
}

function formatStack(error, componentStack) {
  const parts = [];
  if (error?.stack) parts.push(error.stack);
  if (componentStack) {
    parts.push('Component stack:', componentStack.trim());
  }
  return parts.join('\n\n') || 'No stack trace available.';
}

/**
 * Sentry.ErrorBoundary fallback — receives { error, componentStack, eventId, resetError }.
 */
export default function ErrorPage({ error, componentStack, eventId, resetError }) {
  const message = formatErrorMessage(error);
  const stack = formatStack(error, componentStack);

  const handleReload = () => {
    window.location.href = '/';
  };

  return (
    <div className="error-page">
      <div className="error-page__content">
        <p className="error-page__eyebrow">Something went wrong</p>
        <h1 className="error-page__title">Unexpected error</h1>
        <p className="error-page__notice">
          The developer has been notified. You can try again or navigate to home.
        </p>

        <div className="error-page__summary">
          <p className="error-page__summary-label">What went wrong</p>
          <p className="error-page__summary-message">{message}</p>
          {eventId ? (
            <p className="error-page__event-id">
              Report ID: <code>{eventId}</code>
            </p>
          ) : null}
        </div>

        <details className="error-page__details">
          <summary>Technical details</summary>
          <pre className="error-page__stack">{stack}</pre>
        </details>

        <div className="error-page__actions">
          {typeof resetError === 'function' ? (
            <button
              type="button"
              className="error-page__btn btn-fill-primary"
              onClick={resetError}
            >
              Try again
            </button>
          ) : null}
          <button
            type="button"
            className="error-page__btn btn-fill-neutral"
            onClick={handleReload}
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
