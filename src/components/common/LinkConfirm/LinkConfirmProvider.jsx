import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { formatUrlForDisplay, getUrlHost, parseSafeUrl } from "@/utils/bioCanvas/urls.js";
import "./linkConfirm.css";

const TRUSTED_DOMAINS_KEY = "tuf-link-confirm-trusted-domains";

const LinkConfirmContext = createContext(null);

function readTrustedDomains() {
  try {
    const raw = sessionStorage.getItem(TRUSTED_DOMAINS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((d) => typeof d === "string") : []);
  } catch {
    return new Set();
  }
}

function writeTrustedDomains(set) {
  sessionStorage.setItem(TRUSTED_DOMAINS_KEY, JSON.stringify([...set]));
}

function LinkConfirmModal({ pending, onConfirm, onCancel }) {
  const { t } = useTranslation(["pages"]);
  const [trustDomain, setTrustDomain] = useState(false);
  useBodyScrollLock(Boolean(pending));

  if (!pending) return null;

  const displayUrl = formatUrlForDisplay(pending.url);
  const host = getUrlHost(pending.url);

  return createPortal(
    <div className="link-confirm" role="presentation">
      <button type="button" className="link-confirm__backdrop" aria-label={t("bioCanvas.linkConfirm.cancel")} onClick={onCancel} />
      <div className="link-confirm__panel" role="dialog" aria-modal="true" aria-labelledby="link-confirm-title">
        <h2 id="link-confirm-title" className="link-confirm__title">
          {t("bioCanvas.linkConfirm.title", { defaultValue: "Follow this link?" })}
        </h2>
        <p className="link-confirm__lead">
          {t("bioCanvas.linkConfirm.lead", { defaultValue: "You are about to visit an external site." })}
        </p>
        <div className="link-confirm__url-box">
          <span className="link-confirm__url-host">{host}</span>
          <span className="link-confirm__url-full">{displayUrl}</span>
        </div>
        <label className="link-confirm__trust">
          <input
            type="checkbox"
            checked={trustDomain}
            onChange={(ev) => setTrustDomain(ev.target.checked)}
          />
          <span>{t("bioCanvas.linkConfirm.trustDomain", { host, defaultValue: `Trust ${host} for this session` })}</span>
        </label>
        <div className="link-confirm__actions">
          <button type="button" className="btn-fill-neutral link-confirm__btn" onClick={onCancel}>
            {t("bioCanvas.linkConfirm.cancel", { defaultValue: "Cancel" })}
          </button>
          <button
            type="button"
            className="btn-fill-primary link-confirm__btn"
            onClick={() => onConfirm(trustDomain)}
          >
            {t("bioCanvas.linkConfirm.continue", { defaultValue: "Continue" })}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function LinkConfirmProvider({ children }) {
  const trustedRef = useRef(readTrustedDomains());
  const resolverRef = useRef(null);
  const [pending, setPending] = useState(null);

  const confirmLink = useCallback((rawUrl) => {
    const url = parseSafeUrl(rawUrl);
    if (!url) return Promise.resolve(false);

    const host = getUrlHost(url);
    if (trustedRef.current.has(host)) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setPending({ url, host });
    });
  }, []);

  const finish = useCallback((result, trustDomain) => {
    if (trustDomain && pending?.host) {
      trustedRef.current.add(pending.host);
      writeTrustedDomains(trustedRef.current);
    }
    resolverRef.current?.(result);
    resolverRef.current = null;
    setPending(null);
  }, [pending]);

  const value = useMemo(() => ({ confirmLink }), [confirmLink]);

  return (
    <LinkConfirmContext.Provider value={value}>
      {children}
      <LinkConfirmModal
        pending={pending}
        onConfirm={(trust) => finish(true, trust)}
        onCancel={() => finish(false, false)}
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
  const confirmLink = useLinkConfirm();
  return useCallback(
    async (rawUrl) => {
      const url = parseSafeUrl(rawUrl);
      if (!url) return false;
      const ok = await confirmLink(url);
      if (ok) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      return ok;
    },
    [confirmLink],
  );
}
