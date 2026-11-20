/**
 * Приёмник ответов опроса «Приглашение на одну встречу».
 *
 * ВАЖНО: SHEET_ID и SHEET_NAME лежат в Script Properties
 * (Настройки проекта → Свойства скрипта), а НЕ в этом файле.
 *
 * Как устроена таблица:
 *  - Три служебные колонки: «Когда пришло», «С кодировкой всё ок» (utf8 / preserved), «Клиент».
 *  - Дальше блоки по вопросам: «ДАТЫ», «КУХНЯ», «ФОРМАТ», «СВОИ ВАРИАНТЫ».
 *    У каждого блока своя шапка (строка 1) и подпись над каждой колонкой (строка 2),
 *    чтобы было видно, что где лежит, и можно было удобно фильтровать.
 *  - Ответы приходят из страницы уже по-русски («азия», «ресторан») — скрипт их пишет как есть.
 */

var BASIC_HEADER = ['Когда пришло', 'С кодировкой всё ок', 'Клиент'];

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
    ensureHeader(sheet);
    appendAnswers(sheet, payload, client);

    return jsonResponse({ ok: true, client: client, encoding: payload.__encoding || 'nfkc-safe' });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: String(error.message || error) });
  }
}

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

/** Две строки шапки: блоки над колонками + подписи самих колонок. */
function ensureHeader(sheet) {
  if (sheet.getLastRow() > 0) {
    return;
  }

  var header = BASIC_HEADER.slice();
  var subheader = ['Время (UTC)', 'utf8 / preserved', 'web / smoke'];

  header.push('ДАТЫ', 'ДАТЫ', '', '', 'КУХНЯ', 'ФОРМАТ', 'СВОИ ВАРИАНТЫ');
  subheader.push('Дата 1', 'Дата 2', 'Дата 3', 'Дата 4', 'Кухни', 'Формат', 'Комментарий');

  sheet.appendRow(header);
  sheet.appendRow(subheader);
  sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
  sheet.getRange(2, 1, 1, subheader.length).setFontStyle('italic');
  sheet.setFrozenRows(2);
}

function appendAnswers(sheet, payload, client) {
  var dates = [];
  var format = '';
  var cuisine = '';
  var comment = '';

  payload.answers.forEach(function (item) {
    if (item.id === 'dates') {
      item.answer.split(',').forEach(function (part) {
        var value = part.trim();
        if (value) {
          dates.push(value);
        }
      });
    } else if (item.id === 'cuisine') {
      cuisine = item.answer;
    } else if (item.id === 'format') {
      format = item.answer;
    } else if (item.id === 'custom') {
      comment = item.answer;
    }
  });

  var row = [
    payload.timestamp || new Date().toISOString(),
    payload.__encoding || 'nfkc-safe',
    client,
  ];

  for (var i = 0; i < 4; i += 1) {
    row.push(dates[i] || '');
  }

  row.push(cuisine);
  row.push(format);
  row.push(comment);

  sheet.appendRow(row);
}

function jsonResponse(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
