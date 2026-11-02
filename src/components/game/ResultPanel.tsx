'use client';

import { useRef, type Ref } from 'react';
import { gridScore, gridToEmoji, joinShareMessage, ogImagePath, ROUND_COUNT, shareMessage, verdict } from '@/lib/game/share';
import type { Puzzle } from '@/lib/game/types';
import { Countdown } from './Countdown';
import { ShareActions } from './ShareActions';

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

  return (
    <section aria-labelledby="result-heading" className="rise mt-8 sm:mt-12">
      <h2 id="result-heading" ref={headingRef} tabIndex={-1} className="text-[17px] font-semibold focus:outline-none">
        Tu resultado de hoy
      </h2>

      <div className="mt-2 grid gap-8 sm:grid-cols-[1.1fr_1fr] sm:gap-12">
        <div>
          <p
            data-testid="final-score"
            className="condensed figures text-[140px] leading-[0.82] font-bold tracking-[-0.04em] sm:text-[220px]"
          >
            {score}/{ROUND_COUNT}
          </p>
          <p className="mt-5 text-[19px] leading-snug text-balance sm:text-[22px]">{verdict(score)}</p>
          <p className="mt-6 text-[28px] leading-none tracking-[0.08em]" aria-label={`${score} de ${ROUND_COUNT} correctas`}>
            {gridToEmoji(grid)}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <pre
            ref={preRef}
            data-testid="share-text"
            className="bg-paper-2 p-4 font-sans text-[15px] leading-relaxed wrap-break-word whitespace-pre-wrap select-all"
          >
            {joinShareMessage(message)}
          </pre>
          <ShareActions
            message={message}
            imagePath={ogImagePath(puzzle.number, grid)}
            imageName={`que-subio-mas-${puzzle.number}.png`}
            onCopyFailed={() => selectText(preRef.current)}
          />

          <div className="mt-4 bg-ink p-5 text-paper">
            <p className="text-[15px]">
              <Countdown day={spare ? null : puzzle.date} onEnd={onCountdownEnd} />
            </p>
          </div>
        </div>
      </div>

      <p className="mt-10 text-[14px] text-ink-2">Fuente: INDEC, API ipc_nacional (precios promedio GBA).</p>
    </section>
  );
}
