import { useId, useLayoutEffect, useRef, useState } from 'react';
import './marqueetext.css';

const MARQUEE_SPEED_PX_PER_SECOND = 25;
const MARQUEE_START_DELAY_SECONDS = 0.8;
const MARQUEE_END_PAUSE_SECONDS = 2;
const MARQUEE_STYLE_PROPS = [
  '--marquee-distance',
  '--marquee-cycle-duration',
  '--marquee-animation-name',
];

const buildKeyframeRule = (animationName, cycleDuration) => {
  const scrollDuration = (cycleDuration - MARQUEE_START_DELAY_SECONDS * 2 - MARQUEE_END_PAUSE_SECONDS) / 2;
  const toPercent = (elapsed) => ((elapsed / cycleDuration) * 100).toFixed(3);

  const p1 = toPercent(MARQUEE_START_DELAY_SECONDS);
  const p2 = toPercent(MARQUEE_START_DELAY_SECONDS + scrollDuration);
  const p3 = toPercent(MARQUEE_START_DELAY_SECONDS + scrollDuration + MARQUEE_END_PAUSE_SECONDS);
  const p4 = toPercent(
    MARQUEE_START_DELAY_SECONDS + scrollDuration + MARQUEE_END_PAUSE_SECONDS + scrollDuration,
  );

  return `
@keyframes ${animationName} {
  0%, ${p1}% {
    transform: translateX(0);
  }
  ${p2}% {
    transform: translateX(calc(-1 * var(--marquee-distance, 0px)));
  }
  ${p2}%, ${p3}% {
    transform: translateX(calc(-1 * var(--marquee-distance, 0px)));
  }
  ${p4}% {
    transform: translateX(0);
  }
  ${p4}%, 100% {
    transform: translateX(0);
  }
}`;
};

const MarqueeText = ({
  children,
  className = '',
  as: Tag = 'span',
  title,
}) => {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const styleRef = useRef(null);
  const [overflows, setOverflows] = useState(false);
  const reactId = useId().replace(/:/g, '');
  const animationName = `marquee-text-${reactId}`;

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const updateOverflow = () => {
      const distance = Math.max(0, content.scrollWidth - container.clientWidth);
      const overflowsNow = distance > 1;

      setOverflows(overflowsNow);

      if (overflowsNow) {
        const scrollDuration = distance / MARQUEE_SPEED_PX_PER_SECOND;
        const cycleDuration =
          MARQUEE_START_DELAY_SECONDS +
          scrollDuration +
          MARQUEE_END_PAUSE_SECONDS +
          scrollDuration +
          MARQUEE_START_DELAY_SECONDS;

        if (!styleRef.current) {
          const styleEl = document.createElement('style');
          styleEl.dataset.marqueeKeyframes = animationName;
          document.head.appendChild(styleEl);
          styleRef.current = styleEl;
        }

        styleRef.current.textContent = buildKeyframeRule(animationName, cycleDuration);
        container.style.setProperty('--marquee-distance', `${distance}px`);
        container.style.setProperty('--marquee-cycle-duration', `${cycleDuration}s`);
        container.style.setProperty('--marquee-animation-name', animationName);
      } else {
        MARQUEE_STYLE_PROPS.forEach((prop) => container.style.removeProperty(prop));

        if (styleRef.current) {
          styleRef.current.remove();
          styleRef.current = null;
        }
      }
    };

    updateOverflow();

    const resizeObserver = new ResizeObserver(updateOverflow);
    resizeObserver.observe(container);
    resizeObserver.observe(content);

    return () => {
      resizeObserver.disconnect();
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    };
  }, [animationName, children]);

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
