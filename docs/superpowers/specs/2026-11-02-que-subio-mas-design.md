# Inflazo (¿Qué subió más?) — Design spec

Fecha: 2026-11-02 · Estado: implementado · Producción: https://inflazo.adelfetner.com

## Objetivo

Juego web diario, estilo Wordle, basado en precios oficiales del INDEC. Cada día, el mismo puzzle de 5 rondas para todo el país; en cada ronda el jugador elige cuál de dos productos aumentó más en los últimos 12 meses. El resultado se comparte como grilla de emojis con link que despliega una imagen OG del resultado. Éxito = gente compartiendo su grilla; el juego tiene que ser rápido (< 1 min), mobile-first y con datos verificables.

## Fuente de datos (verificada con la API el 2026-11-02)

- Endpoint: `GET https://api.indec.gob.ar/v1/ipc_nacional`, header `Authorization: Bearer $INDEC_API_TOKEN`.
- Filtro: `tipo_de_indicador=eq.Precio promedio` y `region=eq.GBA`.
- Paginación: `limit=1000`, `offset` creciente, `order` por la clave primaria completa `clasificador,nivel,codigo,descripcion,periodo,anio,mes,indicador,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida`, header `Prefer: count=exact`; total en `Content-Range: inicio-fin/total`. Status 200 o 206 son éxito.
- Campos usados por fila: `codigo` (ej. `01.1.7.1.10`), `descripcion` (ej. `Cebolla`), `periodo` (`AAAAMM`, string), `tipo_de_indicador_descripcion` (unidad: `Valor por kg`, `Valor por 500 g`, `Valor por Litro`, `Valor por 1,5 litros`, `Valor por Docena`, …), `valor` (número, pesos), `valor_null` (signo convencional o `null`).
- Universo observado: 59 productos; GBA 201604–202609 (126 períodos); ~15.3k filas en todas las regiones, 7.4k en GBA. Filas con `valor_null` no nulo (ej. `///`) o `valor` nulo se descartan.
- Sólo GBA: es la región con serie completa; las demás arrancan en 201706.

## Modelo de datos (archivos commiteados)

`data/prices.json`:

```json
{
  "source": "INDEC API v1 ipc_nacional · Precio promedio · GBA",
  "fetchedAt": "2026-11-02T18:00:00Z",
  "latestPeriod": "202609",
  "products": [
    { "code": "01.1.7.1.10", "name": "Cebolla", "unit": "kg", "prices": { "202509": 753.2, "202609": 2696.23 } }
  ]
}
```

- `unit` se deriva de `tipo_de_indicador_descripcion` quitando el prefijo `Valor por ` (`kg`, `500 g`, `Litro`, `1,5 litros`, `Docena`).
- `prices` contiene todos los períodos válidos del producto.

`data/puzzles.json`: lista ordenada de puzzles congelados.

```json
[
  {
    "number": 1,
    "date": "2026-11-03",
    "period": "202609",
    "rounds": [
      {
        "a": { "code": "01.1.7.1.10", "name": "Cebolla", "unit": "kg", "from": 753.2, "to": 2696.23, "yoy": 257.9 },
        "b": { "code": "01.1.4.4.01", "name": "Huevos de gallina", "unit": "Docena", "from": 3988.4, "to": 3940.5, "yoy": -1.2 },
        "answer": "a"
      }
    ]
  }
]
```

## Generación de puzzles

- `yoy = round((precio[period] / precio[period - 12 meses] - 1) * 100, 1)`. Sólo productos con ambos precios válidos.
- `period` de un puzzle = `latestPeriod` del dataset al momento de generarlo (dato más reciente = más noticioso).
- PRNG determinístico (mulberry32) con seed = número de puzzle. Mismo dataset + mismo número ⇒ mismo puzzle.
- Dificultad por diferencia absoluta `|yoy_a - yoy_b|` en puntos porcentuales: ronda 1 ≥ 40, ronda 2 ∈ [20, 40), ronda 3 ∈ [10, 20), ronda 4 ∈ [4, 10), ronda 5 ∈ [1, 4). Si una banda no tiene pares disponibles, se toma el par con diferencia más cercana a la banda que no viole las demás reglas.
- Diferencia mínima absoluta 1 pp (nunca empates ambiguos).
- Dentro de un puzzle ningún producto aparece dos veces. Entre puzzles con el mismo `period` no se repite el mismo par (sin importar orden).
- Lado (`a`/`b`) de la respuesta correcta aleatorio vía el mismo PRNG.
- Congelamiento: al correr la generación, los puzzles con `date <= hoy (America/Argentina/Buenos_Aires)` no se tocan; los futuros se regeneran con el dataset actual; siempre quedan generados ≥ 60 días hacia adelante.
- Calendario: puzzle #1 = `2026-11-03`; `number = días desde 2026-11-03 + 1`, día calculado en `America/Argentina/Buenos_Aires`; cambia a las 00:00 de Argentina.

## Ingesta y actualización

- `scripts/ingest.ts` (Node, server-only): pagina la API, valida filas con zod, normaliza a `data/prices.json`, luego corre la generación y escribe `data/puzzles.json`. Falla con exit code ≠ 0 ante 401/403/400, respuesta no-JSON, o dataset resultante con < 30 productos válidos para `latestPeriod`; en caso de falla no sobrescribe archivos.
- GitHub Action diario (09:00 y 18:00 ART): corre `ingest`, commitea sólo si cambió algo; el push dispara el deploy de Vercel. Token en secret `INDEC_API_TOKEN`. El token nunca llega al bundle del cliente.
- Desarrollo local: token en `.env.local` (gitignored).

## App

- Next.js (App Router, TypeScript, Tailwind). Páginas estáticas; los JSON se importan en build.
- `/` — puzzle del día:
  - Header: nombre, "Desafío #n del 3 de noviembre", botón de reglas y de estadísticas.
  - Ronda: la pregunta "¿Cuál aumentó más entre sep 2025 y sep 2026?" y dos tarjetas como cartel de góndola: producto, unidad y el precio de hace un año (no revela la respuesta). Abajo, el progreso (cuadrados) con "Ronda n de 5" y el botón para avanzar.
  - Al elegir: revela en ambas tarjetas precio anterior → actual y la variación % con contador animado; marca acierto/error; botón "Siguiente".
  - Final: puntaje N/5, veredicto, el texto del mensaje, botón Compartir (Web Share API en mobile; fallback copiar al portapapeles), links de texto por red (WhatsApp, X, LinkedIn, Copiar, Imagen cuando el navegador comparte archivos; "Más": Telegram, Bluesky, Threads, Facebook, Reddit), cuenta regresiva al próximo desafío y, al costado, el ticket del súper con lo que más subió en cada ronda y si el jugador acertó. Endpoints y motivos: `docs/research/2026-11-02-share-ux.md`.
- Estado local (`localStorage`): progreso del día (se puede recargar y retomar), historial por número de puzzle, racha actual, mejor racha, distribución de puntajes 0–5. Sin backend ni cuentas.
- Texto compartido (la línea de racha aparece solo con racha ≥ 2; el desafío depende del puntaje: 5 → "¿Me igualás?", 3–4 → "¿Me ganás?", 0–2 → "¿Vos lo hacés mejor?"):

  ```
  Inflazo #42 · 4/5
  🟩🟩🟥🟩🟩
  🔥 Racha: 7

  ¿Me ganás? Adiviná qué aumentó más en el súper, con precios del INDEC 👇
  https://<sitio>/r/42/11011
  ```

  En X el link va dentro del texto (si va en `url`, X lo pega a la última línea). En LinkedIn se agrega al final `#INDEC #Inflación #Economía #Precios`.

- `/r/[number]/[grid]` — página de resultado compartido, adonde llega quien toca el link: título "Te desafiaron a ver qué subió más", "Sacó 4 de 5 en el desafío del 3 de noviembre. ¿Me ganás?", cómo se juega en tres líneas, el CTA "Aceptá el desafío" y el ticket sin nombres de productos (el visitante va a jugar el mismo desafío). Metadata OG/Twitter: título "Saqué 4/5 en Inflazo #42", descripción con desafío + pitch, imagen `/api/og?n=42&g=11011`. `grid` es una cadena de 5 dígitos 0/1; valores inválidos ⇒ 404.
- `/api/og` — `ImageResponse` 1200×630 con forma de ticket de súper: puntaje, veredicto, qué es el juego, una línea por ronda con ✓/✗, período de precios y una franja con el desafío y el dominio. El llamado a la acción queda a la derecha porque X tapa la esquina inferior izquierda con el dominio. Parámetros inválidos ⇒ 400.
- URL base desde `NEXT_PUBLIC_SITE_URL`.
- Mobile-first; contraste AA; operable con teclado; respeta `prefers-reduced-motion` (sin contador animado).

## Errores

- Ingesta falla ⇒ se mantienen los últimos JSON commiteados; el Action queda en rojo.
- No hay puzzle para la fecha de hoy (no debería pasar por el buffer de 60 días) ⇒ la app muestra el último puzzle disponible con aviso "Puzzle de repuesto".
- `localStorage` no disponible ⇒ el juego funciona sin persistencia.

## Tests

- Unitarios (Vitest): normalizador de ingesta contra fixture de respuesta real de la API (incluye fila con `///`); cálculo de yoy; generador (determinismo, sin productos repetidos en un puzzle, sin pares repetidos en el mismo período, bandas de dificultad, diferencia ≥ 1 pp, congelamiento de puzzles pasados); cálculo de número de puzzle en zona horaria AR alrededor de medianoche; codificación de grilla/texto compartido; actualización de rachas.
- Smoke E2E (Playwright): jugar las 5 rondas del día, ver pantalla final, texto de compartir correcto, recargar y ver el estado persistido; `/r/1/11011` responde con meta `og:image`; `/api/og?n=1&g=11011` devuelve `image/png`.

## Fuera de alcance

Cuentas, ranking global, otras regiones, modo infinito, i18n, analytics. Deploy a Vercel es el último paso y requiere confirmación explícita.
