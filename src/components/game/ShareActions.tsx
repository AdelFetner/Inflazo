'use client';

import { useEffect, useId, useState } from 'react';
import type { ShareMessage } from '@/lib/game/share';
import { MORE_NETWORKS, PRIMARY_NETWORKS, networkShareUrl, type NetworkOption } from '@/lib/game/share-links';

interface ShareActionsProps {
  message: ShareMessage;
  /** Same-origin path of the result PNG (the OG image). */
  imagePath: string;
  imageName: string;
  /** Called when the clipboard is unavailable, so the user can copy the preview by hand. */
  onCopyFailed: () => void;
}

const chip =
  'inline-flex h-11 items-center px-4 border border-ink/25 text-[15px] font-semibold transition-colors duration-150 hover:bg-paper-2 active:bg-paper-3';

export function ShareActions({ message, imagePath, imageName, onCopyFailed }: ShareActionsProps) {
  const text = `${message.text}\n${message.url}`;
  const [copied, setCopied] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // Only set where the browser can share files (most phones, desktop Chrome/Edge/Safari).
  const [imageFile, setImageFile] = useState<File | null>(null);
  const moreId = useId();

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  // Prefetch the PNG so the click can call navigator.share() straight away: Safari drops the
  // user activation if the share waits on a network request first.
  useEffect(() => {
    if (typeof navigator.canShare !== 'function') return;
    const probe = new File([new Blob()], imageName, { type: 'image/png' });
    if (!navigator.canShare({ files: [probe] })) return;
    const controller = new AbortController();
    fetch(imagePath, { signal: controller.signal })
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then((blob) => setImageFile(new File([blob], imageName, { type: 'image/png' })))
      .catch(() => {
        // No image button; text sharing still works.
      });
    return () => controller.abort();
  }, [imagePath, imageName]);

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

  async function shareImage() {
    if (!imageFile) return;
    try {
      await navigator.share({ files: [imageFile], text });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) window.open(imagePath, '_blank', 'noopener');
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
        <p id={`${moreId}-label`} className="text-[14px] text-ink-2">
          O compartí en
        </p>
        <ul aria-labelledby={`${moreId}-label`} className="mt-2 flex flex-wrap gap-2">
          {PRIMARY_NETWORKS.map(networkLink)}
          <li>
            <button type="button" onClick={copy} className={chip}>
              Copiar
            </button>
          </li>
          {imageFile && (
            <li>
              <button type="button" onClick={shareImage} className={chip}>
                Compartir imagen
              </button>
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
        <ul id={moreId} hidden={!moreOpen} aria-label="Más redes" className="mt-2 flex flex-wrap gap-2">
          {MORE_NETWORKS.map(networkLink)}
        </ul>
      </div>
    </div>
  );
}
