import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ImageResponse } from 'next/og';

type OgFont = NonNullable<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts']>[number];

// Shared by the ImageResponse OG images. Palette mirrors src/app/globals.css (@theme).
export const OG_COLORS = {
  paper: '#f2f1ec',
  paper3: '#d6d3c8',
  ink: '#141413',
  ink2: '#55534c',
  up: '#0e7a3d',
  down: '#bf2a1e',
  /** Thermal-paper white for the receipt; a touch warmer than pure white against `paper`. */
  receipt: '#fffdf6',
} as const;

// Satori can't use the site's variable Archivo (wdth 72%, wght 800 title), so static upstream
// instances stand in: Archivo Condensed ExtraBold for the display title, Archivo Regular for the rest.
// Read once at module scope, per the Next ImageResponse docs; file tracing bundles them.
const [condensedExtraBold, regular] = await Promise.all([
  readFile(join(process.cwd(), 'src/app/fonts/ArchivoCondensed-ExtraBold.ttf')),
  readFile(join(process.cwd(), 'src/app/fonts/Archivo-Regular.ttf')),
]);

export const OG_DISPLAY_FONT = 'Archivo Condensed';
export const OG_TEXT_FONT = 'Archivo';

export const OG_FONTS: OgFont[] = [
  { name: OG_DISPLAY_FONT, data: condensedExtraBold, weight: 800, style: 'normal' },
  { name: OG_TEXT_FONT, data: regular, weight: 400, style: 'normal' },
];
