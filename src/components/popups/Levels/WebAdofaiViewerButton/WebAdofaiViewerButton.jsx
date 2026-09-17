// tuf-search: #WebAdofaiViewerButton #webAdofai #levelDetail
import React, { useEffect, useMemo, useRef, useState } from "react";
import { PopupShell } from "@/components/common/PopupShell";
import { Portal } from "@/components/common/Portal";
import "./webadofaiviewerbutton.css";

const WEB_ADOFAI_LEVEL_URL = "https://web-adofai.impl1113.dev/levels";
const WEB_ADOFAI_ORIGIN = new URL(WEB_ADOFAI_LEVEL_URL).origin;
const WEB_ADOFAI_CLOSE_REQUEST_TYPE = "web-adofai:close-request";

const WebAdofaiViewerButton = ({ levelId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const iframeRef = useRef(null);
  const iframeSrc = useMemo(() => {
    if (!levelId) return null;
    return `${WEB_ADOFAI_LEVEL_URL}/${encodeURIComponent(levelId)}?embed=true`;
  }, [levelId]);

  useEffect(() => {
    setIsOpen(false);
  }, [levelId]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleMessage = (event) => {
      if (
        event.origin === WEB_ADOFAI_ORIGIN &&
        event.source === iframeRef.current?.contentWindow &&
        event.data?.type === WEB_ADOFAI_CLOSE_REQUEST_TYPE
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isOpen]);

  if (!iframeSrc) return null;

  return (
    <>
      <Portal>
      <button
        type="button"
        className="web-adofai-viewer-button"
        aria-label="Open in Web ADOFAI"
        onClick={() => setIsOpen(true)}
      >
        Web ADOFAI
      </button>
      </Portal>
      {isOpen ? (
        <PopupShell
          onClose={() => setIsOpen(false)}
          overlayClassName="web-adofai-viewer-overlay"
          panelClassName="web-adofai-viewer-dialog"
          ariaLabel="Web ADOFAI level viewer"
        >
          <iframe
            ref={iframeRef}
            className="web-adofai-viewer-frame"
            title="Web ADOFAI level viewer"
            src={iframeSrc}
            allow="autoplay; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
          />
        </PopupShell>
      ) : null}
    </>
  );
};

export default WebAdofaiViewerButton;
