'use client';

import type { Ref } from 'react';
import { gridScore } from '@/lib/game/share';
import { computeStats } from '@/lib/game/stats';
import { Dialog } from './Dialog';

interface StatsDialogProps {
  history: Record<string, string>;
  /** Puzzle number of the current Argentina day, read when the dialog opens. */
  todayNumber: number;
  /** Grid of the puzzle on screen, when finished: its score is highlighted. */
  grid: string | undefined;
  ref?: Ref<HTMLDialogElement>;
}

export function StatsDialog({ history, todayNumber, grid, ref }: StatsDialogProps) {
  const stats = computeStats(history, todayNumber);
  const highest = Math.max(1, ...stats.distribution);
  const todayScore = grid === undefined ? null : gridScore(grid);
  const figures = [
    ['Jugados', stats.played],
    ['Racha actual', stats.currentStreak],
    ['Mejor racha', stats.maxStreak],
  ] as const;

  return (
    <Dialog ref={ref} title="Estadísticas">
      <dl className="grid grid-cols-3 gap-3">
        {figures.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 bg-paper-2 p-3">
            <dt className="text-[14px] leading-tight text-ink-2">{label}</dt>
            <dd className="condensed figures order-first text-[44px] leading-none font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      <h3 className="mt-8 text-[17px] font-semibold">Distribución</h3>
      <ol className="mt-3 flex flex-col gap-1.5" aria-label="Partidas por puntaje">
        {stats.distribution.map((count, score) => (
          <li key={score} className="flex items-center gap-3">
            <span className="figures w-4 text-[15px] font-semibold">{score}</span>
            <span className="flex-1">
              <span
                className={`figures flex h-7 min-w-8 items-center justify-end px-2 text-[14px] font-semibold ${
                  score === todayScore ? 'bg-up text-white' : count > 0 ? 'bg-ink text-paper' : 'bg-paper-2 text-ink-2'
                }`}
                style={{ width: `${(count / highest) * 100}%` }}
              >
                <span className="sr-only">{score} aciertos: </span>
                {count}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Dialog>
  );
}
