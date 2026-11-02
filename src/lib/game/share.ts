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

export function shareText(number: number, grid: string, siteUrl: string): string {
  const url = `${siteUrl.replace(/\/+$/, '')}${resultPath(number, grid)}`;
  return `¿Qué subió más? #${number} ${gridScore(grid)}/${ROUND_COUNT}\n${gridToEmoji(grid)}\n${url}`;
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
