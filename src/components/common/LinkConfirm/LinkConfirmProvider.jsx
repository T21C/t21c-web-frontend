// tuf-search: #LinkConfirmProvider #linkConfirm
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Portal } from "@/components/common/Portal";
import { useTranslation } from "react-i18next";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { formatUrlForDisplay, getUrlHost, parseSafeUrl } from "@/utils/bioCanvas/urls";
import { getUnapprovedExternalUrl, isApprovedNavigationUrl } from "@/utils/externalNavigation";
import {
  isExternalNavigationBypassActive,
  nativeLocationAssign,
  nativeLocationReplace,
  nativeWindowOpen,
  registerExternalNavigationConfirmer,
  withExternalNavigationBypass,
} from "@/utils/externalNavigationGate";
import "./linkConfirm.css";

const SESSION_TRUSTED_DOMAINS_KEY = "tuf-link-confirm-trusted-domains";
const ALWAYS_TRUSTED_DOMAINS_KEY = "tuf-link-confirm-always-trusted-domains";
const SKIP_ATTR = "data-link-confirm-skip";

const LinkConfirmContext = createContext(null);

const locationHrefDescriptor =
  typeof Location !== "undefined"
    ? Object.getOwnPropertyDescriptor(Location.prototype, "href")
    : null;

function readTrustedDomainSet(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((d) => typeof d === "string") : []);
  } catch {
    return new Set();
  }
}

function writeTrustedDomainSet(storage, key, set) {
  storage.setItem(key, JSON.stringify([...set]));
}

function readSessionTrustedDomains() {
  return readTrustedDomainSet(sessionStorage, SESSION_TRUSTED_DOMAINS_KEY);
}

function writeSessionTrustedDomains(set) {
  writeTrustedDomainSet(sessionStorage, SESSION_TRUSTED_DOMAINS_KEY, set);
}

function readAlwaysTrustedDomains() {
  return readTrustedDomainSet(localStorage, ALWAYS_TRUSTED_DOMAINS_KEY);
}

function writeAlwaysTrustedDomains(set) {
  writeTrustedDomainSet(localStorage, ALWAYS_TRUSTED_DOMAINS_KEY, set);
}

/**
 * Characters the URL parser discards, which a naive scheme test does not.
 *
 * Per the WHATWG URL spec the parser removes every ASCII tab/LF/CR from
 * anywhere in the input, and strips leading C0 controls and spaces, all before
 * it decides what the scheme is. `String.trim()` does neither of those things
 * to the interior of a string, so `getAttribute("href")` can hand back
 * `"java\tscript:..."` — which fails a `/^javascript:/` test while the browser
 * still resolves it to `javascript:` and runs it on click.
 */
const URL_PARSER_IGNORED = /[\t\n\r]/g;
const URL_LEADING_STRIPPED = /^[\u0000-\u0020]+/;

function isDangerousHref(href) {
  const normalized = String(href || "")
    .replace(URL_PARSER_IGNORED, "")
    .replace(URL_LEADING_STRIPPED, "");
  return /^(javascript|data|vbscript):/i.test(normalized);
}

function LinkConfirmModal({ pending, onConfirm, onCancel }) {
  const { t } = useTranslation(["pages"]);
  const [trustMode, setTrustMode] = useState("none");
  useBodyScrollLock(Boolean(pending));

  if (!pending) return null;

  const displayUrl = formatUrlForDisplay(pending.url);
  const host = getUrlHost(pending.url);

  return (
    <Portal mount="documentBody">
      <div className="link-confirm" role="presentation">
        <button
          type="button"
          className="link-confirm__backdrop"
          aria-label={t("bioCanvas.linkConfirm.cancel", { defaultValue: "Cancel" })}
          onClick={onCancel}
        />
        <div
          className="link-confirm__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="link-confirm-title"
        >
          <h2 id="link-confirm-title" className="link-confirm__title">
            {t("bioCanvas.linkConfirm.title", { defaultValue: "Leaving TUF?" })}
          </h2>
          <p className="link-confirm__lead">
            {t("bioCanvas.linkConfirm.lead", {
              defaultValue:
                "You are about to visit an external site. Only continue if you trust this destination.",
            })}
          </p>
          <div className="link-confirm__url-box">
            <span className="link-confirm__url-host">{host}</span>
            <span className="link-confirm__url-full">{displayUrl}</span>
          </div>
          <div className="link-confirm__trust-options">
            <label className="link-confirm__trust">
              <input
                type="checkbox"
                checked={trustMode === "session"}
                onChange={(ev) => setTrustMode(ev.target.checked ? "session" : "none")}
              />
              <span>
                {t("bioCanvas.linkConfirm.trustDomain", {
                  host,
                  defaultValue: `Trust ${host} for this session`,
                })}
              </span>
            </label>
            <label className="link-confirm__trust">
              <input
                type="checkbox"
                checked={trustMode === "always"}
                onChange={(ev) => setTrustMode(ev.target.checked ? "always" : "none")}
              />
              <span>
                {t("bioCanvas.linkConfirm.trustDomainAlways", {
                  host,
                  defaultValue: `Always trust ${host}`,
                })}
              </span>
            </label>
          </div>
          <div className="link-confirm__actions">
            <button type="button" className="btn-fill-neutral link-confirm__btn" onClick={onCancel}>
              {t("bioCanvas.linkConfirm.cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              type="button"
              className="btn-fill-primary link-confirm__btn"
              onClick={() => onConfirm(trustMode)}
            >
              {t("bioCanvas.linkConfirm.continue", { defaultValue: "Continue" })}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function openConfirmedUrl(url, { newTab = true, features = "noopener,noreferrer" } = {}) {
  withExternalNavigationBypass(() => {
    if (newTab) {
      nativeWindowOpen(url, "_blank", features);
      return;
    }
    nativeLocationAssign(url);
  });
}

export function LinkConfirmProvider({ children }) {
  const sessionTrustedRef = useRef(readSessionTrustedDomains());
  const alwaysTrustedRef = useRef(readAlwaysTrustedDomains());
  const resolverRef = useRef(null);
  const confirmLinkRef = useRef(null);
  const [pending, setPending] = useState(null);

  const confirmLink = useCallback((rawUrl) => {
    const url = parseSafeUrl(typeof rawUrl === "string" ? rawUrl : String(rawUrl ?? ""));
    if (!url) return Promise.resolve(false);

    if (isApprovedNavigationUrl(url)) {
      return Promise.resolve(true);
    }

    const host = getUrlHost(url);
    if (alwaysTrustedRef.current.has(host) || sessionTrustedRef.current.has(host)) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setPending({ url, host });
    });
  }, []);

  confirmLinkRef.current = confirmLink;

  useEffect(() => registerExternalNavigationConfirmer((url) => confirmLinkRef.current?.(url)), []);

  const finish = useCallback(
    (result, trustMode = "none") => {
      if (result && pending?.host) {
        if (trustMode === "always") {
          alwaysTrustedRef.current.add(pending.host);
          writeAlwaysTrustedDomains(alwaysTrustedRef.current);
        } else if (trustMode === "session") {
          sessionTrustedRef.current.add(pending.host);
          writeSessionTrustedDomains(sessionTrustedRef.current);
        }
      }
      resolverRef.current?.(result);
      resolverRef.current = null;
      setPending(null);
    },
    [pending],
  );

  // App-wide interceptors: anchors, window.open, and location navigation.
  useEffect(() => {
    const interceptAnchorNavigation = (event, { forceNewTab = false } = {}) => {
      if (event.defaultPrevented) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest(`a[href]:not([${SKIP_ATTR}])`);
      if (!anchor) return;

      const hrefAttr = anchor.getAttribute("href");
      if (!hrefAttr || hrefAttr.startsWith("#")) return;
      if (/^(mailto|tel|sms):/i.test(hrefAttr.trim())) return;

      // Check the attribute and the browser-resolved href. They can disagree:
      // the URL parser drops tabs/newlines that a raw-string test still sees.
      if (isDangerousHref(hrefAttr) || isDangerousHref(anchor.href)) {
        event.preventDefault();
        return;
      }

      const unapproved = getUnapprovedExternalUrl(anchor.href);
      if (!unapproved) {
        // getUnapprovedExternalUrl returns null for two very different cases:
        // an approved destination (same-origin, allowlisted host, blob:/about:),
        // and anything that will not parse as an http(s) URL at all. Letting the
        // second case fall through is what made a `javascript:` href that slipped
        // past the scheme test navigate normally. Approved destinations proceed;
        // everything else stops here.
        if (!isApprovedNavigationUrl(anchor.href)) {
          event.preventDefault();
        }
        return;
      }

      event.preventDefault();

      const openInNewTab =
        forceNewTab ||
        anchor.target === "_blank" ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey;

      void (async () => {
        const ok = await confirmLinkRef.current?.(unapproved);
        if (!ok) return;
        openConfirmedUrl(unapproved, { newTab: openInNewTab });
      })();
    };

    const onDocumentClick = (event) => {
      if (event.button !== 0) return;
      interceptAnchorNavigation(event);
    };

    const onDocumentAuxClick = (event) => {
      if (event.button !== 1) return;
      interceptAnchorNavigation(event, { forceNewTab: true });
    };

    const patchedOpen = (url, target, features) => {
      if (isExternalNavigationBypassActive()) {
        return nativeWindowOpen(url, target, features);
      }
      if (url == null || url === "" || url === "about:blank") {
        return nativeWindowOpen(url, target, features);
      }

      const asString = String(url);
      if (isDangerousHref(asString)) {
        return null;
      }

      const unapproved = getUnapprovedExternalUrl(asString);
      if (!unapproved) {
        return nativeWindowOpen(url, target, features);
      }

      const win = nativeWindowOpen("about:blank", target || "_blank");
      if (win) {
        try {
          win.opener = null;
        } catch {
          /* ignore */
        }
      }

      void (async () => {
        const ok = await confirmLinkRef.current?.(unapproved);
        if (ok && win && !win.closed) {
          try {
            win.location.href = unapproved;
          } catch {
            win.close();
            withExternalNavigationBypass(() => {
              nativeWindowOpen(unapproved, "_blank", features ?? "noopener,noreferrer");
            });
          }
        } else if (win && !win.closed) {
          win.close();
        } else if (ok) {
          withExternalNavigationBypass(() => {
            nativeWindowOpen(unapproved, "_blank", features ?? "noopener,noreferrer");
          });
        }
      })();

      return win;
    };

    const interceptLocationNavigation = (url, navigate) => {
      if (isExternalNavigationBypassActive()) {
        navigate(url);
        return;
      }
      if (url == null || url === "") {
        navigate(url);
        return;
      }
      const asString = String(url);
      if (isDangerousHref(asString)) return;

      const unapproved = getUnapprovedExternalUrl(asString);
      if (!unapproved) {
        navigate(url);
        return;
      }

      void (async () => {
        const ok = await confirmLinkRef.current?.(unapproved);
        if (!ok) return;
        withExternalNavigationBypass(() => navigate(unapproved));
      })();
    };

    document.addEventListener("click", onDocumentClick, true);
    document.addEventListener("auxclick", onDocumentAuxClick, true);
    window.open = patchedOpen;

    let assignPatched = false;
    let replacePatched = false;
    let hrefPatched = false;

    try {
      window.location.assign = (url) => {
        interceptLocationNavigation(url, (next) => nativeLocationAssign(next));
      };
      assignPatched = true;
    } catch {
      assignPatched = false;
    }

    try {
      window.location.replace = (url) => {
        interceptLocationNavigation(url, (next) => nativeLocationReplace(next));
      };
      replacePatched = true;
    } catch {
      replacePatched = false;
    }

    if (locationHrefDescriptor?.configurable && locationHrefDescriptor.set && locationHrefDescriptor.get) {
      try {
        Object.defineProperty(window.location, "href", {
          configurable: true,
          enumerable: locationHrefDescriptor.enumerable,
          get() {
            return locationHrefDescriptor.get.call(window.location);
          },
          set(url) {
            interceptLocationNavigation(url, (next) => {
              locationHrefDescriptor.set.call(window.location, next);
            });
          },
        });
        hrefPatched = true;
      } catch {
        hrefPatched = false;
      }
    }

    return () => {
      document.removeEventListener("click", onDocumentClick, true);
      document.removeEventListener("auxclick", onDocumentAuxClick, true);
      if (window.open === patchedOpen) {
        window.open = nativeWindowOpen;
      }
      if (assignPatched) {
        try {
          window.location.assign = nativeLocationAssign;
        } catch {
          /* ignore */
        }
      }
      if (replacePatched) {
        try {
          window.location.replace = nativeLocationReplace;
        } catch {
          /* ignore */
        }
      }
      if (hrefPatched && locationHrefDescriptor) {
        try {
          Object.defineProperty(window.location, "href", locationHrefDescriptor);
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      confirmLink,
      openExternal: async (rawUrl, options) => {
        const url = parseSafeUrl(rawUrl);
        if (!url) return false;
        const ok = await confirmLink(url);
        if (ok) openConfirmedUrl(url, options);
        return ok;
      },
    }),
    [confirmLink],
  );

  return (
    <LinkConfirmContext.Provider value={value}>
      {children}
      <LinkConfirmModal
        key={pending?.url ?? "idle"}
        pending={pending}
        onConfirm={(trustMode) => finish(true, trustMode)}
        onCancel={() => finish(false, "none")}
      />
    </LinkConfirmContext.Provider>
  );
}

export function useLinkConfirm() {
  const ctx = useContext(LinkConfirmContext);
  if (!ctx) {
    throw new Error("useLinkConfirm must be used within LinkConfirmProvider");
  }
  return ctx.confirmLink;
}

export function useExternalLink() {
  const ctx = useContext(LinkConfirmContext);
  if (!ctx) {
    throw new Error("useExternalLink must be used within LinkConfirmProvider");
  }
  return ctx.openExternal;
}
