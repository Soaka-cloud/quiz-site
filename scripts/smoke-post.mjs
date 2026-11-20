import { readFileSync } from 'node:fs';

const config = readFileSync(new URL('../config.js', import.meta.url), 'utf8');
const endpoint = config.match(/endpoint:\s*'([^']+)'/)[1];
if (endpoint.includes('ВСТАВЬТЕ') || !endpoint.startsWith('https://script.google.com/')) {
  throw new Error(`в config.js нет реального URL: ${endpoint}`);
}

const payload = {
  timestamp: new Date().toISOString(),
  survey: 'smoke-manual',
  answers: [
    { id: 'q1', question: 'Smoke: формат работы?', answer: 'Удалённо' },
    { id: 'q2', question: 'Smoke: темп обучения?', answer: 'Быстрый' },
  ],
};

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify(payload),
  redirect: 'follow',
});

const text = await response.text();
console.log('status:', response.status);
console.log('url:', endpoint);
console.log('body:', text.slice(0, 500));
