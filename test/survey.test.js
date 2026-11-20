import test from 'node:test';
import assert from 'node:assert/strict';

import { renderQuestion, renderTextQuestion } from '../survey.js';

const question = {
  id: 'q1',
  type: 'radio',
  text: 'Какой формат работы вам ближе?',
  options: [
    { label: 'Удалённо', value: 'Удалённо' },
    { label: 'Гибрид', value: 'Гибрид' },
    { label: 'Офис', value: 'Офис' },
  ],
};

const textQuestion = {
  id: 'q5',
  type: 'text',
  text: 'Откуда ты узнал(а) про этот опрос?',
  options: [],
  required: true,
  placeholder: 'Группа, знакомый, лента.',
};

test('U4: renderQuestion отдаёт разметку с крючками редизайна', () => {
  const html = renderQuestion(question);

  assert.equal(html.includes('survey-question'), true, 'нет крючка survey-question');
  assert.equal(html.includes('answer-option'), true, 'нет крючка answer-option');
  assert.equal(html.includes('data-question-id="q1"'), true, 'нет data-question-id');
});

test('U7: в отрендеренном варианте нет метки Recommended и нет лишних полей', () => {
  const html = renderQuestion({
    ...question,
    options: [{ label: 'Удалённо', value: 'Удалённо', recommended: true }],
  });

  assert.equal(html.includes('Recommended'), false, 'подсказка попала в разметку');
  assert.equal(html.includes('[object Object]'), false, 'вариант отрисован как объект');
  assert.equal(html.includes('>Удалённо<'), true, 'метка варианта не отрисована');
});

test('U8: renderTextQuestion отдаёт поле ввода с крючками и required-флагом', () => {
  const html = renderTextQuestion(textQuestion);

  assert.equal(html.includes('survey-question'), true);
  assert.equal(html.includes('answer-input'), true, 'нет крючка answer-input');
  assert.equal(html.includes('data-question-id="q5"'), true);
  assert.equal(html.includes('data-required="true"'), true);
  assert.equal(html.includes('placeholder="Группа, знакомый, лента."'), true);
});
