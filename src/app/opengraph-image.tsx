import { ImageResponse } from 'next/og';
import { OG_COLORS, OG_DISPLAY_FONT, OG_FONTS, OG_TEXT_FONT } from './fonts/og';

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
          background: OG_COLORS.paper,
          color: OG_COLORS.ink,
          fontFamily: OG_TEXT_FONT,
          gap: 32,
        }}
      >
        <div style={{ fontFamily: OG_DISPLAY_FONT, fontSize: 128, fontWeight: 800, letterSpacing: '-0.02em' }}>
          ¿Qué subió más?
        </div>
        <div style={{ fontSize: 40, color: OG_COLORS.ink2 }}>Adiviná qué producto aumentó más. Datos del INDEC.</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {[OG_COLORS.up, OG_COLORS.down, OG_COLORS.up, OG_COLORS.up, OG_COLORS.down].map((color, i) => (
            <div key={i} style={{ width: 72, height: 72, borderRadius: 12, background: color }} />
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: OG_FONTS },
  );
}
