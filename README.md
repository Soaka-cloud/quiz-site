# quiz-site

Опрос на статическом фронте: HTML + один CSS + ES-модули, без сборки и зависимостей. Ответы уходят JSON-ом в Google Apps Script Web App, который дописывает строку в Google-таблицу.

Логика отделена от визуала: `survey.js` — чистые функции, `app.js` — DOM-адаптер, `questions.js` — данные. Все стили только в `style.css`.

## Запуск локально

```
python -m http.server 8000
```

Открыть http://localhost:8000/. Просто открыть `index.html` двойным кликом нельзя: ES-модули не грузятся по `file://`.

## Тесты

```
npx playwright test     # E2E, Chromium; сервер поднимается автоматически
node --test             # юнит + стражи Code.gs
npx c8 node --test      # то же с покрытием
```

Перед первым E2E: `npm install && npx playwright install chromium`. Описание тестов — `e2e/README.md`.

## Конфиг

`config.js` с URL Web App **коммитится**: эндпоинт по дизайну открыт всем, его видно в network-панели любого посетителя. Sheet ID секретом остаётся и живёт в Script Properties в Apps Script, в репозиторий не попадает.

## Заменять при редизайне

- `style.css` — целиком;
- разметку внутри крючков в `index.html`: `survey-question`, `answer-option`, `submit-button`, `progress-bar`, `thank-you-screen`;
- тексты вопросов в `questions.js` (структура `{id, text, options[]}` — контракт).

Не трогать: `app.js`, `survey.js`, `apps-script/Code.gs`.

## Структура

```
index.html            разметка (крючки для редизайна)
style.css             все стили
questions.js          данные вопросов
survey.js             чистая логика: рендер, payload, отправка, состояния кнопки
app.js                DOM-адаптер
config.js             URL Web App (коммитится)
apps-script/          Code.gs (приёмник) + INSTRUCTIONS.md (деплой)
e2e/                  Playwright-спеки
test/                 node --test: юнит + стражи
.hermes/plans/        план проекта и дополнения
```
