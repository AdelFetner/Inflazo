import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getTodayNumber } from '@/lib/data/puzzles';
import { ROUND_COUNT, SHARE_PITCH_PLAIN, challenge, gridScore, gridToEmoji, ogImagePath, parseResultParams } from '@/lib/game/share';
import { getSiteUrl, SITE_NAME } from '@/lib/site';

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
  const score = gridScore(result.grid);
  // Link previews (WhatsApp, Telegram, LinkedIn, Facebook) show title + description under the image.
  const title = `Saqué ${score}/${ROUND_COUNT} en ${SITE_NAME} #${result.number}`;
  const description = `${challenge(score)} ${SHARE_PITCH_PLAIN}`;
  const url = `${getSiteUrl()}/r/${result.number}/${result.grid}`;
  const image = `${getSiteUrl()}${ogImagePath(result.number, result.grid)}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'es_AR',
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: `${title}. ${description}` }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function SharedResult({ params }: PageProps<'/r/[number]/[grid]'>) {
  const result = await resolve(params);
  if (!result) notFound();
  const score = gridScore(result.grid);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8 sm:py-16">
      <p className="text-[15px] font-semibold tracking-[0.08em] text-ink-2 uppercase">Te desafiaron</p>
      <h1 className="condensed mt-2 text-[44px] leading-none font-bold tracking-[-0.02em] sm:text-[64px]">
        {SITE_NAME} <span className="figures">#{result.number}</span>
      </h1>

      <p className="condensed figures rise mt-8 text-[140px] leading-[0.82] font-bold tracking-[-0.04em] sm:text-[220px]">
        {score}/{ROUND_COUNT}
      </p>
      <p className="mt-6 text-[28px] leading-none tracking-[0.08em]" aria-label={`${score} de ${ROUND_COUNT} correctas`}>
        {gridToEmoji(result.grid)}
      </p>
      <p className="condensed mt-8 text-[36px] leading-tight font-bold sm:text-[44px]">{challenge(score)}</p>

      <ol className="mt-6 grid gap-3 text-[17px] leading-snug sm:text-[19px]">
        <li>
          <span className="font-semibold">Dos productos del súper.</span> Elegí cuál aumentó más en el último año.
        </li>
        <li>
          <span className="font-semibold">Cinco rondas,</span> cada una más difícil. Un puzzle nuevo por día.
        </li>
        <li>
          <span className="font-semibold">Precios oficiales del INDEC</span> (promedios del Gran Buenos Aires).
        </li>
      </ol>

      <Link
        href="/"
        className="mt-10 inline-flex h-14 items-center justify-center bg-ink px-8 text-[17px] font-semibold text-paper transition-[background-color,transform] duration-150 hover:bg-accent active:scale-[0.98]"
      >
        Aceptá el desafío
      </Link>

      <p className="mt-10 text-[14px] text-ink-2">Fuente: INDEC, API ipc_nacional (precios promedio GBA).</p>
    </main>
  );
}
