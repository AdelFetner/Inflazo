'use client';

import type { Ref } from 'react';
import { formatPrice } from '@/lib/game/format';
import type { Answer, RoundItem } from '@/lib/game/types';
import { AnimatedPercent } from './AnimatedPercent';

interface RoundCardProps {
  side: Answer;
  item: RoundItem;
  /** Month of the earlier price, e.g. `sep 2025`. */
  fromLabel: string;
  revealed: boolean;
  /** This option is the right answer. */
  correct: boolean;
  /** The option the player picked, if any. */
  chosen: Answer | undefined;
  onChoose: (answer: Answer) => void;
  ref?: Ref<HTMLButtonElement>;
}

export function RoundCard({ side, item, fromLabel, revealed, correct, chosen, onChoose, ref }: RoundCardProps) {
  const result = !revealed ? undefined : correct ? 'correct' : chosen === side ? 'wrong' : undefined;
  const tone =
    result === 'correct'
      ? 'bg-up text-white'
      : result === 'wrong'
        ? 'bg-down text-white'
        : revealed
          ? 'bg-paper-2 text-ink'
          : 'bg-paper-2 text-ink hover:bg-paper-3 active:scale-[0.985]';
  const muted = result ? 'text-white' : 'text-ink-2';
  const verdict = result === 'correct' ? (chosen === side ? 'Subió más. Acertaste.' : 'Subió más') : result === 'wrong' ? 'Tu elección' : null;
  // Units come as INDEC labels ("kg", "Litro", "Env. 4 u"); read them mid-sentence.
  const unit = item.unit.charAt(0).toLowerCase() + item.unit.slice(1);

  return (
    <button
      ref={ref}
      type="button"
      data-testid={`option-${side}`}
      data-result={result}
      disabled={revealed}
      onClick={() => onChoose(side)}
      className={`group flex min-h-48 w-full flex-col items-start justify-between gap-6 p-5 text-left transition-[background-color,transform] duration-200 ease-out-quart sm:min-h-64 sm:p-7 ${tone}`}
    >
      <span className="block">
        <span className="block text-[22px] leading-[1.1] font-semibold tracking-[-0.01em] text-balance sm:text-[28px]">
          {item.name}
        </span>
        <span className={`mt-1.5 block text-[15px] ${muted}`}> por {unit}</span>
      </span>

      {/* Same slot height before and after the reveal, so nothing below the cards moves. */}
      <span className="flex min-h-[116px] w-full flex-col justify-end sm:min-h-[140px]">
        {revealed ? (
          <span className="rise block w-full">
            <span className="mb-1 block text-[15px] font-semibold"> {verdict ?? '\u00a0'}</span>
            <AnimatedPercent
              value={item.yoy}
              className="condensed figures block text-[56px] leading-[0.9] font-bold tracking-[-0.03em] sm:text-[80px]"
            />
            <span className={`figures mt-3 block text-[15px] ${muted}`}>
              {' '}
              {formatPrice(item.from)} → {formatPrice(item.to)}
            </span>
          </span>
        ) : (
          <span className="block">
            <span className="block text-[15px] text-ink-2"> Precio en {fromLabel}</span>
            <span className="condensed figures mt-1 block text-[40px] leading-[0.95] font-bold tracking-[-0.02em] sm:text-[52px]">
              {formatPrice(item.from)}
            </span>
          </span>
        )}
      </span>
    </button>
  );
}
