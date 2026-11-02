import { ImageResponse } from 'next/og';
import { OgFrame, OG_SIZE, Receipt } from './_og/parts';
import { OG_COLORS, OG_DISPLAY_FONT, OG_FONTS } from './fonts/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = '¿Qué subió más? Un juego diario con los precios del INDEC';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgFrame
        cta="Jugá el de hoy"
        receipt={<Receipt title="TICKET DE HOY" subtitle="Precios promedio GBA" marks={Array(5).fill('unknown')} total="?/5" />}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 34,
            fontFamily: OG_DISPLAY_FONT,
            fontSize: 128,
            fontWeight: 800,
            lineHeight: 0.9,
            letterSpacing: '-0.03em',
          }}
        >
          <div style={{ display: 'flex' }}>¿Qué subió</div>
          <div style={{ display: 'flex' }}>más?</div>
        </div>
        <div style={{ display: 'flex', fontSize: 36, lineHeight: 1.25, marginTop: 24, width: 600 }}>
          Dos productos del súper. Adiviná cuál aumentó más en el último año.
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: OG_COLORS.ink2, marginTop: 14 }}>
          Cinco rondas por día · Datos del INDEC
        </div>
      </OgFrame>
    ),
    { ...size, fonts: OG_FONTS },
  );
}
