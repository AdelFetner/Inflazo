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

/** Share message split in two: networks like X and Telegram take the link as a separate field. */
export interface ShareMessage {
  text: string;
  url: string;
}

/** Streaks shorter than this are not worth bragging about, so the line is left out. */
const MIN_SHARED_STREAK = 2;

export function shareMessage(number: number, grid: string, siteUrl: string, streak = 0): ShareMessage {
  const lines = [`¿Qué subió más? #${number} ${gridScore(grid)}/${ROUND_COUNT}`, gridToEmoji(grid)];
  if (streak >= MIN_SHARED_STREAK) lines.push(`🔥 Racha: ${streak}`);
  return { text: lines.join('\n'), url: `${siteUrl.replace(/\/+$/, '')}${resultPath(number, grid)}` };
}

export function shareText(number: number, grid: string, siteUrl: string, streak = 0): string {
  const { text, url } = shareMessage(number, grid, siteUrl, streak);
  return `${text}\n${url}`;
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
