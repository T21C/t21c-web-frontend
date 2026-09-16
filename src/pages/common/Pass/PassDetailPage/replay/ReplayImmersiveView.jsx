// tuf-search: #ReplayImmersiveView #replay
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './replay-immersive.css';

const ReplayImmersiveView = ({ children, label, onClose }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return createPortal(
    <dialog ref={dialogRef} className="replay-immersive" aria-label={label}
      onCancel={event => { event.preventDefault(); onClose(); }}>
      {children}
    </dialog>,
    document.body,
  );
};

export default ReplayImmersiveView;
