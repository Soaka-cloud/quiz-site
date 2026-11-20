// Один прогон по ЖИВОМУ URL GitHub Pages: открыть, заполнить, отправить, дождаться благодарности.
// Сценарий не привязан к хардкоду вариантов: отвечает по типам вопросов, как живой посетитель.
// Живой POST разрешён один раз: маркер scripts/.pages-smoke.done, повтор без --force отказывает.
import { chromium } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const marker = new URL('./.pages-smoke.done', import.meta.url);
const force = process.argv.includes('--force');
const liveUrl = process.argv.find((arg) => arg.startsWith('http')) || 'https://soaka-cloud.github.io/quiz-site/';

if (existsSync(marker) && !force) {
  console.error('pages smoke already done:', readFileSync(marker, 'utf8').trim());
  process.exit(2);
}

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

try {
  const response = await page.goto(liveUrl, { waitUntil: 'domcontentloaded' });
  console.log('live url        :', liveUrl);
  console.log('http status     :', response && response.status());

  await page.waitForSelector('.survey-question', { timeout: 20000 });

  const endpoint = await page.evaluate(() => window.SURVEY_CONFIG.endpoint);
  console.log('endpoint        :', endpoint);
  if (!endpoint.startsWith('https://script.google.com/')) {
    throw new Error('на живой странице нет рабочего endpoint (config.js не задеплоен?)');
  }

  const plan = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.survey-question')];
    return nodes.map((node) => ({
      id: node.dataset.questionId,
      hasOptions: node.querySelectorAll('.answer-option').length > 0,
      hasInput: Boolean(node.querySelector('.answer-input')),
      optionCount: node.querySelectorAll('.answer-option').length,
    }));
  });
  console.log('questions       :', plan.length, plan.map((item) => `${item.id}:${item.hasInput ? 'text' : 'choice'}`).join(' '));

  const picked = [];
  for (const item of plan) {
    const node = page.locator(`.survey-question[data-question-id="${item.id}"]`);
    if (item.hasInput) {
      const text = item.id === 'q4' ? 'Учился на своих ошибках в проектах' : 'Форум';
      await node.locator('.answer-input').fill(text);
      picked.push(`${item.id}=${text}`);
      continue;
    }
    const labels = node.locator('.answer-option');
    if (item.optionCount > 1) {
      const labels2 = node.locator('.answer-option');
      const first = (await labels.nth(0).innerText()).trim();
      await labels2.nth(0).click();
      picked.push(`${item.id}=${first}`);
    } else {
      await labels.nth(0).click();
      picked.push(`${item.id}=(single)`);
    }
  }
  console.log('answers clicked :', picked.join(' | '));

  const [request, postResponse] = await Promise.all([
    page.waitForRequest((req) => req.url().includes('/macros/s/') && req.method() === 'POST'),
    page.waitForResponse((res) => res.url().includes('/macros/s/') && res.request().method() === 'POST', { timeout: 40000 }),
    page.locator('.submit-button').click(),
  ]);

  const payload = JSON.parse(request.postData());
  console.log('page -> POST    :', request.url().slice(0, 90) + '...');
  console.log('timestamp       :', payload.timestamp);
  console.log('answers in payload:', payload.answers.map((a) => `${a.id}=${a.answer}`).join(' | '));
  console.log('http status     :', postResponse.status());

  const outcome = await page
    .locator('.thank-you-screen, .submit-error')
    .first()
    .waitFor({ state: 'visible', timeout: 30000 })
    .then(() => 'settled')
    .catch(() => 'timeout');

  if (outcome === 'timeout') {
    const busy = await page.locator('.submit-button').getAttribute('aria-busy');
    const errorText = await page.locator('.submit-error').innerText();
    console.log('RESULT          : ни благодарности, ни ошибки за 30 с');
    console.log('submit aria-busy:', busy);
    console.log('submit-error     :', JSON.stringify(errorText));
    console.log('console errors  :', consoleErrors.length ? consoleErrors : 'none');
    process.exitCode = 1;
  } else {
    const thankYou = await page.locator('.thank-you-screen').isVisible();
    console.log('thank-you shown :', thankYou);
    console.log('error shown     :', JSON.stringify(await page.locator('.submit-error').innerText()));
    console.log('console errors  :', consoleErrors.length ? consoleErrors : 'none');
    if (thankYou) {
      writeFileSync(
        marker,
        `${payload.timestamp}\n${payload.answers.map((a) => `${a.id}=${a.answer}`).join(' | ')}\n`,
        'utf8',
      );
      console.log('');
      console.log('CHECK IN SHEET — timestamp:', payload.timestamp);
      console.log('CHECK IN SHEET — answers  :', payload.answers.map((a) => `${a.id}=${a.answer}`).join(' | '));
    } else {
      process.exitCode = 1;
    }
  }
} finally {
  await browser.close();
}
