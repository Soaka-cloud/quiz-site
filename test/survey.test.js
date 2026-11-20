import test from 'node:test';
import assert from 'node:assert/strict';

import { renderQuestion } from '../survey.js';

const question = {
  id: 'q1',
  text: 'Какой формат работы вам ближе?',
  options: ['Удалённо', 'Гибрид', 'Офис'],
};

test('U4: renderQuestion отдаёт разметку с крючками редизайна', () => {
  const html = renderQuestion(question);

  assert.equal(html.includes('survey-question'), true, 'нет крючка survey-question');
  assert.equal(html.includes('answer-option'), true, 'нет крючка answer-option');
  assert.equal(html.includes('data-question-id="q1"'), true, 'нет data-question-id');
});
