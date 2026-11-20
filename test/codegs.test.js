import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const codeGs = readFileSync(path.join(root, 'apps-script', 'Code.gs'), 'utf8');

test('G1: Code.gs синтаксически валиден', () => {
  const source = readFileSync(path.join(root, 'apps-script', 'Code.gs'), 'utf8');

  assert.doesNotThrow(() => new Function(source), 'скрипт не парсится как JS');
});

test('G2: в Code.gs нет захардкоженного Sheet ID и есть чтение из Script Properties', () => {
  assert.equal(/[a-zA-Z0-9_-]{44}/.test(codeGs), false, 'похоже на литерал ID таблицы');
  assert.equal(codeGs.includes('getScriptProperties'), true, 'нет PropertiesService');
  assert.equal(codeGs.includes('SHEET_ID'), true, 'нет ключа SHEET_ID');
});

test('G3: doPost разбирает JSON, пишет appendRow и отвечает JSON', () => {
  assert.equal(/function doPost/.test(codeGs), true, 'нет doPost');
  assert.equal(codeGs.includes('JSON.parse'), true, 'нет JSON.parse');
  assert.equal(codeGs.includes('appendRow'), true, 'нет appendRow');
  assert.equal(codeGs.includes('ContentService'), true, 'нет ContentService');
});
