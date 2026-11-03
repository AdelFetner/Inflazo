import { ImageResponse } from 'next/og';
import { connection } from 'next/server';
import { OG_FONTS } from '@/app/_og/fonts';
import { ResultCard } from '@/app/_og/result-card';
import { OG_SIZE } from '@/app/_og/theme';
import { getPuzzle, getTodayNumber } from '@/lib/data/puzzles';
import { dateForPuzzleNumber, formatPuzzleDay } from '@/lib/game/calendar';
import { formatPeriod, shiftPeriod } from '@/lib/game/period';
import { parseResultParams } from '@/lib/game/share';

/** Link-preview image for /r pages. Crawlers can't run script, so this one is drawn on the server. */
export async function GET(request: Request) {
  // Request-time: today's number changes daily, so the upper bound must be read per request.
  await connection();
  const { searchParams } = new URL(request.url);
  const params = parseResultParams(searchParams.get('n') ?? '', searchParams.get('g') ?? '', getTodayNumber());
  if (!params) {
    return new Response('Parámetros inválidos', { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  const puzzle = getPuzzle(params.number);
  return new ImageResponse(
    (
      <ResultCard
        number={params.number}
        grid={params.grid}
        day={formatPuzzleDay(dateForPuzzleNumber(params.number))}
        prices={puzzle ? `${formatPeriod(shiftPeriod(puzzle.period, -12))} → ${formatPeriod(puzzle.period)}` : 'último año'}
      />
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
