import { useLayoutEffect, useRef, useState } from 'react';
import './marqueetext.css';

const MarqueeText = ({
  children,
  className = '',
  as: Tag = 'span',
  title,
}) => {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const updateOverflow = () => {
      const distance = Math.max(0, content.scrollWidth - container.clientWidth);
      const overflowsNow = distance > 1;

      setOverflows(overflowsNow);

      if (overflowsNow) {
        const duration = Math.max(4, distance/16);
        container.style.setProperty('--marquee-distance', `${distance}px`);
        container.style.setProperty('--marquee-duration', `${duration}s`);
      } else {
        container.style.removeProperty('--marquee-distance');
        container.style.removeProperty('--marquee-duration');
      }
    };

    updateOverflow();

    const resizeObserver = new ResizeObserver(updateOverflow);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [children]);

  const resolvedTitle =
    title ?? (typeof children === 'string' || typeof children === 'number' ? String(children) : undefined);

  return (
    <Tag
      ref={containerRef}
      className={`marquee-text${overflows ? ' marquee-text--overflows' : ''}${className ? ` ${className}` : ''}`}
      title={resolvedTitle}
    >
      <span className="marquee-text__inner" ref={contentRef}>
        {children}
      </span>
    </Tag>
  );
};

export default MarqueeText;
