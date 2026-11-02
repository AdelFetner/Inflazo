# ¿Qué subió más?

Juego diario al estilo Wordle con los precios promedio del INDEC. Cada día hay un puzzle nuevo de 5 rondas: en cada ronda aparecen dos productos y hay que adivinar cuál aumentó más en el último año (variación interanual del precio promedio en el Gran Buenos Aires). Al terminar se puede compartir el resultado como una grilla de emojis con un link a `/r/<número>/<grilla>`, que muestra una imagen OG del resultado.

## Fuente de datos

- API del INDEC: `https://api.indec.gob.ar/v1/ipc_nacional`
- Filtros: `tipo_de_indicador=eq.Precio promedio` y `region=eq.GBA`, paginado de a 1000 filas (`Prefer: count=exact`).
- Autenticación: `Authorization: Bearer <INDEC_API_TOKEN>`.
- Atribución mostrada en el sitio: **Fuente: INDEC**.

Los datos normalizados se guardan en `data/prices.json` y los puzzles en `data/puzzles.json`; ambos se versionan en el repo.

## Puesta en marcha

```bash
npm install
```

Crear `.env.local` (tomar `.env.example` como base):

```
INDEC_API_TOKEN=<tu token del INDEC>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`.env.local` está en `.gitignore`: nunca commitear el token.

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo de Next.js. |
| `npm run data` | Corre `ingest` y después `generate`. |
| `npm run ingest` | Descarga los precios promedio GBA del INDEC y actualiza `data/prices.json` (requiere `INDEC_API_TOKEN`). |
| `npm run generate` | Genera/actualiza `data/puzzles.json` a partir de `data/prices.json`. |
| `npm test` | Tests unitarios (Vitest). |
| `npm run e2e` | Smoke tests end-to-end (Playwright; compila y levanta la app en el puerto 3100). La primera vez: `npx playwright install chromium`. |
| `npm run build` | Build de producción. |

## Cómo se generan los puzzles

- El puzzle #1 corresponde al **2026-11-03** (época) y hay uno por día, según la fecha de Argentina (`America/Argentina/Buenos_Aires`).
- Cada puzzle tiene 5 rondas con dificultad creciente. La diferencia de variación interanual entre los dos productos de cada ronda cae en una banda (en puntos porcentuales): ≥40, 20–40, 10–20, 4–10 y 1–4. Si no hay un par dentro de la banda se usa el más cercano.
- `generate` produce puzzles hasta **60 días** después de hoy. Los puzzles con fecha de hoy o anterior quedan **congelados**: nunca se regeneran aunque cambien los datos, así los resultados compartidos siguen siendo válidos.

## Actualización automática de datos

El workflow `.github/workflows/update-data.yml` corre `npm run data` todos los días a las 09:00 y a las 18:00 (hora de Argentina; también se puede lanzar a mano con *workflow_dispatch*). Si cambia algo en `data/`, commitea y pushea a `main`.

Requiere el secret del repositorio **`INDEC_API_TOKEN`** (Settings → Secrets and variables → Actions).

> **Importante:** el token del INDEC vence el **2027-05-03**. Renovarlo antes de esa fecha y actualizar el secret (y tu `.env.local`); si no, el workflow va a fallar y los datos dejarán de actualizarse.

## Deploy en Vercel

1. En Vercel, *Add New → Project* e importar este repositorio (framework: Next.js, sin cambios en build).
2. En *Environment Variables*, definir `NEXT_PUBLIC_SITE_URL` con la URL pública (por ejemplo `https://que-subio-mas.vercel.app`). El sitio no necesita `INDEC_API_TOKEN`: los datos ya están en el repo.
3. Deploy. Cada commit de datos que hace el workflow en `main` dispara un nuevo deploy automáticamente.
