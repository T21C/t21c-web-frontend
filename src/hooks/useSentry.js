// tuf-search: #sentry #errorReporting
import * as Sentry from '@sentry/react';

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

/** OEM / in-app browsers inject WebView bridges and ad SDKs that throw into page JS. */
const isThirdPartyNativeBridgeNoise = (event) => {
  const values = event.exception?.values ?? [];
  return values.some((value) =>
    /nativeBridge\.\w+ is not a function/i.test(value.value || ''),
  );
};

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: Boolean(import.meta.env.VITE_SENTRY_DSN) && !import.meta.env.DEV,
  sendDefaultPii: true,
  // Browser extensions / page translators mutate React-owned DOM; React then
  // throws NotFoundError on removeChild during commit. Unfixable from app code.
  ignoreErrors: [
    /Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node/i,
    /nativeBridge\.\w+ is not a function/i,
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
      isThirdPartyNativeBridgeNoise(event)
    ) {
      return null;
    }
    return event;
  },
});

export { Sentry };
