/**
 * Приёмник ответов опроса.
 *
 * ВАЖНО: SHEET_ID и SHEET_NAME лежат в Script Properties
 * (Настройки проекта → Свойства скрипта), а НЕ в этом файле.
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

    var payload = JSON.parse(e.postData.contents);
    if (!payload.answers || !payload.answers.length) {
      throw new Error('В payload нет answers');
    }

    var sheet = getOrCreateSheet(sheetId, sheetName);
    ensureHeader(sheet, payload.answers);
    appendAnswers(sheet, payload);

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: String(error.message || error) });
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
  var header = ['Timestamp', 'Survey'].concat(answers.map(function (item) {
    return item.question;
  }));
  sheet.appendRow(header);
  sheet.setFrozenRows(1);
}

function appendAnswers(sheet, payload) {
  var row = [payload.timestamp || new Date().toISOString(), payload.survey || 'default'];
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
