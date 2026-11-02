import { SITE_NAME } from '../site';
import type { Answer, Round } from './types';

export const ROUND_COUNT = 5;
const GRID_PATTERN = /^[01]{5}$/;
const NUMBER_PATTERN = /^[1-9]\d*$/;

export function isValidGrid(grid: string): boolean {
  return GRID_PATTERN.test(grid);
}

export function gridScore(grid: string): number {
  return [...grid].filter((c) => c === '1').length;
}

export function gridToEmoji(grid: string): string {
  return [...grid].map((c) => (c === '1' ? '🟩' : '🟥')).join('');
}

export function gridFromAnswers(rounds: Round[], answers: Answer[]): string {
  return answers.map((answer, i) => (answer === rounds[i].answer ? '1' : '0')).join('');
}

export function resultPath(number: number, grid: string): string {
  return `/r/${number}/${grid}`;
}

export function ogImagePath(number: number, grid: string): string {
  return `/api/og?n=${number}&g=${grid}`;
}

/** Share message split in two: Telegram, Facebook and Reddit take the link as a separate field. */
export interface ShareMessage {
  text: string;
  url: string;
}

/** Streaks shorter than this are not worth bragging about, so the line is left out. */
const MIN_SHARED_STREAK = 2;

/** What the player throws at whoever reads the post, by score. */
export function challenge(score: number): string {
  if (score >= ROUND_COUNT) return '¿Me igualás?';
  if (score >= 3) return '¿Me ganás?';
  return '¿Vos lo hacés mejor?';
}

/** The verdict under the score: a count in words, then a one-liner. */
const VERDICTS = [
  ['Ni una.', 'Mañana hay revancha.'],
  ['Una de cinco.', 'La inflación es traicionera.'],
  ['Dos de cinco.', 'Cuesta seguirle el ritmo.'],
  ['Tres de cinco.', 'Bien ahí.'],
  ['Cuatro de cinco.', 'Tenés ojo de góndola.'],
  ['Cinco de cinco.', 'Ni el INDEC lo sabía tan bien.'],
] as const;

export function verdict(score: number): string {
  return VERDICTS[score].join(' ');
}

/** The one-liner alone, for places where the score is already shown in figures. */
export function verdictLine(score: number): string {
  return VERDICTS[score][1];
}

const PITCH = 'Adiviná qué aumentó más en el súper, con precios del INDEC';
/** Pitch in the share text, pointing down at the link on the next line. */
export const SHARE_PITCH = `${PITCH} 👇`;
/** Pitch for link-preview descriptions, where there is no link below to point at. */
export const SHARE_PITCH_PLAIN = `${PITCH}.`;

/**
 * Result block, a blank line, then the pitch. The link is kept apart so each network can place it;
 * joined, it goes on its own last line.
 */
export function shareMessage(number: number, grid: string, siteUrl: string, streak = 0): ShareMessage {
  const score = gridScore(grid);
  const lines = [`${SITE_NAME} #${number} · ${score}/${ROUND_COUNT}`, gridToEmoji(grid)];
  if (streak >= MIN_SHARED_STREAK) lines.push(`🔥 Racha: ${streak}`);
  lines.push('', `${challenge(score)} ${SHARE_PITCH}`);
  return { text: lines.join('\n'), url: `${siteUrl.replace(/\/+$/, '')}${resultPath(number, grid)}` };
}

export function joinShareMessage({ text, url }: ShareMessage): string {
  return `${text}\n${url}`;
}

export function shareText(number: number, grid: string, siteUrl: string, streak = 0): string {
  return joinShareMessage(shareMessage(number, grid, siteUrl, streak));
}

export function parseResultParams(
  numberParam: string,
  gridParam: string,
  maxNumber: number,
): { number: number; grid: string } | null {
  if (!NUMBER_PATTERN.test(numberParam) || !isValidGrid(gridParam)) return null;
  const number = Number(numberParam);
  return number <= maxNumber ? { number, grid: gridParam } : null;
}
