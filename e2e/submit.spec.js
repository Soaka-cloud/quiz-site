import { test, expect } from '@playwright/test';

const QUESTION_COUNT = 3;
const FAKE_ENDPOINT = 'https://script.google.com/macros/s/FAKE_DEPLOYMENT_ID/exec';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((endpoint) => {
    window.SURVEY_CONFIG = { endpoint };
  }, FAKE_ENDPOINT);
  await page.goto('/index.html');
});

async function answerEverything(page) {
  for (let i = 0; i < QUESTION_COUNT; i += 1) {
    await page.locator('.survey-question').nth(i).locator('.answer-option').nth(1).click();
  }
}

test('E4: при отправке уходит JSON с timestamp и ответами по вопросам', async ({ page }) => {
  await page.route('**/macros/s/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await answerEverything(page);

  const [request] = await Promise.all([
    page.waitForRequest((req) => req.url().includes('/macros/s/') && req.method() === 'POST'),
    page.locator('.submit-button').click(),
  ]);

  expect(request.url()).toBe(FAKE_ENDPOINT);

  const payload = JSON.parse(request.postData());
  expect(typeof payload.timestamp).toBe('string');
  expect(new Date(payload.timestamp).toString()).not.toBe('Invalid Date');

  expect(Array.isArray(payload.answers)).toBe(true);
  expect(payload.answers).toHaveLength(QUESTION_COUNT);

  const first = payload.answers[0];
  expect(first.id).toBe('q1');
  expect(typeof first.question).toBe('string');
  expect(first.question.length).toBeGreaterThan(0);
  expect(first.answer).toBe('Гибрид');

  await expect(page.locator('.thank-you-screen')).toBeVisible();
});

test('E5: при ошибке сервера благодарности нет, показывается сообщение об ошибке', async ({ page }) => {
  await page.route('**/macros/s/**', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false}' });
  });

  await answerEverything(page);
  await page.locator('.submit-button').click();

  await expect(page.locator('.submit-error')).toBeVisible();
  await expect(page.locator('.thank-you-screen')).toBeHidden();
  await expect(page.locator('.submit-button')).toBeEnabled();
});

test('E6: кнопка отправки заблокирована, пока не отвечены все вопросы', async ({ page }) => {
  const submit = page.locator('.submit-button');
  await expect(submit).toBeDisabled();

  await page.locator('.survey-question').first().locator('.answer-option').first().click();
  await expect(submit).toBeDisabled();

  await answerEverything(page);
  await expect(submit).toBeEnabled();
});

test('E8: кнопка блокируется на время отправки и разблокируется при сетевой ошибке', async ({ page }) => {
  const submit = page.locator('.submit-button');

  await page.route('**/macros/s/**', async (route) => {
    await new Promise((resolve) => { setTimeout(resolve, 2000); });
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });

  await answerEverything(page);
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect
    .poll(() => submit.isDisabled(), { message: 'во время ожидания ответа кнопка должна быть disabled' })
    .toBe(true);
  await expect(submit).toHaveAttribute('aria-busy', 'true');

  await expect(page.locator('.thank-you-screen')).toBeVisible();
  await expect(submit).toBeHidden();

  await page.unroute('**/macros/s/**');
  await page.route('**/macros/s/**', (route) => route.abort('connectionrefused'));
  await page.reload();
  await answerEverything(page);

  await page.locator('.submit-button').click();
  await expect(page.locator('.submit-error')).toBeVisible();
  await expect(page.locator('.submit-button')).toBeEnabled();
  await expect(page.locator('.submit-button')).not.toHaveAttribute('aria-busy', 'true');
});

test('E7: логика не создаёт инлайн-стилей и не правит CSS', async ({ page }) => {
  await page.route('**/macros/s/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
  );

  const styleViolations = () =>
    page.evaluate(() => {
      const inline = [...document.querySelectorAll('[style]')].map((el) => el.outerHTML.slice(0, 80));
      const injected = [...document.querySelectorAll('style')].length;
      return { inline, injected };
    });

  expect(await styleViolations()).toEqual({ inline: [], injected: 0 });

  await answerEverything(page);
  await page.locator('.submit-button').click();
  await expect(page.locator('.thank-you-screen')).toBeVisible();

  expect(await styleViolations()).toEqual({ inline: [], injected: 0 });
});
