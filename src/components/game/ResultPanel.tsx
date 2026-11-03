'use client';

import { useRef, type Ref } from 'react';
import { formatPuzzleDay } from '@/lib/game/calendar';
import { formatYoy } from '@/lib/game/format';
import { formatPeriod, shiftPeriod } from '@/lib/game/period';
import { gridScore, joinShareMessage, ROUND_COUNT, shareMessage, verdict } from '@/lib/game/share';
import type { Puzzle } from '@/lib/game/types';
import { Countdown } from './Countdown';
import { ShareActions } from './ShareActions';
import { Ticket } from './Ticket';

interface ResultPanelProps {
  puzzle: Puzzle;
  grid: string;
  spare: boolean;
  siteUrl: string;
  /** Consecutive days played, ending with this puzzle. */
  streak: number;
  onCountdownEnd: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
}

function selectText(node: HTMLElement | null) {
  const selection = window.getSelection();
  if (!node || !selection) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function ResultPanel({ puzzle, grid, spare, siteUrl, streak, onCountdownEnd, headingRef }: ResultPanelProps) {
  const message = shareMessage(puzzle.number, grid, siteUrl, streak);
  const score = gridScore(grid);
  const preRef = useRef<HTMLPreElement>(null);
  // The player has finished, so the ticket may name what rose more in each round.
  const lines = puzzle.rounds.map((round, i) => {
    const winner = round[round.answer];
    return { label: winner.name, amount: formatYoy(winner.yoy), hit: grid[i] === '1' };
  });

  return (
    <section aria-labelledby="result-heading" className="rise mt-8 grid gap-10 sm:mt-12 lg:grid-cols-[1fr_minmax(0,400px)] lg:gap-14">
      <div>
        <h2 id="result-heading" ref={headingRef} tabIndex={-1} className="text-[17px] font-semibold focus:outline-none">
          Tu resultado de hoy
        </h2>
        <p
          data-testid="final-score"
          className="condensed figures mt-2 text-[140px] leading-[0.82] font-bold tracking-[-0.04em] sm:text-[200px]"
        >
          {score}/{ROUND_COUNT}
        </p>
        <p className="mt-5 text-[19px] leading-snug text-balance sm:text-[22px]">{verdict(score)}</p>

        <pre
          ref={preRef}
          data-testid="share-text"
          className="mt-8 bg-paper-2 p-4 font-sans text-[15px] leading-relaxed wrap-break-word whitespace-pre-wrap select-all"
        >
          {joinShareMessage(message)}
        </pre>
        <div className="mt-4">
          <ShareActions
            message={message}
            card={{
              number: puzzle.number,
              grid,
              day: formatPuzzleDay(puzzle.date),
              prices: `${formatPeriod(shiftPeriod(puzzle.period, -12))} → ${formatPeriod(puzzle.period)}`,
            }}
            imageName={`inflazo-${puzzle.number}.png`}
            onCopyFailed={() => selectText(preRef.current)}
          />
        </div>

        <p className="mt-8 text-[17px]">
          <Countdown day={spare ? null : puzzle.date} onEnd={onCountdownEnd} />
        </p>
      </div>

      <Ticket
        className="w-full lg:mt-8 lg:rotate-[1.5deg]"
        title={`Ticket #${puzzle.number}`}
        subtitle={`Lo que más subió, ${formatPeriod(shiftPeriod(puzzle.period, -12))} a ${formatPeriod(puzzle.period)}`}
        lines={lines}
        total={`${score}/${ROUND_COUNT}`}
      />
      <p className="text-[14px] text-ink-2 lg:col-span-2">
        Precios promedio del Gran Buenos Aires, publicados por el INDEC.
      </p>
    </section>
  );
}
