import { useLayoutEffect, useRef, useState } from 'react';
import './marqueetext.css';

const MARQUEE_FORWARD_SPEED_PX_PER_SECOND = 50;
const MARQUEE_RETURN_DURATION_SECONDS = 0.2;
const FADE_WIDTH = '1.5rem';
const EDGE_THRESHOLD = 1;

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

const MarqueeText = ({
  children,
  className = '',
  as: Tag = 'span',
  title,
}) => {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const distanceRef = useRef(0);
  const rafRef = useRef(null);
  const transitionRafRef = useRef(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const stopFadeTracking = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const trackFade = () => {
      updateFadeMask(container, getTranslateX(content), distanceRef.current);
      rafRef.current = requestAnimationFrame(trackFade);
    };

    const startFadeTracking = () => {
      stopFadeTracking();
      rafRef.current = requestAnimationFrame(trackFade);
    };

    const moveTo = (target, getDuration) => {
      if (prefersReducedMotion.matches || distanceRef.current <= 1) return;
      if (transitionRafRef.current !== null) {
        cancelAnimationFrame(transitionRafRef.current);
        transitionRafRef.current = null;
      }

      const current = getTranslateX(content);
      const duration = getDuration(Math.abs(target - current));
      content.style.transition = 'none';
      content.style.transform = `translateX(${current}px)`;
      content.getBoundingClientRect();

      if (duration <= 0.01) {
        content.style.transform = `translateX(${target}px)`;
        updateFadeMask(container, target, distanceRef.current);
        return;
      }

      content.style.transition = `transform ${duration}s linear`;
      transitionRafRef.current = requestAnimationFrame(() => {
        transitionRafRef.current = null;
        content.style.transform = `translateX(${target}px)`;
        startFadeTracking();
      });
    };

    const handleMouseEnter = () => moveTo(
      -distanceRef.current,
      (remainingDistance) => remainingDistance / MARQUEE_FORWARD_SPEED_PX_PER_SECOND,
    );
    const handleMouseLeave = () => moveTo(0, () => MARQUEE_RETURN_DURATION_SECONDS);
    const handleTransitionEnd = (event) => {
      if (event.propertyName !== 'transform') return;
      stopFadeTracking();
      updateFadeMask(container, getTranslateX(content), distanceRef.current);
    };

    const updateOverflow = () => {
      const distance = Math.max(0, content.scrollWidth - container.clientWidth);
      const overflowsNow = distance > 1;
      distanceRef.current = distance;
      setOverflows(overflowsNow);

      if (!overflowsNow || prefersReducedMotion.matches) {
        content.style.transition = 'none';
        content.style.transform = 'translateX(0)';
        container.style.removeProperty('--marquee-fade-left');
        container.style.removeProperty('--marquee-fade-right');
        stopFadeTracking();
      } else {
        const current = Math.max(-distance, Math.min(0, getTranslateX(content)));
        content.style.transform = `translateX(${current}px)`;
        updateFadeMask(container, current, distance);
      }
    };

    updateOverflow();
    const resizeObserver = new ResizeObserver(updateOverflow);
    resizeObserver.observe(container);
    resizeObserver.observe(content);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);
    content.addEventListener('transitionend', handleTransitionEnd);
    prefersReducedMotion.addEventListener?.('change', updateOverflow);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      content.removeEventListener('transitionend', handleTransitionEnd);
      prefersReducedMotion.removeEventListener?.('change', updateOverflow);
      stopFadeTracking();
      if (transitionRafRef.current !== null) cancelAnimationFrame(transitionRafRef.current);
      content.style.removeProperty('transition');
      content.style.removeProperty('transform');
    };
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
