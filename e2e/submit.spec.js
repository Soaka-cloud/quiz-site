import { test, expect } from '@playwright/test';

const QUESTION_COUNT = 5;
const FAKE_ENDPOINT = 'https://script.google.com/macros/s/FAKE_DEPLOYMENT_ID/exec';
const WEB_REQUEST = `${FAKE_ENDPOINT}?client=web`;
const CONFIG_STUB = `window.SURVEY_CONFIG = { endpoint: '${FAKE_ENDPOINT}' };`;

test.beforeEach(async ({ page }) => {
  await page.route(WEB_REQUEST, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
  );
  await page.route('**/config.js', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: CONFIG_STUB }),
  );
  await page.goto('/index.html');
});

const question = (page, id) => page.locator(`.survey-question[data-question-id="${id}"]`);

async function answerEverything(page) {
  await question(page, 'q1').locator('.answer-option').nth(1).click();
  await question(page, 'q2').locator('.answer-option').nth(0).click();
  await question(page, 'q2').locator('.answer-option').nth(2).click();
  await question(page, 'q3').locator('.answer-option').nth(1).click();
  await question(page, 'q4').locator('.answer-input').fill('Помогал(а) тестировать чужой проект');
  await question(page, 'q5').locator('.answer-input').fill('Группа');
}

test('E4: при отправке уходит JSON с timestamp и ответами по вопросам', async ({ page }) => {
  await answerEverything(page);

  const [request] = await Promise.all([
    page.waitForRequest((req) => req.url().includes('/macros/s/') && req.method() === 'POST'),
    page.locator('.submit-button').click(),
  ]);

  expect(request.url()).toBe(WEB_REQUEST);

  const payload = JSON.parse(request.postData());
  expect(typeof payload.timestamp).toBe('string');
  expect(new Date(payload.timestamp).toString()).not.toBe('Invalid Date');

  expect(Array.isArray(payload.answers)).toBe(true);
  expect(payload.answers).toHaveLength(QUESTION_COUNT);
  expect(payload.answers.map((item) => item.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5']);

  expect(payload.answers[0].answer).toBe('office');
  expect(payload.answers[1].answer).toBe('real_tasks, feedback');
  expect(payload.answers[3].answer).toBe('Помогал(а) тестировать чужой проект');
  expect(payload.answers[4].answer).toBe('Группа');

  await expect(page.locator('.thank-you-screen')).toBeVisible();
});

test('E4b: необязательный пустой текстовый ответ не мешает отправке и не попадает в payload', async ({ page }) => {
  await question(page, 'q1').locator('.answer-option').nth(1).click();
  await question(page, 'q2').locator('.answer-option').nth(0).click();
  await question(page, 'q3').locator('.answer-option').nth(1).click();
  await question(page, 'q5').locator('.answer-input').fill('Лента');

  const submit = page.locator('.submit-button');
  await expect(submit).toBeEnabled();

  const [request] = await Promise.all([
    page.waitForRequest((req) => req.url().includes('/macros/s/') && req.method() === 'POST'),
    submit.click(),
  ]);

  const payload = JSON.parse(request.postData());
  expect(payload.answers.map((item) => item.id)).toEqual(['q1', 'q2', 'q3', 'q5']);
  await expect(page.locator('.thank-you-screen')).toBeVisible();
});

test('E5: при ошибке сервера благодарности нет, показывается сообщение об ошибке', async ({ page }) => {
  await page.unroute(WEB_REQUEST);
  await page.route('**/macros/s/**', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false}' });
  });

  await answerEverything(page);
  await page.locator('.submit-button').click();

  await expect(page.locator('.submit-error')).toBeVisible();
  await expect(page.locator('.thank-you-screen')).toBeHidden();
  await expect(page.locator('.submit-button')).toBeEnabled();
});

test('E6: кнопка отправки заблокирована, пока не заполнены обязательные вопросы', async ({ page }) => {
  const submit = page.locator('.submit-button');
  await expect(submit).toBeDisabled();

  await question(page, 'q1').locator('.answer-option').first().click();
  await expect(submit).toBeDisabled();

  await question(page, 'q2').locator('.answer-option').first().click();
  await question(page, 'q3').locator('.answer-option').first().click();
  await expect(submit).toBeDisabled();

  await question(page, 'q4').locator('.answer-input').fill('Вне работы');
  await expect(submit).toBeDisabled();

  await question(page, 'q5').locator('.answer-input').fill('Группа');
  await expect(submit).toBeEnabled();
});

test('E8: кнопка блокируется на время отправки и разблокируется при сетевой ошибке', async ({ page }) => {
  const submit = page.locator('.submit-button');

  await page.unroute(WEB_REQUEST);
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
