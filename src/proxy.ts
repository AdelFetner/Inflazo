import { NextResponse, type NextRequest } from 'next/server';
import { getTodayNumber } from '@/lib/data/puzzles';
import { decodeResult } from '@/lib/game/result-code';

/**
 * /r/{code} is partially prerendered under Cache Components: its static shell starts streaming
 * with 200 before the page can call notFound(). Invalid share links are rejected here, before
 * rendering, so they get a real HTTP 404 (the page keeps its own notFound() for client navigations).
 * Anything that is not exactly one segment (including the old /r/{n}/{grid} links) is a 404 too.
 */
export function proxy(request: NextRequest) {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);
  let code: string | null = null;
  try {
    if (segments.length === 2) code = decodeURIComponent(segments[1]);
  } catch {
    // Malformed percent-encoding: not a code.
  }
  if (code !== null && decodeResult(code, getTodayNumber())) return NextResponse.next();
  return NextResponse.rewrite(new URL('/_not-found', request.url), { status: 404 });
}

export const config = {
  matcher: '/r/:path*',
};
