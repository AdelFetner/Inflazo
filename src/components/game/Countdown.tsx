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
  /**
   * Argentina day (`YYYY-MM-DD`) of the puzzle on screen; the countdown ends once that day is over.
   * `null` for a spare puzzle (it is not today's): it then ends at the first midnight it sees.
   */
  day: string | null;
  onEnd: () => void;
}

/** `Próximo desafío en HH:MM:SS`; calls `onEnd` once and shows a loading line after the day is over. */
export function Countdown({ day, onEnd }: CountdownProps) {
  const seconds = useSyncExternalStore(subscribe, nowSeconds, serverSnapshot);
  const today = seconds === null ? null : argentinaDate(new Date(seconds * 1000));
  const firstDay = useRef<string | null>(null);
  const ended = useRef(false);

  useEffect(() => {
    if (today === null || ended.current) return;
    firstDay.current ??= today;
    if (today > (day ?? firstDay.current)) {
      ended.current = true;
      onEnd();
    }
  }, [today, day, onEnd]);

  if (day !== null && today !== null && today > day) {
    return <span role="status">Cargando el desafío de hoy…</span>;
  }
  return (
    <>
      Próximo desafío en{' '}
      <time className="condensed figures text-[24px] font-bold">
        {seconds === null ? '--:--:--' : formatRemaining(msUntilNextPuzzle(new Date(seconds * 1000)))}
      </time>
    </>
  );
}
