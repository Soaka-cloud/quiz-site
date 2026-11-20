import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function loadCodeGs(stub) {
  const source = readFileSync(path.join(root, 'apps-script', 'Code.gs'), 'utf8');
  const factory = new Function(`${source}\nreturn { doPost };`);
  globalThis.PropertiesService = stub.properties;
  globalThis.SpreadsheetApp = stub.spreadsheet;
  globalThis.Utilities = stub.utilities;
  globalThis.ContentService = stub.content;
  return factory();
}

function recorder() {
  const rows = [];
  const sheet = {
    getLastRow: () => rows.length,
    setFrozenRows: () => {},
    appendRow: (row) => rows.push(row),
    getRange: () => ({ setFontWeight: () => {}, setFontStyle: () => {} }),
  };
  return { sheet, rows };
}

function baseStub(sheet) {
  return {
    properties: { getScriptProperties: () => ({ getProperty: (key) => (key === 'SHEET_ID' ? 'fake-id' : null) }) },
    spreadsheet: { openById: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }) },
    utilities: { newBlob: (text) => ({ getDataAsString: () => text }) },
    content: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({ setMimeType: () => text, text }),
    },
  };
}

function post(payload) {
  return {
    parameter: { client: 'web' },
    postData: { contents: JSON.stringify(payload) },
  };
}

test('R2: шапка из двух строк — блоки над колонками и подписи колонок', () => {
  const { sheet, rows } = recorder();
  const { doPost } = loadCodeGs(baseStub(sheet));

  doPost(post({
    timestamp: '2026-11-20T12:00:00.000Z',
    survey: 'invitation',
    answers: [
      { id: 'dates', question: 'Даты', answer: 'Суббота' },
      { id: 'cuisine', question: 'Кухня', answer: 'азия' },
      { id: 'format', question: 'Формат', answer: 'ресторан' },
    ],
  }));

  assert.deepEqual(rows[0], [
    'Когда пришло', 'С кодировкой всё ок', 'Клиент',
    'ДАТЫ', 'ДАТЫ', '', '',
    'КУХНЯ', 'ФОРМАТ', 'СВОИ ВАРИАНТЫ',
  ]);
  assert.deepEqual(rows[1], [
    'Время (UTC)', 'utf8 / preserved', 'web / smoke',
    'Дата 1', 'Дата 2', 'Дата 3', 'Дата 4', 'Кухни', 'Формат', 'Комментарий',
  ]);
});

test('R3: даты раскладываются по четырём колонкам, текст дат сохраняется', () => {
  const { sheet, rows } = recorder();
  const { doPost } = loadCodeGs(baseStub(sheet));

  doPost(post({
    timestamp: '2026-11-20T12:00:00.000Z',
    survey: 'invitation',
    answers: [
      { id: 'dates', question: 'Даты', answer: 'Суббота, 5 декабря, На следующей неделе' },
      { id: 'format', question: 'Формат', answer: 'кафе' },
    ],
  }));

  const row = rows.at(-1);
  assert.equal(row[0], '2026-11-20T12:00:00.000Z');
  assert.deepEqual(row.slice(3, 7), ['Суббота', '5 декабря', 'На следующей неделе', '']);
  assert.equal(row[7], '');
  assert.equal(row[8], 'кафе');
});

test('R4: русские коды и комментарий пишутся без изменений', () => {
  const { sheet, rows } = recorder();
  const { doPost } = loadCodeGs(baseStub(sheet));

  const result = doPost(post({
    timestamp: '2026-11-20T12:00:00.000Z',
    survey: 'invitation',
    answers: [
      { id: 'dates', question: 'Даты', answer: 'Суббота' },
      { id: 'cuisine', question: 'Кухня', answer: 'азия, роллы' },
      { id: 'format', question: 'Формат', answer: 'дома вдвоём' },
      { id: 'custom', question: 'Свои варианты', answer: 'Суши-бар у дома' },
    ],
  }));

  const row = rows.at(-1);
  assert.equal(row[7], 'азия, роллы');
  assert.equal(row[8], 'дома вдвоём');
  assert.equal(row[9], 'Суши-бар у дома');
  assert.equal(JSON.parse(result).ok, true);
});

test('R5: пустой необязательный комментарий не ломает строку', () => {
  const { sheet, rows } = recorder();
  const { doPost } = loadCodeGs(baseStub(sheet));

  doPost(post({
    timestamp: '2026-11-20T12:00:00.000Z',
    survey: 'invitation',
    answers: [
      { id: 'dates', question: 'Даты', answer: 'Пятница' },
      { id: 'format', question: 'Формат', answer: 'кофейня' },
    ],
  }));

  const row = rows.at(-1);
  assert.equal(row.length, 10);
  assert.equal(row[9], '');
});
