'use client';

import { useEffect, useRef, useState, type Ref } from 'react';
import { gridScore, gridToEmoji, ROUND_COUNT, shareText } from '@/lib/game/share';
import type { Puzzle } from '@/lib/game/types';
import { Countdown } from './Countdown';

interface ResultPanelProps {
  puzzle: Puzzle;
  grid: string;
  siteUrl: string;
  onCountdownEnd: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
}

const VERDICTS = [
  'Ni una. Mañana hay revancha.',
  'Una de cinco. La inflación es traicionera.',
  'Dos de cinco. Cuesta seguirle el ritmo.',
  'Tres de cinco. Bien ahí.',
  'Cuatro de cinco. Tenés ojo de góndola.',
  'Cinco de cinco. Ni el INDEC lo sabía tan bien.',
];

function selectText(node: HTMLElement | null) {
  const selection = window.getSelection();
  if (!node || !selection) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function ResultPanel({ puzzle, grid, siteUrl, onCountdownEnd, headingRef }: ResultPanelProps) {
  const text = shareText(puzzle.number, grid, siteUrl);
  const score = gridScore(grid);
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function share() {
    if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      selectText(preRef.current);
    }
  }

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
          <p className="mt-5 text-[19px] leading-snug text-balance sm:text-[22px]">{VERDICTS[score]}</p>
          <p className="mt-6 text-[28px] leading-none tracking-[0.08em]" aria-label={`${score} de ${ROUND_COUNT} correctas`}>
            {gridToEmoji(grid)}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <pre
            ref={preRef}
            data-testid="share-text"
            className="bg-paper-2 p-4 font-sans text-[15px] leading-relaxed break-all whitespace-pre-wrap select-all"
          >
            {text}
          </pre>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={share}
              className="h-14 flex-1 bg-ink px-6 text-[17px] font-semibold text-paper transition-[background-color,transform] duration-150 hover:bg-accent active:scale-[0.98]"
            >
              Compartir
            </button>
            <p role="status" className="w-24 text-[15px] font-semibold text-up">
              {copied ? '¡Copiado!' : ''}
            </p>
          </div>

          <div className="mt-4 bg-ink p-5 text-paper">
            <p className="text-[15px]">
              Próximo puzzle en{' '}
              <Countdown onEnd={onCountdownEnd} className="condensed figures text-[24px] font-bold" />
            </p>
          </div>
        </div>
      </div>

      <p className="mt-10 text-[14px] text-ink-2">Fuente: INDEC, API ipc_nacional (precios promedio GBA).</p>
    </section>
  );
}
