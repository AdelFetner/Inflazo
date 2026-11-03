import { ImageResponse } from 'next/og';
import { connection } from 'next/server';
import { OgFrame, OG_SIZE, Receipt, type Mark } from '@/app/_og/parts';
import { OG_COLORS, OG_DISPLAY_FONT, OG_FONTS } from '@/app/fonts/og';
import { getPuzzle, getTodayNumber } from '@/lib/data/puzzles';
import { dateForPuzzleNumber, formatPuzzleDay } from '@/lib/game/calendar';
import { formatPeriod, shiftPeriod } from '@/lib/game/period';
import { ROUND_COUNT, challenge, gridScore, parseResultParams, verdictLine } from '@/lib/game/share';

export async function GET(request: Request) {
  // Request-time: today's number changes daily, so the upper bound must be read per request.
  await connection();
  const { searchParams } = new URL(request.url);
  const params = parseResultParams(searchParams.get('n') ?? '', searchParams.get('g') ?? '', getTodayNumber());
  if (!params) {
    return new Response('Parámetros inválidos', { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  const score = gridScore(params.grid);
  const day = formatPuzzleDay(dateForPuzzleNumber(params.number));
  const marks = [...params.grid].map((cell): Mark => (cell === '1' ? 'hit' : 'miss'));
  const puzzle = getPuzzle(params.number);
  const prices = puzzle ? `${formatPeriod(shiftPeriod(puzzle.period, -12))} → ${formatPeriod(puzzle.period)}` : 'último año';

  return new ImageResponse(
    (
      <OgFrame
        cta={`${challenge(score)} Jugá el de hoy`}
        receipt={<Receipt title={`TICKET N.º ${params.number}`} subtitle={`Precios ${prices}`} marks={marks} total={`${score}/${ROUND_COUNT}`} />}
      >
        <div style={{ display: 'flex', fontSize: 26, color: OG_COLORS.ink2, marginTop: 30 }}>{`Desafío #${params.number} · ${day}`}</div>
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
    ),
    {
      ...OG_SIZE,
      fonts: OG_FONTS,
      // A valid (n, g) always renders the same image, so browsers and the CDN may keep it forever.
      // s-maxage alone never reached Vercel's CDN (every request was a MISS); its own header is honoured.
      headers: {
        'cache-control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'vercel-cdn-cache-control': 'max-age=31536000',
      },
    },
  );
}
