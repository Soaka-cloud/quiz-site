import { test, expect } from '@playwright/test';

const QUESTION_COUNT = 3;
const FAKE_ENDPOINT = 'https://script.google.com/macros/s/FAKE_DEPLOYMENT_ID/exec';
const CONFIG_STUB = `window.SURVEY_CONFIG = { endpoint: '${FAKE_ENDPOINT}' };`;

test.beforeEach(async ({ page }) => {
  await page.route('**/config.js', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: CONFIG_STUB }),
  );
  await page.route(`${FAKE_ENDPOINT}?client=web`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
  );
  await page.goto('/index.html');
});

test('E1: страница открывается, вопросы и прогресс отрендерились', async ({ page }) => {
  await expect(page.locator('.survey-question')).toHaveCount(QUESTION_COUNT);

  const options = page.locator('.answer-option');
  await expect(options.first()).toBeVisible();
  expect(await options.count()).toBeGreaterThanOrEqual(QUESTION_COUNT * 2);

  await expect(page.locator('.progress-bar').first()).toBeVisible();
});

test('E2: клик по варианту выбирает его и двигает прогресс', async ({ page }) => {
  const firstQuestion = page.locator('.survey-question').first();
  const firstOption = firstQuestion.locator('.answer-option').first();
  const secondOption = firstQuestion.locator('.answer-option').nth(1);

  await expect
    .poll(() => firstQuestion.getAttribute('data-answered'), { message: 'до клика вопрос не отвечен' })
    .toBe('false');

  await firstOption.click();
  await expect
    .poll(() => firstOption.getAttribute('data-selected'), { message: 'первый вариант выбран' })
    .toBe('true');

  await secondOption.click();
  await expect
    .poll(() => secondOption.getAttribute('data-selected'), { message: 'второй вариант выбран' })
    .toBe('true');
  await expect
    .poll(() => firstOption.getAttribute('data-selected'), { message: 'первый вариант снят' })
    .toBe('false');
  await expect
    .poll(() => firstQuestion.getAttribute('data-answered'), { message: 'вопрос стал отвеченным' })
    .toBe('true');
});

test('E3: после ответов на все вопросы показывается экран благодарности', async ({ page }) => {
  const questions = page.locator('.survey-question');
  for (let i = 0; i < QUESTION_COUNT; i += 1) {
    await questions.nth(i).locator('.answer-option').first().click();
  }

  await page.locator('.submit-button').click();

  await expect(page.locator('.thank-you-screen')).toBeVisible();
  await expect(page.locator('.survey-question')).toHaveCount(0);
});
