import { ImageResponse } from 'next/og';

// Palette mirrors src/app/globals.css (@theme).
const PAPER = '#f2f1ec';
const INK = '#141413';
const INK_2 = '#55534c';
const UP = '#0e7a3d';
const DOWN = '#bf2a1e';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = '¿Qué subió más?';

export default function OpengraphImage() {
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
        <div style={{ fontSize: 96, fontWeight: 800 }}>¿Qué subió más?</div>
        <div style={{ fontSize: 40, color: INK_2 }}>Adiviná qué producto aumentó más. Datos del INDEC.</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {[UP, DOWN, UP, UP, DOWN].map((color, i) => (
            <div key={i} style={{ width: 72, height: 72, borderRadius: 12, background: color }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
