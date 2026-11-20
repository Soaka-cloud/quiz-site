import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPayload, selectAnswer, submitUrl } from '../survey.js';

const questions = [
  { id: 'q1', text: 'Формат работы?', options: ['Удалённо', 'Гибрид', 'Офис'] },
  { id: 'q2', text: 'Темп обучения?', options: ['Спокойный', 'Быстрый'] },
];

test('U1: buildPayload отдаёт ответы текстом, в порядке вопросов', () => {
  const payload = buildPayload({ q2: 1, q1: 0 }, questions, new Date('2026-11-20T10:00:00.000Z'));

  assert.deepEqual(payload.answers, [
    { id: 'q1', question: 'Формат работы?', answer: 'Удалённо' },
    { id: 'q2', question: 'Темп обучения?', answer: 'Быстрый' },
  ]);
});

test('U2: timestamp — ISO-строка из переданного времени', () => {
  const now = new Date('2026-11-20T10:00:00.000Z');
  const payload = buildPayload({ q1: 0, q2: 0 }, questions, now);

  assert.equal(payload.timestamp, '2026-11-20T10:00:00.000Z');
});

test('U3: повторный выбор вопроса заменяет ответ, а не добавляет второй', () => {
  let answers = selectAnswer({}, 'q1', 2);
  answers = selectAnswer(answers, 'q1', 1);

  const payload = buildPayload({ ...answers, q2: 0 }, questions, new Date());
  assert.equal(payload.answers.filter((item) => item.id === 'q1').length, 1);
  assert.equal(payload.answers[0].answer, 'Гибрид');
});

test('U5: submitUrl берёт адрес из конфига, иначе бросает ошибку', () => {
  assert.equal(submitUrl({ endpoint: 'https://example.test/exec' }), 'https://example.test/exec');
  assert.throws(() => submitUrl({}), /endpoint/);
  assert.throws(() => submitUrl(undefined), /endpoint/);
});
