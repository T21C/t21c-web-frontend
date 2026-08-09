// tuf-search: #SubmissionPage #SubmissionBinaryStar #binaryStar
import { useEffect, useRef } from 'react';
import planetBlue from '@/assets/submission/planet_blue.png';
import planetRed from '@/assets/submission/planet_red.png';
import trailBlue from '@/assets/submission/trail_blue.png';
import trailRed from '@/assets/submission/trail_red.png';

/**
 * Uniform system scale. Orbit radius, planet size, and trail particles all live in
 * body-local design units and are scaled together via --binary-scale on the body.
 * Move/animate the body (not individual planets) so trails stay locked to it.
 */
const BINARY_SCALE = 1;

/** Design-unit sizes (pre-scale). */
const ORBIT_RADIUS = 48;
const PLANET_SIZE = 72;
const PARTICLE_SIZE = 110;

/** Mutual orbit revolutions per second. */
const ORBIT_SPEED = 0.12;
/** Self-spin revolutions per second. */
const PLANET_SPIN_SPEED = 0.35;
/** Arc length of the trail in degrees; particle life matches time to travel this arc. */
const PARTICLE_TAIL_DEG = 135;
const SPAWN_INTERVAL_MS = 110;
const MAX_PARTICLES = 150;
/** Initial scale; CSS decays this to 0 over particle life. */
const PARTICLE_SCALE_START = 0.8;

const TAU = Math.PI * 2;
const PARTICLE_LIFE_MS = ORBIT_SPEED > 0
  ? (PARTICLE_TAIL_DEG / 360) / ORBIT_SPEED * 1000
  : 1000;

const TRAIL_SRC = {
  blue: trailBlue,
  red: trailRed,
};

/**
 * Binary-star system: planets orbit in body-local space; trails spawn in that same
 * space so they stay attached when the body is moved/scaled.
 */
export function SubmissionBinaryStar({ enabled = true, scale = BINARY_SCALE }) {
  const bodyRef = useRef(null);
  const trailRef = useRef(null);
  const blueRef = useRef(null);
  const redRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    const body = bodyRef.current;
    const trail = trailRef.current;
    const blue = blueRef.current;
    const red = redRef.current;
    if (!body || !trail || !blue || !red) return undefined;

    body.style.setProperty('--binary-scale', String(scale));
    blue.style.width = `${PLANET_SIZE}px`;
    blue.style.height = `${PLANET_SIZE}px`;
    red.style.width = `${PLANET_SIZE}px`;
    red.style.height = `${PLANET_SIZE}px`;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const particles = [];
    let rafId = 0;
    let lastSpawn = 0;
    let angle = 0;
    let spinAngle = 0;
    let prevTs = 0;

    const placePlanet = (el, x, y, spinRad) => {
      const spinDeg = (spinRad * 180) / Math.PI;
      // Body-local orbit position + self-spin only (no world offset).
      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${spinDeg}deg)`;
    };

    const removeParticle = (particle) => {
      const index = particles.indexOf(particle);
      if (index !== -1) particles.splice(index, 1);
      particle.el.remove();
    };

    const spawnAt = (x, y, tint) => {
      if (particles.length >= MAX_PARTICLES) {
        removeParticle(particles[0]);
      }

      const el = document.createElement('img');
      el.className = 'submission-binary__particle';
      el.src = TRAIL_SRC[tint];
      el.alt = '';
      el.draggable = false;

      const rot = Math.random() * 360;
      // Spawn in body-local coordinates so trails track the body, not the page.
      el.style.setProperty('--particle-x', `${x}px`);
      el.style.setProperty('--particle-y', `${y}px`);
      el.style.setProperty('--particle-rot', `${rot}deg`);
      el.style.setProperty('--particle-scale-start', String(PARTICLE_SCALE_START));
      el.style.setProperty('--particle-size', `${PARTICLE_SIZE}px`);
      el.style.setProperty('--particle-life', `${PARTICLE_LIFE_MS}ms`);

      const particle = { el };
      el.addEventListener('animationend', () => removeParticle(particle), { once: true });

      trail.appendChild(el);
      particles.push(particle);
    };

    const tick = (ts) => {
      if (!prevTs) prevTs = ts;
      const dt = ts - prevTs;
      prevTs = ts;

      if (!reducedMotion) {
        const turn = TAU * (dt / 1000);
        angle += ORBIT_SPEED * turn;
        spinAngle += PLANET_SPIN_SPEED * turn;
      }

      const bx = Math.cos(angle) * ORBIT_RADIUS;
      const by = Math.sin(angle) * ORBIT_RADIUS;
      const rx = Math.cos(angle + Math.PI) * ORBIT_RADIUS;
      const ry = Math.sin(angle + Math.PI) * ORBIT_RADIUS;

      placePlanet(blue, bx, by, spinAngle);
      placePlanet(red, rx, ry, spinAngle * 0.9);

      if (!reducedMotion && ts - lastSpawn >= SPAWN_INTERVAL_MS) {
        lastSpawn = ts;
        spawnAt(bx, by, 'blue');
        spawnAt(rx, ry, 'red');
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      particles.forEach((p) => p.el.remove());
      particles.length = 0;
    };
  }, [enabled, scale]);

  return (
    <div className="submission-binary" aria-hidden="true">
      {/*
        Body = local space for orbit + trails.
        Scale via --binary-scale; later translate/animate this node to move the whole system
        without breaking trail attachment.
      */}
      <div
        className="submission-binary__body"
        ref={bodyRef}
        style={{ '--binary-scale': scale }}
      >
        <div className="submission-binary__trail" ref={trailRef} />
        <img
          ref={blueRef}
          className="submission-binary__planet submission-binary__planet--blue"
          src={planetBlue}
          alt=""
          draggable={false}
        />
        <img
          ref={redRef}
          className="submission-binary__planet submission-binary__planet--red"
          src={planetRed}
          alt=""
          draggable={false}
        />
      </div>
    </div>
  );
}
