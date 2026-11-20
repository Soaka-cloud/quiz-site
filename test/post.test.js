import test from 'node:test';
import assert from 'node:assert/strict';

import { postAnswers } from '../survey.js';

const ENDPOINT = 'https://script.google.com/macros/s/FAKE/exec';

async function withFetch(fake, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fake;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

test('U12: нечитаемый ответ после редиректа даёт понятную ошибку, а не зависание', async () => {
  await withFetch(
    async () => ({
      ok: true,
      status: 302,
      text: async () => {
        throw new TypeError('Response body is unavailable for redirect responses');
      },
    }),
    async () => {
      await assert.rejects(
        () => postAnswers(ENDPOINT, { answers: [] }),
        /ответ не читается/,
      );
    },
  );
});

test('U13: сетевой сбой даёт сообщение, а не пустую ошибку', async () => {
  await withFetch(
    async () => {
      throw new TypeError('Failed to fetch');
    },
    async () => {
      await assert.rejects(() => postAnswers(ENDPOINT, { answers: [] }), /Не удалось отправить ответы: Failed to fetch/);
    },
  );
});

test('U14: молчащий приёмник обрывается по таймауту с понятным текстом', async () => {
  await withFetch(
    (url, options) =>
      new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }),
    async () => {
      await assert.rejects(
        () => postAnswers(ENDPOINT, { answers: [] }, 'web', 100),
        /не ответил за 0 с/,
      );
    },
  );
});

test('U15: ответ {ok:true} проходит, {ok:false} превращается в ошибку с текстом сервера', async () => {
  await withFetch(
    async () => ({ ok: true, status: 200, text: async () => '{"ok":true}' }),
    async () => {
      const data = await postAnswers(ENDPOINT, { answers: [] });
      assert.equal(data.ok, true);
    },
  );

  await withFetch(
    async () => ({ ok: true, status: 200, text: async () => '{"ok":false,"error":"нет Sheet ID"}' }),
    async () => {
      await assert.rejects(() => postAnswers(ENDPOINT, { answers: [] }), /нет Sheet ID/);
    },
  );
});
