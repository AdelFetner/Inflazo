// Shared by the share cards on the server (api/og, opengraph-image) and in the browser (the
// downloaded or shared PNG). No Node APIs here: this module ships to the client.

export const OG_SIZE = { width: 1200, height: 630 } as const;

/** Mirrors src/app/globals.css (@theme). */
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

export const OG_DISPLAY_FONT = 'Archivo Condensed';
export const OG_TEXT_FONT = 'Archivo';

/**
 * Satori can't use the site's variable Archivo (wdth 72%, wght 800 title), so static upstream
 * instances stand in. They live in public/fonts so the browser can fetch them too.
 */
export const OG_FONT_FILES = [
  { name: OG_DISPLAY_FONT, file: 'ArchivoCondensed-ExtraBold.ttf', weight: 800 },
  { name: OG_TEXT_FONT, file: 'Archivo-Regular.ttf', weight: 400 },
] as const;
