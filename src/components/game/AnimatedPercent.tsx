'use client';

import { useLayoutEffect, useRef } from 'react';
import { formatYoy } from '@/lib/game/format';

const DURATION_MS = 600;

interface AnimatedPercentProps {
  value: number;
  className?: string;
}

/** Year-over-year change that counts up from 0 (instant when the user prefers reduced motion). */
export function AnimatedPercent({ value, className }: AnimatedPercentProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let start: number | null = null;
    const step = (time: number) => {
      start ??= time;
      const progress = Math.min(1, (time - start) / DURATION_MS);
      const eased = 1 - (1 - progress) ** 3;
      node.textContent = formatYoy(Math.round(value * eased * 10) / 10);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    node.textContent = formatYoy(0);
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      node.textContent = formatYoy(value);
    };
  }, [value]);

  // Server and no-JS output is the final figure; the effect rewinds it to 0 before the first paint.
  return (
    <span ref={ref} className={className}>
      {formatYoy(value)}
    </span>
  );
}
