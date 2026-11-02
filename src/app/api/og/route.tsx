import { ImageResponse } from 'next/og';
import { connection } from 'next/server';
import { getTodayNumber } from '@/lib/data/puzzles';
import { ROUND_COUNT, gridScore, parseResultParams } from '@/lib/game/share';

// Palette mirrors src/app/globals.css (@theme).
const PAPER = '#f2f1ec';
const INK = '#141413';
const INK_2 = '#55534c';
const UP = '#0e7a3d';
const DOWN = '#bf2a1e';

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
          background: PAPER,
          color: INK,
          gap: 32,
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 800 }}>¿Qué subió más?</div>
        <div style={{ fontSize: 48 }}>{`#${params.number} · ${gridScore(params.grid)}/${ROUND_COUNT}`}</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {cells.map((cell, i) => (
            <div key={i} style={{ width: 110, height: 110, borderRadius: 16, background: cell === '1' ? UP : DOWN }} />
          ))}
        </div>
        <div style={{ fontSize: 28, color: INK_2 }}>Datos: INDEC · precios promedio GBA</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
