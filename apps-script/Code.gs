/**
 * Приёмник ответов опроса.
 *
 * ВАЖНО: SHEET_ID и SHEET_NAME лежат в Script Properties
 * (Настройки проекта → Свойства скрипта), а НЕ в этом файле.
 *
 * Диагностика кодировки: клиент, который не отдаёт charset, отправляет тело
 * в кодировке своего процесса (на Windows это может быть cp1251). Если тело
 * пришло в UTF-8 — ставим маркер 'utf8', иначе 'preserved'. Маркер пишется
 * в колонку «Кодировка», чтобы расхождение было видно сразу, а не искали
 * глазами по мохибэйку.
 */

function doPost(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty('SHEET_ID');
    var sheetName = props.getProperty('SHEET_NAME') || 'Ответы';

    if (!sheetId) {
      throw new Error('SHEET_ID не задан в Script Properties');
    }
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Пустое тело запроса');
    }

    var client = (e.parameter && e.parameter.client) || 'unknown';
    var payload = parseBody(e.postData.contents, client);
    if (!payload.answers || !payload.answers.length) {
      throw new Error('В payload нет answers');
    }

    var sheet = getOrCreateSheet(sheetId, sheetName);
    ensureHeader(sheet, payload.answers);
    appendAnswers(sheet, payload, client);

    return jsonResponse({ ok: true, client: client, encoding: payload.__encoding || 'nfkc-safe' });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: String(error.message || error) });
  }
}

/** ASCII-only маркер клиента приходит параметром в query string. */
function parseBody(contents, client) {
  if (client === 'unknown') {
    return JSON.parse(contents);
  }

  var payload = JSON.parse(contents);
  var encoding = utf8IsClean(contents) ? 'utf8' : 'preserved';
  payload.__encoding = encoding;

  if (encoding === 'utf8') {
    var text = Utilities.newBlob(contents, 'application/json', 'body.json').getDataAsString('UTF-8');
    var reparsed = JSON.parse(text);
    reparsed.__encoding = 'utf8';
    return reparsed;
  }
  return payload;
}

function utf8IsClean(contents) {
  try {
    return Utilities.newBlob(contents, 'application/json', 't.json').getDataAsString('UTF-8') === contents;
  } catch (error) {
    return false;
  }
}

function getOrCreateSheet(sheetId, sheetName) {
  var spreadsheet = SpreadsheetApp.openById(sheetId);
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

function ensureHeader(sheet, answers) {
  if (sheet.getLastRow() > 0) {
    return;
  }
  var header = ['Timestamp', 'Survey', 'encoding', 'client'].concat(answers.map(function (item) {
    return item.question;
  }));
  sheet.appendRow(header);
  sheet.setFrozenRows(1);
}

function appendAnswers(sheet, payload, client) {
  var row = [payload.timestamp || new Date().toISOString(), payload.survey || 'default'];
  row.push(payload.__encoding || 'nfkc-safe');
  row.push(client);
  payload.answers.forEach(function (item) {
    row.push(item.answer);
  });
  sheet.appendRow(row);
}

function jsonResponse(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
