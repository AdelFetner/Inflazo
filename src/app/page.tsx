import { cacheLife } from 'next/cache';
import { Game } from '@/components/game/Game';
import { getTodayPuzzle } from '@/lib/data/puzzles';
import { getSiteUrl } from '@/lib/site';

/**
 * Today's puzzle. The `minutes` profile (stale 5 min, revalidate 60 s, expire 1 h) serves the cached
 * copy to the first request after 60 s and rebuilds it in the background, so right after Argentina
 * midnight a request may still get yesterday's puzzle. Game copes: while its puzzle is behind the
 * Argentina date it keeps calling router.refresh() until the new number arrives.
 */
async function todaysPuzzle() {
  'use cache';
  cacheLife('minutes');
  return getTodayPuzzle();
}

export default async function Home() {
  const { puzzle, spare } = await todaysPuzzle();
  // Keyed by number: a refresh that brings a new puzzle remounts Game, resetting its round state.
  return <Game key={puzzle.number} puzzle={puzzle} spare={spare} siteUrl={getSiteUrl()} />;
}
