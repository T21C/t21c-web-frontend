import { useId, useLayoutEffect, useRef, useState } from 'react';
import './marqueetext.css';

const MARQUEE_SPEED_PX_PER_SECOND = 25;
const MARQUEE_START_DELAY_SECONDS = 0.8;
const MARQUEE_END_PAUSE_SECONDS = 2;
const FADE_WIDTH = '1.5rem';
const EDGE_THRESHOLD = 1;
const MARQUEE_STYLE_PROPS = [
  '--marquee-distance',
  '--marquee-cycle-duration',
  '--marquee-animation-name',
];
const MARQUEE_FADE_PROPS = [
  '--marquee-fade-left',
  '--marquee-fade-right',
];

const updateFadeMask = (container, translateX, distance) => {
  const atStart = translateX > -EDGE_THRESHOLD;
  const atEnd = translateX < -distance + EDGE_THRESHOLD;
  container.style.setProperty('--marquee-fade-left', atStart ? '0px' : FADE_WIDTH);
  container.style.setProperty('--marquee-fade-right', atEnd ? '0px' : FADE_WIDTH);
};

const getTranslateX = (element) => {
  const transform = getComputedStyle(element).transform;
  if (!transform || transform === 'none') return 0;
  return new DOMMatrixReadOnly(transform).m41;
};

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
  const distanceRef = useRef(0);
  const rafRef = useRef(null);
  const [overflows, setOverflows] = useState(false);
  const reactId = useId().replace(/:/g, '');
  const animationName = `marquee-text-${reactId}`;

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const stopFadeTracking = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const trackFade = () => {
      const translateX = getTranslateX(content);
      updateFadeMask(container, translateX, distanceRef.current);

      if (getComputedStyle(content).animationName !== 'none') {
        rafRef.current = requestAnimationFrame(trackFade);
      } else {
        rafRef.current = null;
        updateFadeMask(container, 0, distanceRef.current);
      }
    };

    const startFadeTracking = () => {
      stopFadeTracking();
      rafRef.current = requestAnimationFrame(trackFade);
    };

    const handleAnimationStart = () => {
      startFadeTracking();
    };

    const handleAnimationCancel = () => {
      stopFadeTracking();
      updateFadeMask(container, 0, distanceRef.current);
    };

    const updateOverflow = () => {
      const distance = Math.max(0, content.scrollWidth - container.clientWidth);
      const overflowsNow = distance > 1;
      distanceRef.current = distance;

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
        updateFadeMask(container, getTranslateX(content), distance);
      } else {
        MARQUEE_STYLE_PROPS.forEach((prop) => container.style.removeProperty(prop));
        MARQUEE_FADE_PROPS.forEach((prop) => container.style.removeProperty(prop));

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

    content.addEventListener('animationstart', handleAnimationStart);
    content.addEventListener('animationcancel', handleAnimationCancel);

    return () => {
      resizeObserver.disconnect();
      content.removeEventListener('animationstart', handleAnimationStart);
      content.removeEventListener('animationcancel', handleAnimationCancel);
      stopFadeTracking();
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
