import type { ReactNode } from 'react';
import { OG_COLORS, OG_DISPLAY_FONT, OG_TEXT_FONT } from '@/app/fonts/og';
import { getSiteUrl, SITE_NAME } from '@/lib/site';

// Building blocks shared by the site card (opengraph-image.tsx) and the result card (api/og).
// Satori only lays out flexbox: every element with more than one child sets display: flex.

export const OG_SIZE = { width: 1200, height: 630 } as const;
const BAND_HEIGHT = 104;
const RECEIPT_WIDTH = 372;

/** Paper background, content on the left, a receipt pinned on the right, a call to action at the bottom. */
export function OgFrame({ children, receipt, cta }: { children: ReactNode; receipt: ReactNode; cta: string }) {
  const host = new URL(getSiteUrl()).host;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: OG_COLORS.paper,
        color: OG_COLORS.ink,
        fontFamily: OG_TEXT_FONT,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '44px 0 0 64px', width: 760 }}>
        <Brand />
        {children}
      </div>

      <div
        style={{
          height: BAND_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          padding: '0 64px',
          background: OG_COLORS.ink,
          color: OG_COLORS.paper,
        }}
      >
        {/* X overlays the domain on the bottom-left corner of cards: keep only filler text there. */}
        <div style={{ display: 'flex', flex: 1, fontSize: 24, color: OG_COLORS.paper3, letterSpacing: '0.08em' }}>INDEC</div>
        <div style={{ display: 'flex', fontFamily: OG_DISPLAY_FONT, fontSize: 44, fontWeight: 800, letterSpacing: '-0.01em' }}>
          {cta}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginLeft: 28,
            padding: '8px 18px 10px',
            background: OG_COLORS.up,
            fontSize: 30,
          }}
        >
          {host}
          <Arrow color={OG_COLORS.paper} size={26} />
        </div>
      </div>

      <div style={{ position: 'absolute', top: 34, right: 72, display: 'flex', transform: 'rotate(2.5deg)' }}>{receipt}</div>
    </div>
  );
}

function Brand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', background: OG_COLORS.ink }}>
        <Arrow color={OG_COLORS.paper} size={32} up />
      </div>
      <div style={{ display: 'flex', fontFamily: OG_DISPLAY_FONT, fontSize: 34, fontWeight: 800, letterSpacing: '0.04em' }}>
        {SITE_NAME.toUpperCase()}
      </div>
    </div>
  );
}

function Arrow({ color, size, up = false }: { color: string; size: number; up?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={up ? { transform: 'rotate(-45deg)' } : undefined}>
      <path d="M4 12h15M13 6l6 6-6 6" stroke={color} strokeWidth={3} fill="none" strokeLinecap="square" />
    </svg>
  );
}

function Dashes() {
  return (
    <svg width={RECEIPT_WIDTH - 56} height={4} style={{ margin: '14px 0' }}>
      <line x1={0} y1={2} x2={RECEIPT_WIDTH - 56} y2={2} stroke={OG_COLORS.ink2} strokeWidth={2} strokeDasharray="7 6" />
    </svg>
  );
}

/** Torn edge at the bottom of the receipt. */
function Teeth() {
  const tooth = 18;
  const depth = 14;
  const points = [`0,0`, `${RECEIPT_WIDTH},0`];
  for (let x = RECEIPT_WIDTH; x > 0; x -= tooth) points.push(`${x - tooth / 2},${depth}`, `${Math.max(0, x - tooth)},0`);
  return (
    <svg width={RECEIPT_WIDTH} height={depth} viewBox={`0 0 ${RECEIPT_WIDTH} ${depth}`}>
      <polygon points={points.join(' ')} fill={OG_COLORS.receipt} />
    </svg>
  );
}

export type Mark = 'hit' | 'miss' | 'unknown';

function MarkBox({ mark }: { mark: Mark }) {
  const background = mark === 'hit' ? OG_COLORS.up : mark === 'miss' ? OG_COLORS.down : OG_COLORS.paper3;
  return (
    <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background }}>
      {mark === 'unknown' ? (
        <div style={{ display: 'flex', fontFamily: OG_DISPLAY_FONT, fontSize: 30, fontWeight: 800, color: OG_COLORS.ink2 }}>?</div>
      ) : (
        <svg width={28} height={28} viewBox="0 0 24 24">
          <path
            d={mark === 'hit' ? 'M4.5 12.5l5 5L19.5 7' : 'M6 6l12 12M18 6L6 18'}
            stroke={OG_COLORS.paper}
            strokeWidth={3.4}
            fill="none"
            strokeLinecap="square"
          />
        </svg>
      )}
    </div>
  );
}

/** A supermarket receipt: one line per round, the total at the bottom. Spoiler-free: no products. */
export function Receipt({ title, subtitle, marks, total }: { title: string; subtitle: string; marks: Mark[]; total: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', filter: 'drop-shadow(0 14px 22px rgba(20,20,19,0.22))' /* taste-skill-ignore: the ticket lies on the page as paper */ }}>
      <div
        style={{
          width: RECEIPT_WIDTH,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '26px 28px 18px',
          background: OG_COLORS.receipt,
        }}
      >
        <div style={{ display: 'flex', fontFamily: OG_DISPLAY_FONT, fontSize: 32, fontWeight: 800, letterSpacing: '0.06em' }}>
          {title}
        </div>
        <div style={{ display: 'flex', fontSize: 19, color: OG_COLORS.ink2, marginTop: 2 }}>{subtitle}</div>
        <Dashes />
        {marks.map((mark, i) => (
          <div key={i} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '5px 0' }}>
            <div style={{ display: 'flex', fontSize: 26 }}>{`Ronda ${i + 1}`}</div>
            <MarkBox mark={mark} />
          </div>
        ))}
        <Dashes />
        <div style={{ width: '100%', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontFamily: OG_DISPLAY_FONT, fontSize: 30, fontWeight: 800, letterSpacing: '0.06em' }}>TOTAL</div>
          <div style={{ display: 'flex', fontFamily: OG_DISPLAY_FONT, fontSize: 46, fontWeight: 800 }}>{total}</div>
        </div>
      </div>
      <Teeth />
    </div>
  );
}
