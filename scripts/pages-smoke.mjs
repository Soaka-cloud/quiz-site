// Один прогон по ЖИВОМУ URL GitHub Pages: открыть, заполнить, отправить, дождаться благодарности.
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
  const total = await page.locator('.survey-question').count();
  console.log('questions       :', total);

  const endpoint = await page.evaluate(() => window.SURVEY_CONFIG.endpoint);
  console.log('endpoint        :', endpoint);
  if (!endpoint.startsWith('https://script.google.com/')) {
    throw new Error('на живой странице нет рабочего endpoint (config.js не задеплоен?)');
  }

  const picked = [];
  for (let i = 0; i < total; i += 1) {
    const options = page.locator('.survey-question').nth(i).locator('.answer-option');
    picked.push((await options.nth(1).innerText()).trim());
    await options.nth(1).click();
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
  console.log('answer texts    :', payload.answers.map((a) => a.answer).join(' | '));
  console.log('http status     :', postResponse.status());

  await page.locator('.thank-you-screen').waitFor({ state: 'visible', timeout: 20000 });
  console.log('thank-you screen: visible');
  console.log('console errors  :', consoleErrors.length ? consoleErrors : 'none');

  writeFileSync(marker, `${payload.timestamp}\n${payload.answers.map((a) => a.answer).join(' | ')}\n`, 'utf8');
  console.log('');
  console.log('CHECK IN SHEET — timestamp:', payload.timestamp);
  console.log('CHECK IN SHEET — answers  :', payload.answers.map((a) => a.answer).join(' | '));
} finally {
  await browser.close();
}
