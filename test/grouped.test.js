import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildPayload, renderDatesQuestion, renderGroupedQuestion, allOptions } from '../survey.js';

const grouped = {
  id: 'cuisine',
  type: 'checkbox',
  text: 'Кухня',
  groups: [
    { name: 'Кухни', options: [{ label: 'Азия', value: 'азия' }, { label: 'Европа', value: 'европа' }] },
    { name: 'Конкретнее', options: [{ label: 'Пицца', value: 'пицца' }] },
  ],
};

const dates = {
  id: 'dates',
  type: 'dates',
  text: 'Даты',
  presets: ['Суббота', 'Воскресенье'],
  placeholder: 'Своя дата',
};

test('U16: allOptions склеивает группы в один список с общими индексами', () => {
  assert.deepEqual(
    allOptions(grouped).map((option) => option.value),
    ['азия', 'европа', 'пицца'],
  );
});

test('U17: индексы вариантов в группах соответствуют allOptions', () => {
  const html = renderGroupedQuestion(grouped);
  const indexes = [...html.matchAll(/data-option-index="(\d+)"/g)].map((m) => Number(m[1]));
  assert.deepEqual(indexes, [0, 1, 2]);
  assert.equal(html.includes('answer-group-name'), true, 'нет подписи группы');
});

test('U18: мультивыбор из групп превращается в коды через запятую', () => {
  const payload = buildPayload({ cuisine: [0, 2] }, [grouped], new Date());
  assert.equal(payload.answers[0].answer, 'азия, пицца');
});

test('U19: своя дата попадает в payload как введена, пресеты — как метки', () => {
  const payload = buildPayload({ dates: ['Суббота', '5 декабря'] }, [dates], new Date());
  assert.equal(payload.answers[0].answer, 'Суббота, 5 декабря');
});

test('U20: раздел дат рендерится с полем ввода и пресетами', () => {
  const html = renderDatesQuestion(dates);
  assert.equal(html.includes('date-presets'), true);
  assert.equal(html.includes('date-input'), true);
  assert.equal(html.includes('date-add'), true);
  assert.equal(html.includes('Суббота'), true);
  assert.equal(html.includes('placeholder="Своя дата"'), true);
});
