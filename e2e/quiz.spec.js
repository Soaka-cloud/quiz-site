import { test, expect } from '@playwright/test';

const QUESTION_COUNT = 3;
const FAKE_ENDPOINT = 'https://script.google.com/macros/s/FAKE_DEPLOYMENT_ID/exec';
const WEB_REQUEST = `${FAKE_ENDPOINT}?client=web`;
const CONFIG_STUB = `window.SURVEY_CONFIG = { endpoint: '${FAKE_ENDPOINT}' };`;

test.beforeEach(async ({ page }) => {
  await page.route(/\/config\.js(\?.*)?$/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: CONFIG_STUB }),
  );
  await page.route(`${FAKE_ENDPOINT}?client=web`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
  );
  await page.goto('/index.html');
});

const question = (page, id) => page.locator(`.survey-question[data-question-id="${id}"]`);

async function answerEverything(page) {
  await question(page, 'place').locator('.answer-option').nth(0).click();
  await question(page, 'time').locator('.answer-option').nth(2).click();
  await question(page, 'mood').locator('.answer-option').nth(0).click();
  await question(page, 'mood').locator('.answer-option').nth(2).click();
}

test('E1: приглашение открывается, разделы меню и подписи на месте', async ({ page }) => {
  await expect(page.locator('.survey-question')).toHaveCount(QUESTION_COUNT);
  await expect(page.locator('.survey-seal')).toHaveText('М');
  await expect(page.locator('.survey-title')).toContainText('Приглашение');

  await expect(question(page, 'place').locator('.question-text')).toHaveText('Место');
  await expect(question(page, 'time').locator('.question-text')).toHaveText('Время');
  await expect(question(page, 'mood').locator('.question-text')).toHaveText('Настроение');

  await expect(question(page, 'place').locator('.answer-price').first()).toHaveText('18:00—23:00');
  await expect(question(page, 'place').locator('.answer-label span').first()).toContainText('свечи');

  await expect(page.locator('.submit-button')).toHaveText('Подписать приглашение');
});

test('E1b: посетитель не видит служебных подсказок в разметке', async ({ page }) => {
  const text = await page.locator('.question-list').innerText();
  expect(text).not.toContain('Recommended');
  expect(text).not.toContain('[object Object]');
  expect(text).not.toContain('154');
  expect(text).not.toContain('wine_bar');
});

test('E2: клик по варианту выбирает его и снимает прежний выбор', async ({ page }) => {
  const place = question(page, 'place');
  const first = place.locator('.answer-option').first();
  const second = place.locator('.answer-option').nth(1);

  await expect.poll(() => place.getAttribute('data-answered')).toBe('false');

  await first.click();
  await expect(first).toHaveAttribute('data-selected', 'true');
  await expect.poll(() => place.getAttribute('data-answered')).toBe('true');

  await second.click();
  await expect(second).toHaveAttribute('data-selected', 'true');
  await expect(first).toHaveAttribute('data-selected', 'false');
});

test('E2b: в разделе «Настроение» можно отметить несколько пунктов', async ({ page }) => {
  const mood = question(page, 'mood');
  const options = mood.locator('.answer-option');

  await options.nth(0).click();
  await options.nth(2).click();

  await expect(options.nth(0)).toHaveAttribute('data-selected', 'true');
  await expect(options.nth(2)).toHaveAttribute('data-selected', 'true');

  await options.nth(0).click();
  await expect(options.nth(0)).toHaveAttribute('data-selected', 'false');
  await expect(options.nth(2)).toHaveAttribute('data-selected', 'true');
});

test('E6: кнопка заперта, пока не заполнены все три раздела', async ({ page }) => {
  const submit = page.locator('.submit-button');
  await expect(submit).toBeDisabled();

  await question(page, 'place').locator('.answer-option').first().click();
  await expect(submit).toBeDisabled();

  await question(page, 'time').locator('.answer-option').first().click();
  await expect(submit).toBeDisabled();

  await question(page, 'mood').locator('.answer-option').first().click();
  await expect(submit).toBeEnabled();
});

test('E3: после заполнения показывается принятое приглашение', async ({ page }) => {
  await answerEverything(page);
  await page.locator('.submit-button').click();

  await expect(page.locator('.thank-you-screen')).toBeVisible();
  await expect(page.locator('.thank-you-screen__title')).toContainText('принято');
  await expect(page.locator('.survey-question')).toHaveCount(0);
});

test('E4: в приёмник уходят коды вариантов, а не подписи', async ({ page }) => {
  await answerEverything(page);

  const [request] = await Promise.all([
    page.waitForRequest((req) => req.url().includes('/macros/s/') && req.method() === 'POST'),
    page.locator('.submit-button').click(),
  ]);

  expect(request.url()).toBe(WEB_REQUEST);
  const payload = JSON.parse(request.postData());

  expect(payload.survey).toBe('invitation');
  expect(payload.answers.map((item) => item.id)).toEqual(['place', 'time', 'mood']);
  expect(payload.answers.map((item) => item.answer)).toEqual([
    'wine_bar',
    'weekend_evening',
    'quiet, food',
  ]);
  expect(request.postData()).not.toContain('Винный бар');
});

test('E5: при ошибке сервера приглашение не «принято», показано сообщение', async ({ page }) => {
  await page.unroute(`${FAKE_ENDPOINT}?client=web`);
  await page.route('**/macros/s/**', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false}' }),
  );

  await answerEverything(page);
  await page.locator('.submit-button').click();

  await expect(page.locator('.submit-error')).toBeVisible();
  await expect(page.locator('.thank-you-screen')).toBeHidden();
  await expect(page.locator('.submit-button')).toBeEnabled();
});

test('E8: кнопка блокируется на время отправки и оживает после ошибки', async ({ page }) => {
  const submit = page.locator('.submit-button');

  await page.unroute(`${FAKE_ENDPOINT}?client=web`);
  await page.route('**/macros/s/**', async (route) => {
    await new Promise((resolve) => { setTimeout(resolve, 1500); });
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });

  await answerEverything(page);
  await submit.click();
  await expect
    .poll(() => submit.isDisabled(), { message: 'во время отправки кнопка заперта' })
    .toBe(true);
  await expect(submit).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.thank-you-screen')).toBeVisible();

  await page.unroute('**/macros/s/**');
  await page.route('**/macros/s/**', (route) => route.abort('connectionrefused'));
  await page.reload();
  await answerEverything(page);
  await page.locator('.submit-button').click();
  await expect(page.locator('.submit-error')).toBeVisible();
  await expect(page.locator('.submit-button')).toBeEnabled();
});

test('E7: логика не создаёт инлайн-стилей', async ({ page }) => {
  const violations = () =>
    page.evaluate(() => ({
      inline: document.querySelectorAll('[style]').length,
      injected: document.querySelectorAll('style').length,
    }));

  expect(await violations()).toEqual({ inline: 0, injected: 0 });
  await answerEverything(page);
  await page.locator('.submit-button').click();
  await expect(page.locator('.thank-you-screen')).toBeVisible();
  expect(await violations()).toEqual({ inline: 0, injected: 0 });
});
