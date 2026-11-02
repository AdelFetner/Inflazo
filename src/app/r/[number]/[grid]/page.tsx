import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getTodayNumber } from '@/lib/data/puzzles';
import { ROUND_COUNT, gridScore, gridToEmoji, ogImagePath, parseResultParams } from '@/lib/game/share';
import { getSiteUrl } from '@/lib/site';

/**
 * Request-time page: validity depends on today's puzzle number, so it is resolved per request
 * (connection()). The HTTP 404 for bad links comes from src/proxy.ts: under Cache Components this
 * route is partially prerendered, so its shell streams with 200 before notFound() below can run.
 * notFound() here is defense in depth (client navigations, proxy bypass); do not remove the proxy.
 * `instant = false` allows this blocking render under Cache Components.
 */
export const instant = false;

async function resolve(params: PageProps<'/r/[number]/[grid]'>['params']) {
  const { number, grid } = await params;
  await connection();
  return parseResultParams(number, grid, getTodayNumber());
}

export async function generateMetadata({ params }: PageProps<'/r/[number]/[grid]'>): Promise<Metadata> {
  const result = await resolve(params);
  if (!result) return {};
  const title = `¿Qué subió más? #${result.number} — ${gridScore(result.grid)}/${ROUND_COUNT}`;
  const image = `${getSiteUrl()}${ogImagePath(result.number, result.grid)}`;
  return {
    title,
    openGraph: { title, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, images: [image] },
  };
}

export default async function SharedResult({ params }: PageProps<'/r/[number]/[grid]'>) {
  const result = await resolve(params);
  if (!result) notFound();
  const score = gridScore(result.grid);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8 sm:py-16">
      <p className="text-[15px] font-semibold tracking-[0.08em] text-ink-2 uppercase">Resultado compartido</p>
      <h1 className="condensed mt-2 text-[44px] leading-none font-bold tracking-[-0.02em] sm:text-[64px]">
        ¿Qué subió más? <span className="figures">#{result.number}</span>
      </h1>

      <p className="condensed figures rise mt-8 text-[140px] leading-[0.82] font-bold tracking-[-0.04em] sm:text-[220px]">
        {score}/{ROUND_COUNT}
      </p>
      <p className="mt-6 text-[28px] leading-none tracking-[0.08em]" aria-label={`${score} de ${ROUND_COUNT} correctas`}>
        {gridToEmoji(result.grid)}
      </p>

      <Link
        href="/"
        className="mt-10 inline-flex h-14 items-center justify-center bg-ink px-8 text-[17px] font-semibold text-paper transition-[background-color,transform] duration-150 hover:bg-accent active:scale-[0.98]"
      >
        Jugá el de hoy
      </Link>

      <p className="mt-10 text-[14px] text-ink-2">Fuente: INDEC, API ipc_nacional (precios promedio GBA).</p>
    </main>
  );
}
