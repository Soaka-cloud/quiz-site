import { test, expect } from '@playwright/test';

const QUESTION_COUNT = 4;
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

async function pickDate(page, preset) {
  await question(page, 'dates').locator('.date-chip', { hasText: new RegExp('^' + preset + '$') }).click();
}

async function answerEverything(page) {
  await pickDate(page, 'Суббота');
  await question(page, 'cuisine').locator('.answer-chip', { hasText: /^Азия$/ }).click();
  await question(page, 'format').locator('.answer-option', { hasText: /^Ресторан/ }).click();
}

test('E1: приглашение открывается, все четыре раздела на месте', async ({ page }) => {
  await expect(page.locator('.survey-question')).toHaveCount(QUESTION_COUNT);
  await expect(page.locator('.survey-seal')).toHaveText('М');

  await expect(question(page, 'dates').locator('.question-text')).toHaveText('Даты');
  await expect(question(page, 'cuisine').locator('.question-text')).toHaveText('Кухня');
  await expect(question(page, 'format').locator('.question-text')).toHaveText('Формат');
  await expect(question(page, 'custom').locator('.question-text')).toHaveText('Свои варианты');

  await expect(page.locator('.submit-button')).toHaveText('Подписать приглашение');
});

test('E1b: служебные коды не видны посетителю', async ({ page }) => {
  const text = await page.locator('.question-list').innerText();
  expect(text).not.toContain('[object Object]');
  expect(text).not.toContain('wine_bar');
  expect(text).not.toContain('undefined');
});

test('E2: готовые даты выбираются и снимаются', async ({ page }) => {
  const dates = question(page, 'dates');
  const saturday = dates.locator('.date-chip', { hasText: /^Суббота$/ });

  await expect.poll(() => dates.getAttribute('data-answered')).toBe('false');
  await saturday.click();
  await expect(saturday).toHaveAttribute('data-selected', 'true');
  await expect.poll(() => dates.getAttribute('data-answered')).toBe('true');
  await expect(dates.locator('.date-token')).toHaveCount(1);

  await saturday.click();
  await expect(saturday).toHaveAttribute('data-selected', 'false');
  await expect(dates.locator('.date-token')).toHaveCount(0);
});

test('E2b: свою дату можно написать и убрать', async ({ page }) => {
  const dates = question(page, 'dates');

  await dates.locator('.date-input').fill('7 декабря, 19:00');
  await dates.locator('.date-add').click();

  await expect(dates.locator('.date-token')).toHaveCount(1);
  await expect(dates.locator('.date-token')).toContainText('7 декабря, 19:00');
  await expect(dates.locator('.date-input')).toHaveValue('');

  await dates.locator('.date-remove').click();
  await expect(dates.locator('.date-token')).toHaveCount(0);
  await expect.poll(() => dates.getAttribute('data-answered')).toBe('false');
});

test('E2c: Enter в поле даты добавляет её, несколько дат складываются', async ({ page }) => {
  const dates = question(page, 'dates');

  await dates.locator('.date-input').fill('Первое декабря');
  await dates.locator('.date-input').press('Enter');
  await pickDate(page, 'Ближайшая пятница');

  await expect(dates.locator('.date-token')).toHaveCount(2);
  await expect(dates.locator('.date-token').first()).toContainText('Первое декабря');
});

test('E2d: кухня — мультивыбор по группам', async ({ page }) => {
  const cuisine = question(page, 'cuisine');
  const asia = cuisine.locator('.answer-chip', { hasText: /^Азия$/ });
  const pizza = cuisine.locator('.answer-chip', { hasText: /^Пицца$/ });

  await asia.click();
  await pizza.click();
  await expect(asia).toHaveAttribute('data-selected', 'true');
  await expect(pizza).toHaveAttribute('data-selected', 'true');

  await asia.click();
  await expect(asia).toHaveAttribute('data-selected', 'false');
  await expect(pizza).toHaveAttribute('data-selected', 'true');
});

test('E6: кнопка заперта, пока не заполнены обязательные разделы', async ({ page }) => {
  const submit = page.locator('.submit-button');
  await expect(submit).toBeDisabled();

  await pickDate(page, 'Суббота');
  await expect(submit).toBeDisabled();

  await question(page, 'cuisine').locator('.answer-chip', { hasText: /^Роллы$/ }).click();
  await expect(submit).toBeDisabled();

  await question(page, 'format').locator('.answer-option', { hasText: /^Кофейня/ }).click();
  await expect(submit).toBeEnabled();
});

test('E3: после заполнения показывается принятое приглашение', async ({ page }) => {
  await answerEverything(page);
  await page.locator('.submit-button').click();

  await expect(page.locator('.thank-you-screen')).toBeVisible();
  await expect(page.locator('.thank-you-screen__title')).toContainText('принято');
  await expect(page.locator('.survey-question')).toHaveCount(0);
});

test('E4: в приёмник уходят коды, своя дата и свой вариант текстом', async ({ page }) => {
  await answerEverything(page);
  await question(page, 'dates').locator('.date-input').fill('5 декабря');
  await question(page, 'dates').locator('.date-add').click();
  await question(page, 'custom').locator('.answer-input').fill('Суши-бар у дома');

  const [request] = await Promise.all([
    page.waitForRequest((req) => req.url().includes('/macros/s/') && req.method() === 'POST'),
    page.locator('.submit-button').click(),
  ]);

  expect(request.url()).toBe(WEB_REQUEST);
  const payload = JSON.parse(request.postData());

  expect(payload.survey).toBe('invitation');
  expect(payload.answers.map((item) => item.id)).toEqual(['dates', 'cuisine', 'format', 'custom']);
  expect(payload.answers[0].answer).toContain('Суббота');
  expect(payload.answers[0].answer).toContain('5 декабря');
  expect(payload.answers[1].answer).toBe('азия');
  expect(payload.answers[2].answer).toBe('ресторан');
  expect(payload.answers[3].answer).toBe('Суши-бар у дома');
});

test('E4b: необязательный раздел не блокирует отправку и не попадает в payload', async ({ page }) => {
  await answerEverything(page);

  const [request] = await Promise.all([
    page.waitForRequest((req) => req.url().includes('/macros/s/') && req.method() === 'POST'),
    page.locator('.submit-button').click(),
  ]);

  const payload = JSON.parse(request.postData());
  expect(payload.answers.map((item) => item.id)).toEqual(['dates', 'cuisine', 'format']);
});

test('E5: при ошибке сервера приглашение не «принято», показано сообщение', async ({ page }) => {
  await page.unroute(WEB_REQUEST);
  await page.route('**/macros/s/**', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false}' }),
  );

  await answerEverything(page);
  await page.locator('.submit-button').click();

  await expect(page.locator('.submit-error')).toBeVisible();
  await expect(page.locator('.thank-you-screen')).toBeHidden();
  await expect(page.locator('.submit-button')).toBeEnabled();
});

test('E8: кнопка блокируется на время отправки', async ({ page }) => {
  const submit = page.locator('.submit-button');

  await page.unroute(WEB_REQUEST);
  await page.route('**/macros/s/**', async (route) => {
    await new Promise((resolve) => { setTimeout(resolve, 1200); });
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });

  await answerEverything(page);
  await submit.click();
  await expect.poll(() => submit.isDisabled(), { message: 'во время отправки кнопка заперта' }).toBe(true);
  await expect(submit).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.thank-you-screen')).toBeVisible();
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
