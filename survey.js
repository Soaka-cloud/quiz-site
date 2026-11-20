export function renderQuestion(question) {
  const options = question.options
    .map(
      (option, index) =>
        `<button type="button" class="answer-option" data-question-id="${question.id}" data-option-index="${index}" data-selected="false">${option}</button>`,
    )
    .join('');

  return `<fieldset class="survey-question" data-question-id="${question.id}" data-answered="false">
  <legend class="question-text">${question.text}</legend>
  <div class="answer-list">${options}</div>
</fieldset>`;
}

export function selectAnswer(answers, questionId, optionIndex) {
  return { ...answers, [questionId]: optionIndex };
}

export function buildPayload(answers, questions, now = new Date()) {
  return {
    timestamp: now.toISOString(),
    survey: 'default',
    answers: questions
      .filter((question) => answers[question.id] !== undefined)
      .map((question) => ({
        id: question.id,
        question: question.text,
        answer: question.options[answers[question.id]],
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

export async function postAnswers(endpoint, payload, client = 'web') {
  const response = await fetch(requestUrl(endpoint, client), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Сервер ответил ${response.status}`);
  }

  const text = await response.text();
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
