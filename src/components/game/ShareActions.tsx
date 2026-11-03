'use client';

import { useEffect, useId, useState } from 'react';
import type { ResultCardProps } from '@/app/_og/result-card';
import { joinShareMessage, type ShareMessage } from '@/lib/game/share';
import { MORE_NETWORKS, PRIMARY_NETWORKS, networkShareUrl, type NetworkOption } from '@/lib/game/share-links';

interface ShareActionsProps {
  message: ShareMessage;
  /** The result card, drawn in the browser for the download or share. */
  card: ResultCardProps;
  imageName: string;
  /** Called when the clipboard is unavailable, so the user can copy the preview by hand. */
  onCopyFailed: () => void;
}

interface CardImage {
  file: File;
  url: string;
  /** Phones that can share files get the OS share sheet; everyone else downloads. */
  shareable: boolean;
}

// Plain underlined text: the black Compartir button is the one primary action.
const chip =
  'inline-flex h-11 items-center text-[16px] font-semibold underline decoration-ink/30 decoration-2 underline-offset-[6px] transition-colors duration-150 hover:decoration-ink';

export function ShareActions({ message, card, imageName, onCopyFailed }: ShareActionsProps) {
  const text = joinShareMessage(message);
  const [copied, setCopied] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [image, setImage] = useState<CardImage | null>(null);
  const moreId = useId();
  const { number, grid, day, prices } = card;

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  // Draw the PNG as soon as the result shows, so the click can call navigator.share() straight away
  // (Safari drops the user activation if the share waits first). Nothing is requested from the server
  // but the two font files, which are static and cached.
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    import('@/app/_og/render-in-browser')
      .then(({ renderResultCard }) => renderResultCard({ number, grid, day, prices }))
      .then((blob) => {
        if (cancelled) return;
        const file = new File([blob], imageName, { type: 'image/png' });
        url = URL.createObjectURL(blob);
        const shareable =
          window.matchMedia('(pointer: coarse)').matches &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [file] });
        setImage({ file, url, shareable });
      })
      .catch((error: unknown) => {
        // No image link; text sharing still works.
        console.error('Could not draw the result image', error);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [number, grid, day, prices, imageName]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      onCopyFailed();
    }
  }

  async function share() {
    if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    await copy();
  }

  async function shareImage(current: CardImage) {
    try {
      // Image only: apps such as Instagram Stories drop out of the share sheet when text comes along.
      await navigator.share({ files: [current.file] });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const link = document.createElement('a');
      link.href = current.url;
      link.download = imageName;
      link.click();
    }
  }

  const networkLink = ({ id, label }: NetworkOption) => (
    <li key={id}>
      <a
        href={networkShareUrl(id, message)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Compartir en ${label}`}
        className={chip}
      >
        {label}
      </a>
    </li>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={share}
          className="h-14 flex-1 bg-ink px-6 text-[17px] font-semibold text-paper transition-[background-color,transform] duration-150 hover:bg-accent active:scale-[0.98]"
        >
          Compartir
        </button>
        <p role="status" className="w-24 text-[15px] font-semibold text-up">
          {copied ? '¡Copiado!' : ''}
        </p>
      </div>

      <div>
        <p id={`${moreId}-label`} className="text-[15px] text-ink-2">
          O mandalo por
        </p>
        <ul aria-labelledby={`${moreId}-label`} className="flex flex-wrap gap-x-6">
          {PRIMARY_NETWORKS.map(networkLink)}
          <li>
            <button type="button" onClick={copy} className={chip}>
              Copiar
            </button>
          </li>
          {image && (
            <li>
              {image.shareable ? (
                <button type="button" onClick={() => shareImage(image)} aria-label="Compartir imagen" className={chip}>
                  Imagen
                </button>
              ) : (
                <a href={image.url} download={imageName} className={chip}>
                  Descargar imagen
                </a>
              )}
            </li>
          )}
          <li>
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls={moreId}
              onClick={() => setMoreOpen((open) => !open)}
              className={chip}
            >
              {moreOpen ? 'Menos' : 'Más'}
            </button>
          </li>
        </ul>
        <ul id={moreId} hidden={!moreOpen} aria-label="Más redes" className="flex flex-wrap gap-x-6">
          {MORE_NETWORKS.map(networkLink)}
        </ul>
      </div>
    </div>
  );
}
