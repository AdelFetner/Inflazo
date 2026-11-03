'use client';

import type { ReactNode, Ref } from 'react';

interface DialogProps {
  title: string;
  children: ReactNode;
  ref?: Ref<HTMLDialogElement>;
}

/** Native modal `<dialog>`: Esc and the close button dismiss it, so does a click on the backdrop. */
export function Dialog({ title, children, ref }: DialogProps) {
  const titleId = `dialog-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="m-auto w-[min(100vw-2rem,30rem)] bg-paper p-0 text-ink shadow-[0_24px_64px_rgb(0_0_0/0.25)] open:rise" // taste-skill-ignore: a modal floats over the page
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="condensed text-[32px] leading-none font-bold tracking-[-0.02em]">
            {title}
          </h2>
          <form method="dialog">
            <button
              type="submit"
              aria-label="Cerrar"
              className="-mt-2 -mr-2 grid size-11 place-items-center transition-colors hover:bg-paper-2"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
              </svg>
            </button>
          </form>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </dialog>
  );
}
