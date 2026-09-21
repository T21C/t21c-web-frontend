// tuf-search: #Portal #portal
import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getPortalRoot } from "@/utils/portalRoot";
import { subscribePathnameChange } from "@/utils/pathnameChange";

function showPortalNode(wrap) {
  wrap.removeAttribute("hidden");
  wrap.style.removeProperty("display");
}

function hidePortalNode(wrap) {
  wrap.setAttribute("hidden", "");
  wrap.style.setProperty("display", "none", "important");
}

function shouldHideOnPathChange(hideOnNavigate, pathname, mountPathname) {
  if (hideOnNavigate === false) return false;
  if (typeof hideOnNavigate === "function") {
    return hideOnNavigate(pathname, mountPathname);
  }
  return pathname !== mountPathname;
}

/**
 * Declarative portal wrapper. Portaled UI must use self-contained class selectors
 * or co-located CSS imports — never depend on a page wrapper ancestor.
 *
 * On pathname change the wrapper is hidden immediately. Lazy route <Suspense>
 * keeps the previous page (and this portal) mounted until the next chunk
 * loads; hiding here is what makes overlays disappear when the navbar is used.
 * Returning to the mount pathname unhides the wrapper. Pass `hideOnNavigate`
 * to keep chrome visible across in-page param changes (e.g. `/rating` ↔ id).
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {boolean} [props.when=true]
 * @param {'body' | 'documentBody' | 'root'} [props.mount='body']
 * @param {HTMLElement | null} [props.root] - explicit mount node; wins over mount
 * @param {boolean | ((pathname: string, mountPathname: string) => boolean)} [props.hideOnNavigate=true]
 */
export function Portal({
  children,
  when = true,
  mount = "body",
  root: rootProp,
  hideOnNavigate = true,
}) {
  const wrapRef = useRef(null);
  const mountPathRef = useRef("");

  useLayoutEffect(() => {
    if (!when) return undefined;

    mountPathRef.current = window.location.pathname;
    const node = wrapRef.current;
    if (node) showPortalNode(node);

    return subscribePathnameChange((pathname) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      if (shouldHideOnPathChange(hideOnNavigate, pathname, mountPathRef.current)) {
        hidePortalNode(wrap);
      } else {
        showPortalNode(wrap);
      }
    });
  }, [when, hideOnNavigate]);

  if (!when || children == null) return null;

  let container = rootProp ?? null;

  if (!container && typeof document !== "undefined") {
    if (mount === "documentBody") {
      container = document.body;
    } else if (mount === "root") {
      container = getPortalRoot("#root");
    } else {
      container = getPortalRoot(".body");
    }
  }

  // document.body can be null during teardown / unusual browsing contexts
  if (!container) return null;

  return createPortal(
    <div ref={wrapRef} className="tuf-portal-root" style={{ display: "contents" }} data-tuf-portal="">
      {children}
    </div>,
    container,
  );
}
