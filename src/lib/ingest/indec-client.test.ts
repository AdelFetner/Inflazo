import { describe, expect, it } from 'vitest';
import rows from '../../../tests/fixtures/indec-precio-promedio-rows.json';
import { IngestError, MAX_ATTEMPTS, PAGE_SIZE, fetchPrecioPromedioRows, parseTotal } from './indec-client';

type Call = { url: URL; headers: Headers };

function fakeApi(total: number, options: { status?: number; contentRange?: string | null } = {}) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, headers: new Headers(init?.headers) });
    if (options.status && options.status >= 400) return new Response('{"message":"JWT expired"}', { status: options.status });
    const offset = Number(url.searchParams.get('offset'));
    const count = Math.max(0, Math.min(PAGE_SIZE, total - offset));
    const page = Array.from({ length: count }, (_, i) => rows[(offset + i) % rows.length]);
    const contentRange = options.contentRange === undefined
      ? (count === 0 ? `*/${total}` : `${offset}-${offset + count - 1}/${total}`)
      : options.contentRange;
    const headers = contentRange === null ? undefined : { 'Content-Range': contentRange };
    return new Response(JSON.stringify(page), { status: count < total ? 206 : 200, headers });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

describe('fetchPrecioPromedioRows', () => {
  it('pages through the full table with auth, count and filters', async () => {
    const api = fakeApi(1500);
    const result = await fetchPrecioPromedioRows('tok', api.fetchImpl);
    expect(result).toHaveLength(1500);
    expect(api.calls.map((c) => c.url.searchParams.get('offset'))).toEqual(['0', '1000']);
    const first = api.calls[0];
    expect(first.url.pathname).toBe('/v1/ipc_nacional');
    expect(first.url.searchParams.get('tipo_de_indicador')).toBe('eq.Precio promedio');
    expect(first.url.searchParams.get('region')).toBe('eq.GBA');
    expect(first.url.searchParams.get('limit')).toBe('1000');
    expect(first.headers.get('Authorization')).toBe('Bearer tok');
    expect(first.headers.get('Prefer')).toBe('count=exact');
  });

  it('returns no rows for an empty table', async () => {
    expect(await fetchPrecioPromedioRows('tok', fakeApi(0).fetchImpl)).toEqual([]);
  });

  it('fails on auth errors', async () => {
    await expect(fetchPrecioPromedioRows('tok', fakeApi(10, { status: 401 }).fetchImpl)).rejects.toThrow(/401/);
  });

  it('fails when Content-Range is missing', async () => {
    await expect(fetchPrecioPromedioRows('tok', fakeApi(10, { contentRange: null }).fetchImpl)).rejects.toThrow(IngestError);
  });

  it('fails when the row count does not match the reported total', async () => {
    await expect(fetchPrecioPromedioRows('tok', fakeApi(10, { contentRange: '0-9/2000' }).fetchImpl)).rejects.toThrow(/expected 2000/);
  });

  describe('transient failures', () => {
    const noSleep = async () => {};

    function flaky(failures: Response[] | Error[]) {
      const api = fakeApi(10);
      const queue = [...failures];
      const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
        const next = queue.shift();
        if (next instanceof Error) throw next;
        if (next) return next;
        return api.fetchImpl(input, init);
      }) as typeof fetch;
      return fetchImpl;
    }

    it('recovers after 504s', async () => {
      const fetchImpl = flaky([new Response('<html>504</html>', { status: 504 }), new Response('', { status: 502 })]);
      expect(await fetchPrecioPromedioRows('tok', fetchImpl, { sleep: noSleep })).toHaveLength(10);
    });

    it('recovers after a network error', async () => {
      const fetchImpl = flaky([new TypeError('fetch failed')]);
      expect(await fetchPrecioPromedioRows('tok', fetchImpl, { sleep: noSleep })).toHaveLength(10);
    });

    it('gives up after MAX_ATTEMPTS', async () => {
      let calls = 0;
      const fetchImpl = (async () => {
        calls++;
        return new Response('<html>504</html>', { status: 504 });
      }) as typeof fetch;
      await expect(fetchPrecioPromedioRows('tok', fetchImpl, { sleep: noSleep })).rejects.toThrow(/504[\s\S]*after 4 attempts/);
      expect(calls).toBe(MAX_ATTEMPTS);
    });

    it('does not retry auth errors', async () => {
      let calls = 0;
      const fetchImpl = (async () => {
        calls++;
        return new Response('{"message":"JWT expired"}', { status: 401 });
      }) as typeof fetch;
      await expect(fetchPrecioPromedioRows('tok', fetchImpl, { sleep: noSleep })).rejects.toThrow(/401/);
      expect(calls).toBe(1);
    });
  });
});

describe('parseTotal', () => {
  it('reads the total from both range forms', () => {
    expect(parseTotal('0-999/15274')).toBe(15274);
    expect(parseTotal('*/0')).toBe(0);
  });
});
