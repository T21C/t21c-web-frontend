// tuf-search: #WebAdofaiViewerButton #webAdofai #levelDetail
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getPortalRoot } from "@/utils/portalRoot";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import "./webadofaiviewerbutton.css";

const WEB_ADOFAI_LEVEL_URL = "https://web-adofai.impl1113.dev/levels";

const WebAdofaiViewerButton = ({ levelId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const iframeSrc = useMemo(() => {
    if (!levelId) return null;
    return `${WEB_ADOFAI_LEVEL_URL}/${encodeURIComponent(levelId)}?embed=true`;
  }, [levelId]);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    setIsOpen(false);
  }, [levelId]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!iframeSrc) return null;

  const modal = isOpen ? (
    <div
      className="web-adofai-viewer-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setIsOpen(false);
        }
      }}
    >
      <section
        className="web-adofai-viewer-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Web ADOFAI level viewer"
      >
        <button
          type="button"
          className="web-adofai-viewer-close"
          aria-label="Close Web ADOFAI viewer"
          onClick={() => setIsOpen(false)}
        >
          x
        </button>
        <iframe
          className="web-adofai-viewer-frame"
          title="Web ADOFAI level viewer"
          src={iframeSrc}
          allow="autoplay; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
        />
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        className="web-adofai-viewer-button"
        aria-label="Open in Web ADOFAI"
        onClick={() => setIsOpen(true)}
      >
        Web ADOFAI
      </button>
      {modal ? createPortal(modal, getPortalRoot()) : null}
    </>
  );
};

export default WebAdofaiViewerButton;
