import { test, expect } from '@playwright/test';

const QUESTION_COUNT = 5;
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

const question = (page, id) => page.locator(`.survey-question[data-question-id="${id}"]`);

async function fillWholeSurvey(page) {
  await question(page, 'q1').locator('.answer-option').first().click();
  await question(page, 'q2').locator('.answer-option').first().click();
  await question(page, 'q3').locator('.answer-option').nth(1).click();
  await question(page, 'q4').locator('.answer-input').fill('Помогал(а) тестировать чужой проект');
  await question(page, 'q5').locator('.answer-input').fill('Группа');
}

test('E1: страница открывается, вопросы и прогресс отрендерились', async ({ page }) => {
  await expect(page.locator('.survey-question')).toHaveCount(QUESTION_COUNT);
  await expect(question(page, 'q1')).toBeVisible();
  await expect(question(page, 'q2')).toBeVisible();
  await expect(question(page, 'q3')).toBeVisible();
  await expect(question(page, 'q4').locator('.answer-input')).toBeVisible();
  await expect(question(page, 'q5').locator('.answer-input')).toBeVisible();

  const options = page.locator('.answer-option');
  expect(await options.count()).toBeGreaterThanOrEqual(QUESTION_COUNT * 2);

  await expect(page.locator('.progress-bar').first()).toBeVisible();
});

test('E1b: посетитель не видит служебных подсказок в разметке', async ({ page }) => {
  const text = await page.locator('.question-list').innerText();
  expect(text).not.toContain('Recommended');
  expect(text).not.toContain('[object Object]');
  expect(text).not.toContain('154');
});

test('E2: клик по варианту выбирает его и двигает прогресс', async ({ page }) => {
  const firstQuestion = question(page, 'q1');
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

test('E2b: в мультивыборе можно отметить несколько вариантов', async ({ page }) => {
  const multi = question(page, 'q2');
  const options = multi.locator('.answer-option');

  await options.nth(0).click();
  await options.nth(2).click();

  await expect(options.nth(0)).toHaveAttribute('data-selected', 'true');
  await expect(options.nth(2)).toHaveAttribute('data-selected', 'true');

  await options.nth(0).click();
  await expect(options.nth(0)).toHaveAttribute('data-selected', 'false');
  await expect(options.nth(2)).toHaveAttribute('data-selected', 'true');
});

test('E3: после ответов на все вопросы показывается экран благодарности', async ({ page }) => {
  await fillWholeSurvey(page);
  await page.locator('.submit-button').click();

  await expect(page.locator('.thank-you-screen')).toBeVisible();
  await expect(page.locator('.survey-question')).toHaveCount(0);
});
