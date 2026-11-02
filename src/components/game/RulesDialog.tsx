'use client';

import type { Ref } from 'react';
import { Dialog } from './Dialog';

export function RulesDialog({ ref }: { ref?: Ref<HTMLDialogElement> }) {
  return (
    <Dialog ref={ref} title="Reglas">
      <p className="text-[17px] leading-[1.55]">
        Cada día hay 5 rondas. En cada una elegí el producto cuyo precio promedio aumentó más en los últimos 12
        meses. Las rondas se ponen más difíciles. Datos oficiales del INDEC (precios promedio, Gran Buenos Aires).
        Hay un puzzle nuevo cada día a las 00:00 (hora argentina).
      </p>
    </Dialog>
  );
}
