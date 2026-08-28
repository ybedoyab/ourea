import { useEffect, useRef } from 'react';
import { drawHillsideScene } from '../domain/hillsideWarning.js';

export function HillsideFallAnimation() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const width = canvas.width;
    const height = canvas.height;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduced) {
      drawHillsideScene(ctx, { width, height, t: 0.92, treat: false, title: 'Houses fall' });
      return undefined;
    }
    let play = 0;
    let last = performance.now();
    let frame = 0;

    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      play += dt / 3.6;
      if (play > 1.22) play = 0;
      const t = play > 1 ? 1 : play;
      ctx.clearRect(0, 0, width, height);
      drawHillsideScene(ctx, {
        width,
        height,
        t,
        treat: false,
        title: t < 0.2 ? 'Rain starts' : t < 0.5 ? 'Houses lean' : 'Houses fall',
      });
      frame = window.requestAnimationFrame(tick);
    }
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <figure className="hillside-anim" data-testid="hillside-fall-animation">
      <canvas ref={canvasRef} width="640" height="360" aria-hidden="true" />
      <figcaption>
        If nothing is done: rain, then houses fall. This loops as a warning graphic. Ourea does not predict a collapse year.
      </figcaption>
    </figure>
  );
}
