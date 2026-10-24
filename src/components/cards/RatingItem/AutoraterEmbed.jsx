import { useEffect, useRef, useState } from 'react';
import { autoraterResizeHeight } from '@/utils/autorater';

const widgetOrigin = new URL(
  import.meta.env.VITE_AUTORATER_WIDGET_URL || 'https://www.auto-rater-cat.com'
).origin;

export default function AutoraterEmbed({ levelId }) {
  const frame = useRef(null);
  const [height, setHeight] = useState(760);
  const id = Number(levelId);
  const validId = Number.isSafeInteger(id) && id > 0 && id <= 2147483647;

  useEffect(() => {
    setHeight(760);
    if (!validId) return undefined;
    const onResize = (event) => {
      const next = autoraterResizeHeight(event, frame.current?.contentWindow, widgetOrigin, id);
      if (next !== null) setHeight(next);
    };
    window.addEventListener('message', onResize);
    return () => window.removeEventListener('message', onResize);
  }, [id, validId]);

  if (!validId) return null;
  return (
    <iframe
      key={id}
      ref={frame}
      className="autorater-embed"
      src={`${widgetOrigin}/embed/tuf/${id}?theme=dark`}
      title={`Auto Rater Cat V2 analysis for TUF level ${id}`}
      style={{ height }}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allow="clipboard-write"
    />
  );
}
