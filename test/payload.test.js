import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPayload, requestUrl, selectAnswer, submitUrl } from '../survey.js';

const questions = [
  {
    id: 'q1',
    type: 'radio',
    text: 'Формат работы?',
    options: [
      { label: 'Удалённо', value: 'remote' },
      { label: 'Гибрид', value: 'hybrid' },
      { label: 'Офис', value: 'office' },
    ],
  },
  {
    id: 'q2',
    type: 'checkbox',
    text: 'Что важно?',
    options: [
      { label: 'Наставник', value: 'mentor' },
      { label: 'Обратная связь', value: 'feedback' },
    ],
  },
  {
    id: 'q3',
    type: 'text',
    text: 'Откуда узнал(а)?',
    options: [],
    required: true,
  },
];

test('U1: buildPayload отдаёт ответы текстом, в порядке вопросов', () => {
  const payload = buildPayload(
    { q3: 'Группа', q2: [1], q1: 0 },
    questions,
    new Date('2026-11-20T10:00:00.000Z'),
  );

  assert.deepEqual(payload.answers, [
    { id: 'q1', question: 'Формат работы?', answer: 'remote' },
    { id: 'q2', question: 'Что важно?', answer: 'feedback' },
    { id: 'q3', question: 'Откуда узнал(а)?', answer: 'Группа' },
  ]);
});

test('U9: мультивыбор склеивается текстом, текстовый ответ сохраняется как введён', () => {
  const payload = buildPayload({ q1: 2, q2: [0, 1], q3: '  знакомый  ' }, questions, new Date());

  assert.equal(payload.answers[1].answer, 'mentor, feedback');
  assert.equal(payload.answers[2].answer, '  знакомый  ');
});

test('U11: answer берётся из value, а не из label (radio, checkbox, text)', () => {
  const withValues = [
    {
      id: 'r1',
      type: 'radio',
      text: 'Формат?',
      options: [
        { label: 'Удалённо', value: 'remote' },
        { label: 'Гибрид', value: 'hybrid' },
      ],
    },
    {
      id: 'c1',
      type: 'checkbox',
      text: 'Что важно?',
      options: [
        { label: 'Реальные задачи в проекте', value: 'real_tasks' },
        { label: 'Наставник рядом', value: 'mentor' },
      ],
    },
    {
      id: 't1',
      type: 'text',
      text: 'Откуда узнал(а)?',
      options: [],
    },
  ];

  const payload = buildPayload({ r1: 1, c1: [0, 1], t1: 'Группа' }, withValues, new Date());

  assert.deepEqual(
    payload.answers.map((item) => item.answer),
    ['hybrid', 'real_tasks, mentor', 'Группа'],
  );
  assert.equal(payload.answers[0].answer.includes('Гибрид'), false, 'в таблицу ушла метка');
  assert.equal(payload.answers[1].answer.includes('Реальные задачи'), false, 'в таблицу ушли метки');
});

test('U10: пустые ответы не попадают в payload', () => {
  const payload = buildPayload({ q1: undefined, q2: [], q3: '   ' }, questions, new Date());

  assert.deepEqual(payload.answers, []);
});

test('U2: timestamp — ISO-строка из переданного времени', () => {
  const now = new Date('2026-11-20T10:00:00.000Z');
  const payload = buildPayload({ q1: 0, q2: [0], q3: 'лента' }, questions, now);

  assert.equal(payload.timestamp, '2026-11-20T10:00:00.000Z');
});

test('U3: повторный выбор вопроса заменяет ответ, а не добавляет второй', () => {
  let answers = selectAnswer({}, 'q1', 2);
  answers = selectAnswer(answers, 'q1', 1);

  const payload = buildPayload({ ...answers, q2: [0], q3: 'лента' }, questions, new Date());
  assert.equal(payload.answers.filter((item) => item.id === 'q1').length, 1);
  assert.equal(payload.answers[0].answer, 'hybrid');
});

test('U5: submitUrl берёт адрес из конфига, иначе бросает ошибку', () => {
  assert.equal(submitUrl({ endpoint: 'https://example.test/exec' }), 'https://example.test/exec');
  assert.throws(() => submitUrl({}), /endpoint/);
  assert.throws(() => submitUrl(undefined), /endpoint/);
});

test('U6: requestUrl добавляет ASCII-маркер клиента, не ломая существующие параметры', () => {
  assert.equal(
    requestUrl('https://script.google.com/macros/s/ID/exec', 'web'),
    'https://script.google.com/macros/s/ID/exec?client=web',
  );
  assert.equal(
    requestUrl('https://example.test/exec?foo=1', 'smoke'),
    'https://example.test/exec?foo=1&client=smoke',
  );
});
