import { ImageResponse } from 'next/og';
import { connection } from 'next/server';
import { OG_COLORS, OG_DISPLAY_FONT, OG_FONTS, OG_TEXT_FONT } from '@/app/fonts/og';
import { getTodayNumber } from '@/lib/data/puzzles';
import { ROUND_COUNT, gridScore, parseResultParams } from '@/lib/game/share';

export async function GET(request: Request) {
  // Request-time: today's number changes daily, so the upper bound must be read per request.
  await connection();
  const { searchParams } = new URL(request.url);
  const params = parseResultParams(searchParams.get('n') ?? '', searchParams.get('g') ?? '', getTodayNumber());
  if (!params) {
    return new Response('Parámetros inválidos', { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  const cells = [...params.grid];
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: OG_COLORS.paper,
          color: OG_COLORS.ink,
          fontFamily: OG_TEXT_FONT,
          gap: 32,
        }}
      >
        <div style={{ fontFamily: OG_DISPLAY_FONT, fontSize: 96, fontWeight: 800, letterSpacing: '-0.02em' }}>
          ¿Qué subió más?
        </div>
        <div style={{ fontSize: 48 }}>{`#${params.number} · ${gridScore(params.grid)}/${ROUND_COUNT}`}</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {cells.map((cell, i) => (
            <div
              key={i}
              style={{ width: 110, height: 110, borderRadius: 16, background: cell === '1' ? OG_COLORS.up : OG_COLORS.down }}
            />
          ))}
        </div>
        <div style={{ fontSize: 28, color: OG_COLORS.ink2 }}>Datos: INDEC · precios promedio GBA</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: OG_FONTS,
      // A valid (n, g) always renders the same image, so browsers and the CDN may keep it forever.
      headers: { 'cache-control': 'public, max-age=31536000, s-maxage=31536000, immutable' },
    },
  );
}
