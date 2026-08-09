// tuf-search: #sentry #errorReporting
import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import {
  createRoutesFromChildren,
  matchRoutes,
  Routes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';
import { API_BASE, HEALTH_BASE, OWN_BASE } from '@/config/env';

const isBrowserExtensionUrl = (url) =>
  typeof url === 'string' &&
  /^(chrome|moz|safari|safari-web|ms-browser)-extension:\/\//i.test(url);

const isCloudflareBeaconUrl = (url) =>
  typeof url === 'string' &&
  (/beacon\.min\.js/i.test(url) || /static\.cloudflareinsights\.com/i.test(url));

const eventStackFrames = (event) =>
  event.exception?.values?.flatMap((value) => value.stacktrace?.frames ?? []) ?? [];

const isExtensionOriginatedEvent = (event) => {
  const frames = eventStackFrames(event);

  if (frames.length === 0) return false;

  // Drop only when every frame is extension-hosted (no first-party app frames).
  return frames.every((frame) => isBrowserExtensionUrl(frame.filename));
};

/** Cloudflare Web Analytics injects beacon.min.js; it throws on older WebViews (e.g. missing Array.at). */
const isCloudflareBeaconNoise = (event) => {
  const frames = eventStackFrames(event);
  if (frames.length > 0 && frames.every((frame) => isCloudflareBeaconUrl(frame.filename))) {
    return true;
  }
  const culprit = event.culprit || '';
  if (isCloudflareBeaconUrl(culprit)) {
    return true;
  }
  return false;
};

const isExternalDomMutationNoise = (event) => {
  const values = event.exception?.values ?? [];
  return values.some((value) => {
    const type = value.type || '';
    const message = value.value || '';
    return (
      (type === 'NotFoundError' || type === 'DOMException') &&
      /Failed to execute 'removeChild' on 'Node'/i.test(message)
    );
  });
};

/**
 * OEM / in-app browsers eval scripts that reference globals they never inject.
 * These fire as ReferenceError with no usable frames — thirdPartyErrorFilterIntegration
 * cannot classify them (no filenames / no module metadata).
 */
const isAnonymousInjectedGlobalNoise = (event) => {
  const values = event.exception?.values ?? [];
  const isUndefinedGlobal = values.some(
    (v) => v.type === 'ReferenceError' && /\w+ is not defined/i.test(v.value || ''),
  );
  if (!isUndefinedGlobal) return false;

  const frames = eventStackFrames(event);
  // Keep events that contain at least one app frame (/assets/ path).
  const hasAppFrame = frames.some(
    (f) => typeof f.filename === 'string' && f.filename.includes('/assets/'),
  );
  return !hasAppFrame;
};

/** Vite (:5173) and local API (:3000–3009). Other loopback ports are helper/IPC noise. */
const isAllowedLoopbackPort = (port) => {
  const n = Number(port);
  return n === 5173 || n === 5000 || (n >= 3000 && n <= 3009);
};

const LOOPBACK_URL_PORT_RE =
  /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::(\d+))?/i;

const collectEventUrls = (event) => {
  const urls = [];
  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb?.data?.url) urls.push(String(crumb.data.url));
  }
  if (event.request?.url) urls.push(String(event.request.url));
  for (const frame of eventStackFrames(event)) {
    if (frame.filename) urls.push(String(frame.filename));
  }
  return urls;
};

const isAbortErrorEvent = (event) => {
  const values = event.exception?.values ?? [];
  return values.some((value) => {
    const type = value.type || '';
    const message = value.value || '';
    return (
      type === 'AbortError' ||
      /signal is aborted/i.test(message) ||
      (type === 'DOMException' && /aborted/i.test(message))
    );
  });
};

/** Events created by captureConsoleIntegration (not real thrown errors). */
const isConsoleCaptureEvent = (event) => {
  if (event.logger === 'console') return true;
  const values = event.exception?.values ?? [];
  return values.some((value) => value.mechanism?.type === 'auto.core.capture_console');
};

const consoleCaptureEventText = (event) => {
  const parts = [];
  if (event.message) parts.push(String(event.message));
  for (const value of event.exception?.values ?? []) {
    if (value.value) parts.push(String(value.value));
    if (value.type) parts.push(String(value.type));
  }
  const args = event.extra?.arguments;
  if (Array.isArray(args)) {
    for (const arg of args) {
      if (typeof arg === 'string') parts.push(arg);
    }
  }
  return parts.join(' ');
};

/**
 * Only forward console.error / console.warn that match these patterns.
 * Everything else from captureConsoleIntegration is dropped in beforeSend.
 */
const CONSOLE_CAPTURE_ALLOWLIST = [
  // react-virtuoso (console.error / warn — never thrown, so otherwise invisible)
  /Zero-sized element/i,
  /react-virtuoso/i,
  /was not resolved to pixel value/i,
  // React runtime warnings that often precede real UI bugs
  /Maximum update depth exceeded/i,
  /Cannot update a component .* while rendering a different component/i,
  /Each child in a list should have a unique ["']key["'] prop/i,
  /A component suspended while responding to synchronous input/i,
  /Minified React error #\d+/i,
  // Lazy route / chunk load failures sometimes only surface on console
  /Failed to fetch dynamically imported module/i,
  /Loading chunk [\w.-]+ failed/i,
  /ChunkLoadError/i,
];

const isAllowedConsoleCapture = (event) => {
  const text = consoleCaptureEventText(event);
  if (!text) return false;
  return CONSOLE_CAPTURE_ALLOWLIST.some((pattern) => pattern.test(text));
};

/**
 * Drop AbortErrors from loopback probes outside Vite/API ports — e.g. TUFHelperLite
 * `@adofai-ipc/client` scanning :32145–32155 (see JAVASCRIPT-REACT-1P).
 */
const isNonAppLoopbackAbortNoise = (event) => {
  if (!isAbortErrorEvent(event)) return false;

  const frames = eventStackFrames(event);
  if (
    frames.some(
      (frame) =>
        typeof frame.filename === 'string' && /@adofai-ipc\//i.test(frame.filename),
    )
  ) {
    return true;
  }

  const loopbackPorts = collectEventUrls(event)
    .map((url) => {
      const match = url.match(LOOPBACK_URL_PORT_RE);
      if (!match) return null;
      return match[1] ? Number(match[1]) : 80;
    })
    .filter((port) => port != null);

  if (loopbackPorts.length === 0) return false;
  return loopbackPorts.every((port) => !isAllowedLoopbackPort(port));
};

const sentryRelease = import.meta.env.VITE_SENTRY_RELEASE;

const tracePropagationTargets = [
  'localhost',
  /^\//, // same-origin (Vite /v2|/v3 proxy in dev)
  /^https:\/\/([a-z0-9-]+\.)?tuforums\.com/i,
  ...(API_BASE ? [API_BASE] : []),
  ...(HEALTH_BASE ? [HEALTH_BASE] : []),
  ...(OWN_BASE ? [OWN_BASE] : []),
];

/**
 * allowUrls matches the topmost non-anonymous stack frame URL.
 * Include absolute site hosts plus root-relative Vite asset paths (some WebViews
 * report `/assets/...` without a host).
 */
const allowUrls = [
  /tuforums\.com/i,
  /\/assets\//i,
  /localhost/i,
  /127\.0\.0\.1/i,
  ...(OWN_BASE ? [OWN_BASE] : []),
];

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  // DSN present → on in prod and local Vite DEV (needed to reproduce issues with full traces).
  enabled: Boolean(import.meta.env.VITE_SENTRY_DSN),
  sendDefaultPii: true,
  ...(sentryRelease ? { release: sentryRelease } : {}),
  // applicationKey "tuf-website" is stamped by @sentry/vite-plugin at build time.
  integrations: [
    Sentry.thirdPartyErrorFilterIntegration({
      filterKeys: ['tuf-website'],
      behaviour: 'drop-error-if-exclusively-contains-third-party-frames',
      // OEM / WebView bridges (AdSdk `_dsbridge`, Instagram `iabjs://`, …) throw inside
      // setTimeout/addEventListener wrappers. Without this, the stamped sentryWrapped
      // frame counts as first-party and exclusive-third-party drop never fires.
      ignoreSentryInternalFrames: true,
    }),
    // Virtuoso / React often only console.error useful diagnostics (no throw).
    // beforeSend drops anything that does not match CONSOLE_CAPTURE_ALLOWLIST.
    Sentry.captureConsoleIntegration({
      levels: ['error', 'warn'],
    }),
    Sentry.reactRouterBrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
      // Navigation/pageload is the e2e root; fetches nest under it while idle-open.
      // React Router starts a fresh Trace ID on each navigation (SDK default).
      // Do not manually rewrite propagation context on spanEnd — that breaks sampling.
      instrumentPageLoad: true,
      instrumentNavigation: true,
      traceFetch: true,
      traceXHR: true,
      enableHTTPTimings: true,
      // INP click roots flatten server spans; leave Web Vitals without INP spans.
      enableInp: false,
      // Capture the post-navigation request burst, then end (default finalTimeout=30s).
      idleTimeout: 2000,
      finalTimeout: 15000,
      childSpanTimeout: 8000,
      // Link consecutive navigations in the UI without forcing one shared Trace ID.
      linkPreviousTrace: 'in-memory',
      consistentTraceSampling: false,
    }),
  ],
  // Full browser sampling in DEV for local repro; prod stays quota-friendly.
  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
  tracePropagationTargets,
  allowUrls,
  // Browser extensions / page translators mutate React-owned DOM; React then
  // throws NotFoundError on removeChild during commit. Unfixable from app code.
  // (Has first-party React frames, so thirdPartyErrorFilterIntegration keeps it.)
  ignoreErrors: [
    /Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node/i,
  ],
  denyUrls: [
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,
    /^safari-web-extension:\/\//i,
    /^ms-browser-extension:\/\//i,
    /beacon\.min\.js/i,
    /static\.cloudflareinsights\.com/i,
  ],
  beforeSend(event) {
    if (
      isExtensionOriginatedEvent(event) ||
      isCloudflareBeaconNoise(event) ||
      isExternalDomMutationNoise(event) ||
      isAnonymousInjectedGlobalNoise(event)
    ) {
      return null;
    }
    // captureConsoleIntegration is noisy; only keep allowlisted diagnostics.
    if (isConsoleCaptureEvent(event) && !isAllowedConsoleCapture(event)) {
      return null;
    }
    return event;
  },
});

/** Top-level Routes wrapper for parameterized pageload/navigation transactions. */
export const SentryRoutes = Sentry.wrapReactRouterRouting(Routes);

export { Sentry };
