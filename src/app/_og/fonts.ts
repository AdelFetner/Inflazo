import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ImageResponse } from 'next/og';
import { OG_FONT_FILES } from './theme';

type OgFont = NonNullable<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts']>[number];

// Server only. Read once at module scope, per the Next ImageResponse docs; file tracing bundles them.
const [condensedExtraBold, regular] = await Promise.all([
  readFile(join(process.cwd(), 'public/fonts/ArchivoCondensed-ExtraBold.ttf')),
  readFile(join(process.cwd(), 'public/fonts/Archivo-Regular.ttf')),
]);

export const OG_FONTS: OgFont[] = [
  { name: OG_FONT_FILES[0].name, data: condensedExtraBold, weight: OG_FONT_FILES[0].weight, style: 'normal' },
  { name: OG_FONT_FILES[1].name, data: regular, weight: OG_FONT_FILES[1].weight, style: 'normal' },
];
