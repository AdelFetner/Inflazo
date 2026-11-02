import { z } from 'zod';

export const INDEC_BASE_URL = 'https://api.indec.gob.ar/v1/';
export const IPC_PRIMARY_KEY =
  'clasificador,nivel,codigo,descripcion,periodo,anio,mes,indicador,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida';
export const PAGE_SIZE = 1000;

export class IngestError extends Error {
  override name = 'IngestError';
}

export const indecRowSchema = z.object({
  codigo: z.string(),
  descripcion: z.string(),
  periodo: z.string().regex(/^\d{6}$/),
  tipo_de_indicador: z.string(),
  tipo_de_indicador_descripcion: z.string(),
  region: z.string(),
  valor: z.number().nullable(),
  valor_null: z.string().nullable(),
});
export type IndecRow = z.infer<typeof indecRowSchema>;

const pageSchema = z.array(indecRowSchema);

export function parseTotal(header: string | null): number {
  const match = header?.match(/\/(\d+)$/);
  if (!match) throw new IngestError(`Missing or invalid Content-Range header: ${header}`);
  return Number(match[1]);
}

export async function fetchPrecioPromedioRows(token: string, fetchImpl: typeof fetch = fetch): Promise<IndecRow[]> {
  const rows: IndecRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const url = new URL('ipc_nacional', INDEC_BASE_URL);
    url.search = new URLSearchParams({
      tipo_de_indicador: 'eq.Precio promedio',
      region: 'eq.GBA',
      order: IPC_PRIMARY_KEY,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    }).toString();

    const response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}`, Prefer: 'count=exact', Accept: 'application/json' },
    });
    if (response.status !== 200 && response.status !== 206) {
      const body = (await response.text()).slice(0, 200);
      throw new IngestError(`INDEC API responded ${response.status}: ${body}`);
    }

    const total = parseTotal(response.headers.get('Content-Range'));
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new IngestError('INDEC API returned a non-JSON body');
    }
    const page = pageSchema.safeParse(body);
    if (!page.success) throw new IngestError(`Unexpected row shape: ${page.error.message.slice(0, 300)}`);
    rows.push(...page.data);

    if (page.data.length === 0 || offset + PAGE_SIZE >= total) {
      if (rows.length !== total) throw new IngestError(`Got ${rows.length} rows, expected ${total}`);
      return rows;
    }
  }
}
