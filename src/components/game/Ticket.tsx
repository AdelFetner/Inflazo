import type { ReactNode } from 'react';

export interface TicketLine {
  label: ReactNode;
  /** Right-aligned figure before the mark, e.g. `+205,4%`. */
  amount?: string;
  hit: boolean;
}

interface TicketProps {
  title: string;
  subtitle: string;
  lines: TicketLine[];
  total: string;
  className?: string;
}

const TEETH = 24;
// Torn bottom edge: TEETH triangles across a 0–100 box, stretched to the ticket's width.
const TEETH_POINTS = [
  '0,0',
  '100,0',
  ...Array.from({ length: TEETH }, (_, i) => {
    const right = 100 - (i * 100) / TEETH;
    return `${right - 50 / TEETH},10 ${right - 100 / TEETH},0`;
  }),
].join(' ');

/**
 * A supermarket ticket: one line per round with a ✓/✗ mark and the total.
 * The same object as the shared OG card, so the game, the shared page and the preview match.
 */
export function Ticket({ title, subtitle, lines, total, className = '' }: TicketProps) {
  return (
    // data-ui: the ticket is the game's own object, so it keeps its receipt rules and figures.
    <figure data-ui className={`flex flex-col ${className}`}>
      <div className="bg-receipt px-6 pt-6 pb-5 sm:px-7">
        <figcaption className="text-center">
          <span className="condensed block text-[26px] leading-none font-bold">{title}</span>
          <span className="mt-1.5 block text-[14px] text-ink-2">{subtitle}</span>
        </figcaption>
        <ul className="mt-5 grid gap-2.5 border-t-2 border-dashed border-paper-3 pt-5">
          {lines.map((line, i) => (
            <li key={i} className="flex items-center gap-3 text-[16px] leading-snug">
              <span className="min-w-0 flex-1">{line.label}</span>
              {line.amount && <span className="figures text-ink-2">{line.amount}</span>}
              <span
                className={`grid size-7 shrink-0 place-items-center text-white ${line.hit ? 'bg-up' : 'bg-down'}`}
                aria-label={line.hit ? 'acierto' : 'error'}
                role="img"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                  <path
                    d={line.hit ? 'M4.5 12.5l5 5L19.5 7' : 'M6 6l12 12M18 6L6 18'}
                    stroke="currentColor"
                    strokeWidth="3.4"
                    strokeLinecap="square"
                  />
                </svg>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-5 flex items-baseline justify-between border-t-2 border-dashed border-paper-3 pt-4">
          <span className="condensed text-[22px] font-bold">Total</span>
          <span className="condensed figures text-[40px] leading-none font-bold">{total}</span>
        </p>
      </div>
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="block h-3 w-full text-receipt" aria-hidden="true">
        <polygon points={TEETH_POINTS} fill="currentColor" />
      </svg>
    </figure>
  );
}
