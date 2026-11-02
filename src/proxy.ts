import { NextResponse, type NextRequest } from 'next/server';
import { getTodayNumber } from '@/lib/data/puzzles';
import { parseResultParams } from '@/lib/game/share';

/**
 * /r/{n}/{grid} is partially prerendered under Cache Components: its static shell starts streaming
 * with 200 before the page can call notFound(). Invalid share links are rejected here, before
 * rendering, so they get a real HTTP 404 (the page keeps its own notFound() for client navigations).
 */
export function proxy(request: NextRequest) {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);
  if (segments.length !== 3) return NextResponse.next();
  let number: string;
  let grid: string;
  try {
    [number, grid] = segments.slice(1).map(decodeURIComponent);
  } catch {
    return NextResponse.next();
  }
  if (parseResultParams(number, grid, getTodayNumber())) return NextResponse.next();
  return NextResponse.rewrite(new URL('/_not-found', request.url), { status: 404 });
}

export const config = {
  matcher: '/r/:path*',
};
