'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { argentinaDate, msUntilNextPuzzle } from '@/lib/game/calendar';

function subscribe(onTick: () => void): () => void {
  const id = window.setInterval(onTick, 1000);
  return () => window.clearInterval(id);
}

/** Current time in whole seconds (stable within a second, as useSyncExternalStore requires). */
function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function serverSnapshot(): null {
  return null;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

interface CountdownProps {
  onEnd: () => void;
  className?: string;
}

/** `HH:MM:SS` until the next Argentina midnight; calls `onEnd` once the day rolls over. */
export function Countdown({ onEnd, className }: CountdownProps) {
  const seconds = useSyncExternalStore(subscribe, nowSeconds, serverSnapshot);
  const startDay = useRef<string | null>(null);

  useEffect(() => {
    if (seconds === null) return;
    const day = argentinaDate(new Date(seconds * 1000));
    if (startDay.current === null) startDay.current = day;
    else if (day !== startDay.current) {
      startDay.current = day;
      onEnd();
    }
  }, [seconds, onEnd]);

  const label = seconds === null ? '--:--:--' : formatRemaining(msUntilNextPuzzle(new Date(seconds * 1000)));
  return (
    <time className={className} suppressHydrationWarning>
      {label}
    </time>
  );
}
