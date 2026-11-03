import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: `Página no encontrada | ${SITE_NAME}`,
};

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-[1040px] flex-1 px-5 pt-5 pb-16 sm:px-10 sm:pt-8">
      <p className="condensed text-[30px] leading-none font-extrabold tracking-[-0.02em] sm:text-[40px]">
        {SITE_NAME}
      </p>
      <p
        aria-hidden="true"
        className="condensed figures mt-12 text-[120px] leading-[0.82] font-bold tracking-[-0.04em] text-paper-3 sm:mt-16 sm:text-[200px]"
      >
        404
      </p>
      <h1 className="condensed mt-6 max-w-[14ch] text-[44px] leading-[0.95] font-bold tracking-[-0.025em] text-balance sm:max-w-none sm:text-[64px]">
        No encontramos esa página
      </h1>
      <p className="mt-5 max-w-xl text-[19px] leading-snug">
        El link puede estar mal copiado o ser de un puzzle que todavía no salió.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-14 items-center bg-ink px-10 text-[17px] font-semibold text-paper transition-[background-color,transform] duration-150 hover:bg-accent active:scale-[0.98]"
      >
        Jugá el de hoy
      </Link>
    </main>
  );
}
