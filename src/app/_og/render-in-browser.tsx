import satori from 'satori';
import { ResultCard, type ResultCardProps } from './result-card';
import { OG_FONT_FILES, OG_SIZE } from './theme';

async function loadFont(file: string): Promise<ArrayBuffer> {
  const response = await fetch(`/fonts/${file}`);
  if (!response.ok) throw new Error(`Font ${file}: HTTP ${response.status}`);
  return response.arrayBuffer();
}

/**
 * Draws the result card in the browser: Satori lays it out as SVG with the same component and fonts
 * the server uses for link previews, and a canvas turns it into a PNG. Load this module lazily.
 */
export async function renderResultCard(props: ResultCardProps): Promise<Blob> {
  const fonts = await Promise.all(
    OG_FONT_FILES.map(async ({ name, file, weight }) => ({ name, weight, style: 'normal' as const, data: await loadFont(file) })),
  );
  const svg = await satori(<ResultCard {...props} />, { ...OG_SIZE, fonts });

  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = OG_SIZE.width;
    canvas.height = OG_SIZE.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is not available');
    context.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
