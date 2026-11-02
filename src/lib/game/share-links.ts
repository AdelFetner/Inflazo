import type { ShareMessage } from './share';

export type ShareNetwork = 'whatsapp' | 'x' | 'linkedin' | 'telegram' | 'bluesky' | 'threads' | 'facebook' | 'reddit';

export interface NetworkOption {
  id: ShareNetwork;
  label: string;
}

/** Shown next to "Compartir"; order follows Argentine usage. The rest sit behind "Más". */
export const PRIMARY_NETWORKS: readonly NetworkOption[] = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'x', label: 'X' },
  { id: 'linkedin', label: 'LinkedIn' },
];

export const MORE_NETWORKS: readonly NetworkOption[] = [
  { id: 'telegram', label: 'Telegram' },
  { id: 'bluesky', label: 'Bluesky' },
  { id: 'threads', label: 'Threads' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'reddit', label: 'Reddit' },
];

function withQuery(base: string, query: Record<string, string>): string {
  return `${base}?${new URLSearchParams(query).toString().replace(/\+/g, '%20')}`;
}

/**
 * Compose-intent URL for a network. Each endpoint gets only the fields it honours
 * (see docs/research/2026-11-02-share-ux.md for sources and live checks).
 */
export function networkShareUrl(network: ShareNetwork, { text, url }: ShareMessage): string {
  const full = `${text}\n${url}`;
  switch (network) {
    case 'whatsapp':
      // Not wa.me: its redirect turns 🟩/🟥 into U+FFFD.
      return withQuery('https://api.whatsapp.com/send', { text: full });
    case 'x':
      return withQuery('https://x.com/intent/tweet', { text, url });
    case 'linkedin':
      // share-offsite only takes a URL; the feed composer keeps the grid. Undocumented but in wide use.
      return withQuery('https://www.linkedin.com/feed/', { shareActive: 'true', text: full });
    case 'telegram':
      return withQuery('https://t.me/share/url', { url, text });
    case 'bluesky':
      return withQuery('https://bsky.app/intent/compose', { text: full });
    case 'threads':
      return withQuery('https://www.threads.com/intent/post', { text: full });
    case 'facebook':
      return withQuery('https://www.facebook.com/sharer/sharer.php', { u: url });
    case 'reddit':
      return withQuery('https://www.reddit.com/submit', { url, title: text.split('\n')[0] });
  }
}
