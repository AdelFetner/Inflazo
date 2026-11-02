# Inflazo

**¿Qué subió más?** El juego diario de precios del INDEC: https://inflazo.adelfetner.com

Juego diario al estilo Wordle con los precios promedio del INDEC. Cada día hay un puzzle nuevo de 5 rondas: en cada ronda aparecen dos productos y hay que adivinar cuál aumentó más en el último año (variación interanual del precio promedio en el Gran Buenos Aires). Al terminar se puede compartir el resultado (grilla de emojis, racha y un link a `/r/<número>/<grilla>`, que muestra una imagen OG del resultado) con el menú nativo del dispositivo, el portapapeles, WhatsApp, X, LinkedIn, Telegram, Bluesky, Threads, Facebook o Reddit, o como imagen PNG. Ver `docs/research/2026-11-02-share-ux.md` para los endpoints y por qué WhatsApp usa `api.whatsapp.com` y no `wa.me`.

El nombre y la bajada viven en `src/lib/site.ts` (`SITE_NAME`, `SITE_TAGLINE`).

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

Si `NEXT_PUBLIC_SITE_URL` no está definida, el sitio usa `https://$NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` (la variable que Vercel define con el dominio de producción) y, si tampoco existe, `http://localhost:3000`.

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

El workflow `.github/workflows/update-data.yml` corre `npm run data` todos los días a las 09:17 y a las 18:17 (hora de Argentina; minuto impar porque los crons en punto de GitHub se demoran o se descartan cuando hay carga; también se puede lanzar a mano con *workflow_dispatch*). Si cambia algo en `data/`, commitea y pushea a `main`, y después dispara el Deploy Hook de Vercel (ver abajo).

Secrets del repositorio (Settings → Secrets and variables → Actions):

- **`INDEC_API_TOKEN`** (obligatorio): token de la API del INDEC.
- **`VERCEL_DEPLOY_HOOK_URL`** (recomendado): URL del Deploy Hook de Vercel. Si falta, el workflow avisa y no dispara el deploy.

> **Importante:** el token del INDEC vence el **2027-05-03**. Renovarlo antes de esa fecha y actualizar el secret (y tu `.env.local`); si no, el workflow va a fallar y los datos dejarán de actualizarse.

## Deploy en Vercel

Producción: proyecto `inflazo` en Vercel, conectado a este repo (cada push a `main` despliega), con el dominio **`inflazo.adelfetner.com`** (el DNS de `adelfetner.com` está en Vercel, así que el registro se crea solo al agregar el dominio al proyecto).

Para recrearlo:

1. En Vercel, *Add New → Project* e importar este repositorio (framework: Next.js, sin cambios en build).
2. En *Environment Variables*, definir `NEXT_PUBLIC_SITE_URL=https://inflazo.adelfetner.com`. Si no se define, se usa el dominio de producción de Vercel (`NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL`). El sitio no necesita `INDEC_API_TOKEN`: los datos ya están en el repo.
3. *Settings → Domains*: agregar `inflazo.adelfetner.com`.
4. Crear un Deploy Hook: *Project → Settings → Git → Deploy Hooks*, con branch `main`. Copiar la URL y guardarla en GitHub como el secret `VERCEL_DEPLOY_HOOK_URL`.

¿Por qué el Deploy Hook? Vercel puede no desplegar los commits hechos por `github-actions[bot]` (por ejemplo en el plan Hobby con repo privado), así que los datos nuevos no llegarían al sitio. El workflow llama al hook solo cuando pushea un commit de datos, y eso dispara el deploy de `main`.
