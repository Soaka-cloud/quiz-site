export function renderQuestion(question) {
  const options = (question.options || [])
    .map((option, index) => {
      const label = option.note
        ? `<span class="answer-label"><b>${option.label}</b><span>${option.note}</span></span>`
        : `<span class="answer-label"><b>${option.label}</b></span>`;
      const price = option.price ? `<span class="answer-price">${option.price}</span>` : '';
      return `<button type="button" class="answer-option" data-question-id="${question.id}" data-option-index="${index}" data-kind="${question.type}" data-selected="false">${label}${price}</button>`;
    })
    .join('');

  const hint = question.hint ? `<p class="question-hint">${question.hint}</p>` : '';

  return `<fieldset class="survey-question" data-question-id="${question.id}" data-answered="false">
  <legend class="question-text">${question.text}</legend>
  ${hint}
  <div class="answer-list">${options}</div>
</fieldset>`;
}

export function renderGroupedQuestion(question) {
  const groups = question.groups
    .map((group, groupIndex) => {
      const chips = group.options
        .map((option) => {
          const index = findOptionIndex(question, option.value);
          return `<button type="button" class="answer-option answer-chip" data-question-id="${question.id}" data-option-index="${index}" data-kind="${question.type}" data-selected="false">${option.label}</button>`;
        })
        .join('');
      return `<p class="answer-group-name">${group.name}</p>
  <div class="answer-chips" data-group-index="${groupIndex}">${chips}</div>`;
    })
    .join('');

  const hint = question.hint ? `<p class="question-hint">${question.hint}</p>` : '';

  return `<fieldset class="survey-question" data-question-id="${question.id}" data-answered="false">
  <legend class="question-text">${question.text}</legend>
  ${hint}
  ${groups}
</fieldset>`;
}

export function renderDatesQuestion(question) {
  const presets = (question.presets || [])
    .map(
      (preset, index) =>
        `<button type="button" class="answer-option answer-chip date-chip" data-question-id="${question.id}" data-preset-index="${index}" data-kind="dates" data-selected="false">${preset}</button>`,
    )
    .join('');

  const hint = question.hint ? `<p class="question-hint">${question.hint}</p>` : '';

  return `<fieldset class="survey-question" data-question-id="${question.id}" data-answered="false">
  <legend class="question-text">${question.text}</legend>
  ${hint}
  <div class="answer-chips date-presets">${presets}</div>
  <div class="date-custom">
    <input type="text" class="answer-input date-input" placeholder="${question.placeholder || ''}" aria-label="Своя дата">
    <button type="button" class="date-add">Добавить</button>
  </div>
  <div class="date-chosen" aria-live="polite"></div>
</fieldset>`;
}

export function renderTextQuestion(question) {
  const required = question.required !== false;

  return `<fieldset class="survey-question" data-question-id="${question.id}" data-answered="false">
  <legend class="question-text">${question.text}</legend>
  <textarea class="answer-input" rows="3" aria-label="${question.text}" placeholder="${question.placeholder || ''}" data-required="${required}"></textarea>
</fieldset>`;
}

export function allOptions(question) {
  if (question.groups) {
    return question.groups.flatMap((group) => group.options);
  }
  return question.options || [];
}

function findOptionIndex(question, value) {
  return allOptions(question).findIndex((option) => option.value === value);
}

export function selectAnswer(answers, questionId, optionIndex) {
  return { ...answers, [questionId]: optionIndex };
}

function isEmptyValue(value) {
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  return value === undefined || value === null;
}

function answerText(question, value) {
  const options = allOptions(question);
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'number' ? options[item].value : String(item)))
      .join(', ');
  }
  if (typeof value === 'number') {
    return options[value].value;
  }
  return value;
}

export function buildPayload(answers, questions, now = new Date()) {
  return {
    timestamp: now.toISOString(),
    survey: 'invitation',
    answers: questions
      .map((question) => ({ question, value: answers[question.id] }))
      .filter(({ value }) => !isEmptyValue(value))
      .map(({ question, value }) => ({
        id: question.id,
        question: question.text,
        answer: answerText(question, value),
      })),
  };
}

export function submitUrl(config) {
  const endpoint = config && config.endpoint;
  if (!endpoint) {
    throw new Error('endpoint не задан в конфиге (config.js → SURVEY_ENDPOINT)');
  }
  return endpoint;
}

export function requestUrl(endpoint, client) {
  const url = new URL(endpoint);
  url.searchParams.set('client', client);
  return url.toString();
}

export async function postAnswers(endpoint, payload, client = 'web', timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(requestUrl(endpoint, client), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Приёмник не ответил за ${Math.round(timeoutMs / 1000)} с. Проверьте соединение и отправьте ещё раз.`);
    }
    throw new Error(`Не удалось отправить ответы: ${error.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Сервер ответил ${response.status}`);
  }

  let text;
  try {
    text = await response.text();
  } catch {
    throw new Error('Сервер принял запрос, но ответ не читается (редирект без тела). Проверьте таблицу.');
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { ok: false, error: 'ответ сервера не JSON' };
  }
  if (data.ok === false) {
    throw new Error(data.error || 'сервер сообщил об ошибке');
  }
  return data;
}

export function pendingState() {
  return { disabled: true, busy: 'true' };
}

export function idleState(disabled) {
  return { disabled: Boolean(disabled), busy: 'false' };
}

export function applyButtonState(button, state) {
  button.disabled = state.disabled;
  button.setAttribute('aria-busy', state.busy);
}
