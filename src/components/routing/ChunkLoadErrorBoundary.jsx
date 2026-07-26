// tuf-search: #ChunkLoadErrorBoundary #chunkLoadErrorBoundary #routing
import { Component } from "react";

const RELOAD_GUARD_KEY = "tuf:chunk-load-reload";
const RELOAD_GUARD_MS = 15_000;

/**
 * Vite chunk filenames change on deploy. Stale tabs then fail dynamic imports
 * (e.g. SongDetailPage.*.js 404). Hard-reload once to pick up the new index.
 */
export function isChunkLoadError(error) {
  if (!error) return false;
  const name = String(error.name || "");
  const message = String(error.message || error);
  if (name === "ChunkLoadError") return true;
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk [\w-]+ failed/i.test(message) ||
    /Loading CSS chunk [\w-]+ failed/i.test(message) ||
    /Unable to preload CSS/i.test(message)
  );
}

function shouldHardReload() {
  try {
    const raw = sessionStorage.getItem(RELOAD_GUARD_KEY);
    const last = raw ? Number(raw) : 0;
    const now = Date.now();
    if (Number.isFinite(last) && now - last < RELOAD_GUARD_MS) {
      return false;
    }
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
    return true;
  } catch {
    return true;
  }
}

export class ChunkLoadErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (!isChunkLoadError(error)) return;
    if (!shouldHardReload()) return;
    window.location.reload();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (!isChunkLoadError(error)) {
      // Propagate to the outer Sentry / ErrorPage boundary.
      throw error;
    }

    // Reloading (or loop-guard tripped): keep a quiet shell so nothing flash-errors.
    return (
      <div className="loader-shell loader-shell--fill">
        <div className="loader loader-relative" />
      </div>
    );
  }
}

export default ChunkLoadErrorBoundary;
