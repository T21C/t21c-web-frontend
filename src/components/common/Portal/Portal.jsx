// tuf-search: #Portal #portal
import { createPortal } from "react-dom";
import { getPortalRoot } from "@/utils/portalRoot";

/**
 * Declarative portal wrapper. Portaled UI must use self-contained class selectors
 * or co-located CSS imports — never depend on a page wrapper ancestor.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {boolean} [props.when=true]
 * @param {'body' | 'documentBody' | 'root'} [props.mount='body']
 * @param {HTMLElement | null} [props.root] - explicit mount node; wins over mount
 */
export function Portal({ children, when = true, mount = "body", root: rootProp }) {
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

  if (!container) return null;

  return createPortal(children, container);
}
