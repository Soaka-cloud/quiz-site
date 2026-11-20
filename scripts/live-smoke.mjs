// Одноразовый live-smoke по РЕАЛЬНОМУ пути пользователя: локальная страница -> живой Web App.
// Живой POST разрешён к выполнению один раз: после успеха пишется маркер,
// повторный запуск без --force отказывает (exit 2).
import { chromium } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const marker = new URL('./.live-smoke.done', import.meta.url);
const force = process.argv.includes('--force');

if (existsSync(marker) && !force) {
  console.error('live smoke already done:', readFileSync(marker, 'utf8').trim());
  process.exit(2);
}

const PORT = 8123;
const server = spawn('python', ['-m', 'http.server', String(PORT)], { stdio: 'ignore' });

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

async function waitForServer() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://localhost:${PORT}/index.html`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error('static server did not start on port ' + PORT);
}

try {
  await waitForServer();

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.waitForSelector('.survey-question');

  const realEndpoint = await page.evaluate(() => window.SURVEY_CONFIG.endpoint);
  if (!realEndpoint.startsWith('https://script.google.com/')) {
    throw new Error('config.js does not carry a real endpoint: ' + realEndpoint);
  }

  const total = await page.locator('.survey-question').count();
  const picked = [];
  for (let i = 0; i < total; i += 1) {
    const options = page.locator('.survey-question').nth(i).locator('.answer-option');
    picked.push((await options.nth(2).innerText()).trim());
    await options.nth(2).click();
  }

  const [request, response] = await Promise.all([
    page.waitForRequest((req) => req.url().includes('/macros/s/') && req.method() === 'POST'),
    page.waitForResponse((res) => res.url().includes('/macros/s/') && res.request().method() === 'POST', { timeout: 30000 }),
    page.locator('.submit-button').click(),
  ]);

  const body = request.postData();
  const payload = JSON.parse(body);

  console.log('page url         :', request.url());
  console.log('answers clicked  :', picked.join(' | '));
  console.log('timestamp        :', payload.timestamp);
  console.log('answer texts     :', payload.answers.map((a) => a.answer).join(' | '));
  console.log('non-ascii in body:', [...body].filter((ch) => ch.codePointAt(0) > 127).length);
  console.log('http status      :', response.status());
  console.log('final url        :', response.url().slice(0, 100) + '...');

  await page.locator('.thank-you-screen').waitFor({ state: 'visible', timeout: 15000 });
  console.log('thank-you screen : visible');
  console.log('console errors   :', consoleErrors.length ? consoleErrors : 'none');

  await browser.close();

  writeFileSync(
    marker,
    `${payload.timestamp}\n${payload.answers.map((a) => a.answer).join(' | ')}\n`,
    'utf8',
  );
  console.log('');
  console.log('CHECK IN SHEET — timestamp:', payload.timestamp);
  console.log('CHECK IN SHEET — answers  :', payload.answers.map((a) => a.answer).join(' | '));
} finally {
  server.kill();
}
