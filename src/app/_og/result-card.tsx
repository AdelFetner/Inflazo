import { OgFrame, Receipt, type Mark } from './parts';
import { OG_COLORS, OG_DISPLAY_FONT } from './theme';
import { ROUND_COUNT, challenge, gridScore, verdictLine } from '@/lib/game/share';

export interface ResultCardProps {
  number: number;
  grid: string;
  /** Puzzle day, e.g. `3 de noviembre`. */
  day: string;
  /** Price window, e.g. `sep 2025 → sep 2026`. */
  prices: string;
}

/**
 * The 1200×630 result card. Rendered by Satori on the server for link previews (api/og) and in
 * the browser for the downloaded or shared PNG, so both images are the same.
 */
export function ResultCard({ number, grid, day, prices }: ResultCardProps) {
  const score = gridScore(grid);
  const marks = [...grid].map((cell): Mark => (cell === '1' ? 'hit' : 'miss'));
  return (
    <OgFrame
      cta={`${challenge(score)} Jugá el de hoy`}
      receipt={<Receipt title={`TICKET N.º ${number}`} subtitle={`Precios ${prices}`} marks={marks} total={`${score}/${ROUND_COUNT}`} />}
    >
      <div style={{ display: 'flex', fontSize: 26, color: OG_COLORS.ink2, marginTop: 30 }}>{`Desafío #${number} · ${day}`}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 4, fontFamily: OG_DISPLAY_FONT, fontWeight: 800 }}>
        <div style={{ display: 'flex', fontSize: 230, lineHeight: 0.86, letterSpacing: '-0.04em' }}>{String(score)}</div>
        <div style={{ display: 'flex', fontSize: 104, lineHeight: 1, color: OG_COLORS.ink2, marginLeft: 10, marginBottom: 6 }}>
          {`/${ROUND_COUNT}`}
        </div>
      </div>
      <div style={{ display: 'flex', fontSize: 42, lineHeight: 1.15, marginTop: 14, width: 600 }}>{verdictLine(score)}</div>
      <div style={{ display: 'flex', fontSize: 25, lineHeight: 1.3, marginTop: 12, width: 600, color: OG_COLORS.ink2 }}>
        Dos productos del súper: ¿cuál aumentó más? Precios oficiales del INDEC.
      </div>
    </OgFrame>
  );
}
