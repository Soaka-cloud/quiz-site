// URL Web App из Apps Script — коммитится в репозиторий.
// Это НЕ секрет: эндпоинт открыт на чтение всем (Who has access: Anyone),
// его видно в network-панели любого посетителя.
// Sheet ID секретом остаётся и живёт в Script Properties, не здесь.
window.SURVEY_CONFIG = {
  endpoint: 'https://script.google.com/macros/s/ВСТАВЬТЕ_ID_РАЗВЁРТЫВАНИЯ/exec',
};
