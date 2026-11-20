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
  };
  return { sheet, rows };
}

test('R1: doPost пишет значения как пришли, ничего не подменяет и отдаёт ok:true', () => {
  const { sheet, rows } = recorder();
  const output = [];

  const { doPost } = loadCodeGs({
    properties: { getScriptProperties: () => ({ getProperty: (key) => (key === 'SHEET_ID' ? 'fake-id' : null) }) },
    spreadsheet: { openById: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }) },
    utilities: { newBlob: (text) => ({ getDataAsString: () => text }) },
    content: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({ setMimeType: () => text, text }),
    },
  });

  const result = doPost({
    parameter: { client: 'web' },
    postData: {
      contents: JSON.stringify({
        timestamp: '2026-11-20T10:41:33.004Z',
        survey: 'default',
        answers: [
          { id: 'q1', question: 'Формат?', answer: 'undecided' },
          { id: 'q2', question: 'Важно?', answer: 'offer' },
          { id: 'q3', question: 'Время?', answer: '20-40' },
        ],
      }),
    },
  });

  assert.equal(rows.at(-1).slice(2, 4).join(','), 'utf8,web');
  assert.deepEqual(rows.at(-2), ['Timestamp', 'Survey', 'encoding', 'client', 'Формат?', 'Важно?', 'Время?']);
  assert.deepEqual(rows.at(-1).slice(4), ['undecided', 'offer', '20-40']);
  assert.equal(JSON.parse(result).ok, true);
  assert.equal(output.length, 0);
});
