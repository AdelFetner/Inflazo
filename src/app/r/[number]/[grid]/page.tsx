import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getPuzzle, getTodayNumber } from '@/lib/data/puzzles';
import { dateForPuzzleNumber, formatPuzzleDay } from '@/lib/game/calendar';
import { ROUND_COUNT, SHARE_PITCH_PLAIN, challenge, gridScore, ogImagePath, parseResultParams } from '@/lib/game/share';
import { getSiteUrl, SITE_NAME } from '@/lib/site';
import { Ticket } from '@/components/game/Ticket';

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
  const day = formatPuzzleDay(getPuzzle(result.number)?.date ?? dateForPuzzleNumber(result.number));
  // Spoiler-free: the visitor is about to play the same puzzle, so no product names.
  const lines = [...result.grid].map((cell, i) => ({ label: `Ronda ${i + 1}`, hit: cell === '1' }));

  return (
    <main className="mx-auto w-full max-w-[1040px] flex-1 px-5 pt-5 pb-16 sm:px-10 sm:pt-8">
      <Link href="/" className="condensed text-[30px] leading-none font-extrabold tracking-[-0.02em] sm:text-[40px]">
        {SITE_NAME}
      </Link>

      <div className="mt-10 grid gap-12 sm:mt-14 lg:grid-cols-[1fr_minmax(0,380px)] lg:gap-14">
        <div>
          <h1 className="condensed max-w-[14ch] text-[44px] leading-[0.95] font-bold tracking-[-0.025em] text-balance sm:text-[64px]">
            Te desafiaron a ver qué subió más
          </h1>
          <p className="mt-6 max-w-[34ch] text-[19px] leading-snug sm:text-[22px]">
            Sacó {score} de {ROUND_COUNT} en el desafío del {day}. {challenge(score)}
          </p>

          <ul className="mt-8 grid gap-3 text-[17px] leading-snug sm:text-[19px]">
            <li>
              <span className="font-semibold">Dos productos del súper.</span> Elegí cuál aumentó más en el último año.
            </li>
            <li>
              <span className="font-semibold">Cinco rondas,</span> cada una más difícil. Un desafío nuevo por día.
            </li>
            <li>
              <span className="font-semibold">Precios oficiales del INDEC,</span> promedios del Gran Buenos Aires.
            </li>
          </ul>

          <Link
            href="/"
            className="mt-10 inline-flex h-14 items-center justify-center bg-ink px-8 text-[17px] font-semibold text-paper transition-[background-color,transform] duration-150 hover:bg-accent active:scale-[0.98]"
          >
            Aceptá el desafío
          </Link>
        </div>

        <Ticket
          className="rise w-full lg:rotate-[1.5deg]"
          title={`Ticket #${result.number}`}
          subtitle={`Desafío del ${day}`}
          lines={lines}
          total={`${score}/${ROUND_COUNT}`}
        />
      </div>
    </main>
  );
}
