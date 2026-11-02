import { describe, expect, it } from 'vitest';
import { MORE_NETWORKS, PRIMARY_NETWORKS, networkShareUrl, type ShareNetwork } from './share-links';
import { shareMessage } from './share';

const message = shareMessage(42, '11011', 'https://quesubiomas.ar', 7);
const full = `${message.text}\n${message.url}`;
const params = (network: ShareNetwork) => new URL(networkShareUrl(network, message)).searchParams;

describe('networkShareUrl', () => {
  it('sends WhatsApp through api.whatsapp.com, which keeps the emoji grid intact', () => {
    const url = new URL(networkShareUrl('whatsapp', message));
    // wa.me re-encodes 4-byte emoji as U+FFFD on redirect (verified 2026-11-02).
    expect(url.origin + url.pathname).toBe('https://api.whatsapp.com/send');
    expect(url.searchParams.get('text')).toBe(full);
  });

  it('gives X the link separately so t.co shortens it and the card renders', () => {
    const url = new URL(networkShareUrl('x', message));
    expect(url.origin + url.pathname).toBe('https://x.com/intent/tweet');
    expect(url.searchParams.get('text')).toBe(message.text);
    expect(url.searchParams.get('url')).toBe(message.url);
  });

  it('fits in one X post with the link counted as 23 characters', () => {
    const longest = shareMessage(99999, '00000', 'https://quesubiomas.ar', 99999);
    const weighted = [...longest.text].reduce((n, ch) => n + (ch.codePointAt(0)! > 0x10ff ? 2 : 1), 0);
    expect(weighted + 1 + 23).toBeLessThanOrEqual(280);
  });

  it('prefills the LinkedIn composer with the grid and the link', () => {
    const url = new URL(networkShareUrl('linkedin', message));
    expect(url.origin + url.pathname).toBe('https://www.linkedin.com/feed/');
    expect(url.searchParams.get('shareActive')).toBe('true');
    expect(url.searchParams.get('text')).toBe(full);
  });

  it('builds the remaining networks with the fields each one accepts', () => {
    expect(params('telegram').get('url')).toBe(message.url);
    expect(params('telegram').get('text')).toBe(message.text);
    expect(params('bluesky').get('text')).toBe(full);
    expect(params('threads').get('text')).toBe(full);
    expect(params('facebook').get('u')).toBe(message.url);
    expect(params('reddit').get('url')).toBe(message.url);
    expect(params('reddit').get('title')).toBe('¿Qué subió más? #42 4/5');
  });

  it('lists every network exactly once between the visible row and "Más"', () => {
    const ids = [...PRIMARY_NETWORKS, ...MORE_NETWORKS].map((n) => n.id);
    expect(PRIMARY_NETWORKS.map((n) => n.id)).toEqual(['whatsapp', 'x', 'linkedin']);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(8);
  });
});
