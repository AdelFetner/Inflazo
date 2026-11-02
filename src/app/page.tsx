import { cacheLife } from 'next/cache';
import { Game } from '@/components/game/Game';
import { getTodayPuzzle } from '@/lib/data/puzzles';
import { getSiteUrl } from '@/lib/site';

/**
 * Today's puzzle, recomputed at most once a minute so it flips shortly after Argentina midnight.
 * The `minutes` profile: revalidate 60 s, expire 1 h, client stale 5 min (Game calls router.refresh()
 * itself when the day has rolled over, so the client stale time never shows yesterday's puzzle for long).
 */
async function todaysPuzzle() {
  'use cache';
  cacheLife('minutes');
  return getTodayPuzzle();
}

export default async function Home() {
  const { puzzle, spare } = await todaysPuzzle();
  return <Game puzzle={puzzle} spare={spare} siteUrl={getSiteUrl()} />;
}
