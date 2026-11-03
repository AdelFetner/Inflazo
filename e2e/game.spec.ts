import { expect, test, type Page } from '@playwright/test';
import puzzles from '../data/puzzles.json';
import { shareText } from '../src/lib/game/share';
import type { Puzzle } from '../src/lib/game/types';

const BASE_URL = 'http://localhost:3100';
const wrongOn = 2; // answer round 3 wrong → grid 11011

/** The puzzle the page actually renders (header "Desafío #n del …"), so a run crossing midnight stays consistent. */
async function renderedPuzzle(page: Page): Promise<Puzzle> {
  const header = await page.getByText(/^Desafío #\d+ del /).textContent();
  const number = Number(header?.match(/^Desafío #(\d+)/)?.[1]);
  const puzzle = (puzzles as Puzzle[]).find((p) => p.number === number);
  if (!puzzle) throw new Error(`Rendered puzzle #${number} not found in data/puzzles.json`);
  return puzzle;
}

async function answerRound(page: Page, puzzle: Puzzle, index: number) {
  const round = puzzle.rounds[index];
  const pick = index === wrongOn ? (round.answer === 'a' ? 'b' : 'a') : round.answer;
  await expect(page.getByText(`Ronda ${index + 1} de 5`)).toBeVisible();
  await page.getByTestId(`option-${pick}`).click();
  await page.getByRole('button', { name: index === 4 ? 'Ver resultado' : 'Siguiente' }).click();
}

test('plays the daily puzzle, shares, and keeps the result after reload', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const today = await renderedPuzzle(page);
  for (let i = 0; i < 5; i++) await answerRound(page, today, i);

  const expected = shareText(today.number, '11011', BASE_URL);
  await expect(page.getByTestId('final-score')).toHaveText('4/5');
  await expect(page.getByTestId('share-text')).toHaveText(expected);
  await page.getByRole('button', { name: 'Compartir' }).click();
  await expect(page.getByText('¡Copiado!')).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  // The Windows clipboard turns LF into CRLF on read; the app writes LF.
  expect(process.platform === 'win32' ? copied.replace(/\r\n/g, '\n') : copied).toBe(expected);

  await page.reload();
  await expect(page.getByTestId('final-score')).toHaveText('4/5');
});

test('resumes at the next unanswered round after reload', async ({ page }) => {
  await page.goto('/');
  const today = await renderedPuzzle(page);
  await answerRound(page, today, 0);
  await answerRound(page, today, 1);
  await page.reload();
  await expect(page.getByText('Ronda 3 de 5')).toBeVisible();
});

test('shared result page advertises the OG image', async ({ request }) => {
  const html = await (await request.get('/r/1/11011')).text();
  expect(html).toMatch(/<meta property="og:image" content="[^"]*\/api\/og\?n=1&amp;g=11011"/);
  const image = await request.get('/api/og?n=1&g=11011');
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toBe('image/png');
});

test('rejects hand-edited share links', async ({ request }) => {
  for (const path of ['/r/0/11111', '/r/042/11111', '/r/abc/11111', '/r/1/2', '/r/99999/11111']) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  expect((await request.get('/api/og?n=1&g=22222')).status()).toBe(400);
});
