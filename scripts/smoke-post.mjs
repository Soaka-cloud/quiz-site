import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Header values sent with the request must stay ASCII: a non-ASCII header
// makes fetch die before anything is sent ("Cannot convert argument to a ByteString").
const CLIENT_HEADER = 'quiz-site-smoke';

const here = new URL('./', import.meta.url);
const configSource = readFileSync(new URL('../config.js', here), 'utf8');
const endpoint = configSource.match(/endpoint:\s*'([^']+)'/)[1];
if (!endpoint.startsWith('https://script.google.com/')) {
  throw new Error('config.js does not contain a real Web App URL');
}

const payload = {
  timestamp: new Date().toISOString(),
  survey: 'smoke',
  source: 'smoke-post.mjs',
  answers: [
    { id: 'q1', question: 'Какой формат работы вам ближе?', answer: 'Удалённо' },
    { id: 'q2', question: 'Сколько времени в день вы готовы уделять обучению?', answer: '1–3 часа' },
    { id: 'q3', question: 'Что для вас важнее в новой работе?', answer: 'Интересные задачи' },
  ],
};

const body = JSON.stringify(payload);
const hash = createHash('sha256').update(body, 'utf8').digest('hex');

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain;charset=utf-8',
    'X-Client': CLIENT_HEADER,
  },
  body,
  redirect: 'follow',
});

const text = await response.text();

console.log('status:', response.status);
console.log('timestamp:', payload.timestamp);
console.log('non-ascii chars in body:', [...body].filter((ch) => ch.codePointAt(0) > 127).length);
console.log('sha256(body):', hash);
console.log('body:', text.slice(0, 300));

if (response.ok && text.includes('"ok":true')) {
  writeFileSync(new URL('./.smoke-post.done', here), `${payload.timestamp} ${hash}\n`, 'utf8');
  console.log('marker written: scripts/.smoke-post.done');
}
