'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { argentinaDate, puzzleNumberForDate } from '@/lib/game/calendar';
import { formatPeriod, shiftPeriod } from '@/lib/game/period';
import { answersFor, recordAnswer } from '@/lib/game/session';
import { gridFromAnswers, ROUND_COUNT } from '@/lib/game/share';
import { computeStats } from '@/lib/game/stats';
import { getBrowserStorage, loadState, saveState, type SavedState } from '@/lib/game/storage';
import type { Answer, Puzzle } from '@/lib/game/types';
import { ResultPanel } from './ResultPanel';
import { RoundCard } from './RoundCard';
import { RulesDialog } from './RulesDialog';
import { StatsDialog } from './StatsDialog';

interface GameProps {
  puzzle: Puzzle;
  spare: boolean;
  siteUrl: string;
}

type FocusTarget = 'advance' | 'option' | 'result';

/** Refresh cadence while waiting for the new day's puzzle; 40 × 15 s covers 10 minutes. */
const ROLLOVER_REFRESH_MS = 15_000;
const MAX_ROLLOVER_REFRESHES = 40;

export function Game({ puzzle, spare, siteUrl }: GameProps) {
  const router = useRouter();
  const [state, setState] = useState<SavedState | null>(null); // null until localStorage is read (avoids hydration mismatch)
  const [revealing, setRevealing] = useState(false);
  const [todayNumber, setTodayNumber] = useState(puzzle.number);
  /** Bumped when the countdown reaches midnight; (re)starts the refresh loop. */
  const [rolloverRequests, setRolloverRequests] = useState(0);

  const rulesRef = useRef<HTMLDialogElement>(null);
  const statsRef = useRef<HTMLDialogElement>(null);
  const optionRef = useRef<HTMLButtonElement>(null);
  const advanceRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const focusTarget = useRef<FocusTarget | null>(null);

  useEffect(() => {
    // localStorage only exists after hydration; reading it once here is the intended one-shot sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadState(getBrowserStorage()));
  }, []);

  // The day rolled over (cached HTML from before Argentina midnight, or the countdown just ended):
  // the first request after midnight may still get yesterday's cached page while the server rebuilds
  // it, so keep refreshing until a new puzzle number arrives (page.tsx keys Game by it, which
  // remounts this component and clears the interval). Bounded so a stuck server isn't polled forever.
  useEffect(() => {
    if (rolloverRequests === 0 && (spare || puzzleNumberForDate(argentinaDate(new Date())) <= puzzle.number)) return;
    router.refresh();
    let attempts = 1;
    const id = window.setInterval(() => {
      if (attempts++ >= MAX_ROLLOVER_REFRESHES) window.clearInterval(id);
      else router.refresh();
    }, ROLLOVER_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [puzzle.number, spare, router, rolloverRequests]);

  // Keyboard play: keep focus on the next thing to do after each step.
  useEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    focusTarget.current = null;
    ({ advance: advanceRef, option: optionRef, result: resultRef })[target].current?.focus();
  });

  const choose = useCallback(
    (answer: Answer) => {
      if (!state || revealing) return;
      const next = recordAnswer(state, puzzle, answer);
      if (next === state) return;
      saveState(getBrowserStorage(), next);
      setState(next);
      setRevealing(true);
      focusTarget.current = 'advance';
    },
    [state, revealing, puzzle],
  );

  const requestRollover = useCallback(() => setRolloverRequests((n) => n + 1), []);

  const openStats = () => {
    // Before launch day the calendar number is ≤ 0 while puzzle #1 is on screen.
    setTodayNumber(Math.max(1, puzzleNumberForDate(argentinaDate(new Date()))));
    statsRef.current?.showModal();
  };

  const header = (
    <Header
      number={puzzle.number}
      statsDisabled={!state}
      onRules={() => rulesRef.current?.showModal()}
      onStats={openStats}
    />
  );
  const banner = spare && (
    <p className="mt-6 bg-ink px-4 py-3 text-[15px] leading-snug text-paper">
      Puzzle de repuesto: todavía no hay un puzzle nuevo para hoy.
    </p>
  );

  if (!state) {
    return (
      <Frame>
        {header}
        {banner}
        <div aria-busy="true" aria-label="Cargando" className="mt-8 sm:mt-12">
          <div className="h-5 w-28 bg-paper-2" />
          <div className="mt-4 h-16 max-w-2xl bg-paper-2 sm:h-24" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="min-h-48 bg-paper-2 sm:min-h-64" />
            <div className="min-h-48 bg-paper-2 sm:min-h-64" />
          </div>
        </div>
        <RulesDialog ref={rulesRef} />
      </Frame>
    );
  }

  const answers = answersFor(state, puzzle.number);
  const grid = state.history[String(puzzle.number)];
  const finished = grid !== undefined && !revealing;
  const roundIndex = revealing ? answers.length - 1 : Math.min(answers.length, ROUND_COUNT - 1);
  const advanceLabel = answers.length === ROUND_COUNT ? 'Ver resultado' : 'Siguiente';
  const round = puzzle.rounds[roundIndex];
  const chosen = revealing ? answers[roundIndex] : undefined;
  const marks = gridFromAnswers(puzzle.rounds, answers);

  const advance = () => {
    focusTarget.current = answers.length === ROUND_COUNT ? 'result' : 'option';
    setRevealing(false);
  };

  return (
    <Frame>
      {header}
      {banner}

      {finished ? (
        <ResultPanel
          puzzle={puzzle}
          grid={grid}
          spare={spare}
          siteUrl={siteUrl}
          streak={computeStats(state.history, puzzle.number).currentStreak}
          onCountdownEnd={requestRollover}
          headingRef={resultRef}
        />
      ) : (
        <section aria-labelledby="question" className="mt-8 sm:mt-12">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[17px] font-semibold">
              Ronda {roundIndex + 1} de {ROUND_COUNT}
            </p>
            <ol className="flex gap-1.5" aria-hidden="true">
              {Array.from({ length: ROUND_COUNT }, (_, i) => (
                <li
                  key={i}
                  className={`size-4 transition-colors duration-300 ${
                    marks[i] === '1' ? 'bg-up' : marks[i] === '0' ? 'bg-down' : i === roundIndex ? 'bg-ink' : 'bg-paper-3'
                  }`}
                />
              ))}
            </ol>
          </div>

          <h2
            id="question"
            className="condensed mt-3 max-w-[22ch] text-[34px] leading-[0.98] font-bold tracking-[-0.025em] text-balance sm:max-w-none sm:text-[56px]"
          >
            ¿Cuál aumentó más entre {formatPeriod(shiftPeriod(puzzle.period, -12))} y {formatPeriod(puzzle.period)}?
          </h2>

          <div key={roundIndex} className="rise mt-6 grid gap-3 sm:mt-10 sm:grid-cols-2">
            {(['a', 'b'] as const).map((side) => (
              <RoundCard
                key={side}
                ref={side === 'a' ? optionRef : undefined}
                side={side}
                item={round[side]}
                revealed={revealing}
                correct={round.answer === side}
                chosen={chosen}
                onChoose={choose}
              />
            ))}
          </div>

          <p role="status" className="sr-only">
            {revealing ? (chosen === round.answer ? 'Correcto.' : 'Incorrecto.') : ''}
          </p>

          {revealing && (
            <div className="mt-6 flex justify-end sm:mt-8">
              <button
                ref={advanceRef}
                type="button"
                onClick={advance}
                className="rise h-14 w-full bg-ink px-10 text-[17px] font-semibold text-paper transition-[background-color,transform] duration-150 hover:bg-accent active:scale-[0.98] sm:w-auto"
              >
                {advanceLabel}
              </button>
            </div>
          )}
        </section>
      )}

      <RulesDialog ref={rulesRef} />
      <StatsDialog ref={statsRef} history={state.history} todayNumber={todayNumber} grid={finished ? grid : undefined} />
    </Frame>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-[1040px] flex-1 px-5 pt-5 pb-16 sm:px-10 sm:pt-8">{children}</main>;
}

interface HeaderProps {
  number: number;
  statsDisabled: boolean;
  onRules: () => void;
  onStats: () => void;
}

function Header({ number, statsDisabled, onRules, onStats }: HeaderProps) {
  const iconButton =
    'grid size-11 place-items-center text-ink transition-colors hover:bg-paper-2 active:bg-paper-3 disabled:opacity-40';
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="condensed text-[30px] leading-none font-extrabold tracking-[-0.02em] sm:text-[40px]">
          ¿Qué subió más?
        </h1>
        <p className="figures mt-2 text-[14px] text-ink-2 sm:text-[15px]">#{number} · Precios promedio en GBA · INDEC</p>
      </div>
      <div className="-mr-2 flex gap-1">
        <button type="button" aria-label="Reglas" onClick={onRules} className={iconButton}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="2" />
            <path
              d="M9.5 9.4a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="17.2" r="1.25" fill="currentColor" />
          </svg>
        </button>
        <button type="button" aria-label="Estadísticas" onClick={onStats} disabled={statsDisabled} className={iconButton}>
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M4 20V13h4v7zM10 20V4h4v16zM16 20V9h4v11z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </header>
  );
}
