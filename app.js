import { questions } from './questions.js';
import {
  applyButtonState,
  buildPayload,
  idleState,
  pendingState,
  postAnswers,
  renderDatesQuestion,
  renderGroupedQuestion,
  renderQuestion,
  renderTextQuestion,
  submitUrl,
} from './survey.js';

const answers = {};
const state = { submitted: false, submitting: false };

const root = document.querySelector('.survey');
const questionList = document.querySelector('.question-list');
const progressBar = document.querySelector('.progress-bar');
const progressValue = document.querySelector('.progress-bar__value');
const submitButton = document.querySelector('.submit-button');
const submitError = document.querySelector('.submit-error');
const thankYouScreen = document.querySelector('.thank-you-screen');

function questionById(id) {
  return questions.find((item) => item.id === id);
}

function isAnswered(question) {
  const value = answers[question.id];
  if (question.type === 'text') {
    return typeof value === 'string' && value.trim() !== '';
  }
  if (question.type === 'checkbox' || question.type === 'dates') {
    return Array.isArray(value) && value.length > 0;
  }
  return typeof value === 'number';
}

function isRequired(question) {
  return question.required !== false;
}

function requiredLeft() {
  return questions.filter((question) => isRequired(question) && !isAnswered(question)).length;
}

function paintQuestionState(questionId) {
  const question = questionById(questionId);
  const node = questionList.querySelector(`.survey-question[data-question-id="${questionId}"]`);
  if (question && node) {
    node.dataset.answered = String(isAnswered(question));
  }
}

function paintProgress() {
  const answered = questions.filter(isAnswered).length;
  progressBar.setAttribute('aria-valuenow', String(answered));
  progressBar.setAttribute('aria-valuemax', String(questions.length));
  progressValue.textContent = `${answered} из ${questions.length}`;
  if (!state.submitting) {
    applyButtonState(submitButton, idleState(requiredLeft() > 0));
  }
}

function paintChoice(node) {
  const question = questionById(node.dataset.questionId);
  const scope = node.closest('.survey-question');
  if (question.type !== 'checkbox') {
    scope.querySelectorAll('.answer-option').forEach((option) => {
      option.dataset.selected = 'false';
      option.setAttribute('aria-pressed', 'false');
    });
  }
  const checked = node.dataset.selected !== 'true';
  node.dataset.selected = String(checked);
  node.setAttribute('aria-pressed', String(checked));
}

function commitChoice(questionId, optionIndex, checked) {
  const question = questionById(questionId);
  if (question.type === 'checkbox') {
    const current = Array.isArray(answers[questionId]) ? [...answers[questionId]] : [];
    const next = checked
      ? [...new Set([...current, optionIndex])].sort((a, b) => a - b)
      : current.filter((index) => index !== optionIndex);
    if (next.length) {
      answers[questionId] = next;
    } else {
      delete answers[questionId];
    }
    return;
  }
  if (checked) {
    answers[questionId] = optionIndex;
  } else {
    delete answers[questionId];
  }
}

function paintDates(scope) {
  const chosen = scope.querySelector('.date-chosen');
  const list = Array.isArray(answers.dates) ? answers.dates : [];
  scope.querySelectorAll('.date-chip').forEach((chip) => {
    const preset = chip.textContent.trim();
    const on = list.includes(preset);
    chip.dataset.selected = String(on);
    chip.setAttribute('aria-pressed', String(on));
  });
  chosen.innerHTML = list
    .map(
      (item) =>
        `<span class="date-token" data-value="${item}">${item}<button type="button" class="date-remove" aria-label="Убрать ${item}">×</button></span>`,
    )
    .join('');
  if (list.length) {
    answers.dates = list;
  } else {
    delete answers.dates;
  }
}

function addDate(value) {
  const text = value.trim();
  if (!text) {
    return;
  }
  const question = questionById('dates');
  const presets = question.presets || [];
  const current = Array.isArray(answers.dates) ? [...answers.dates] : [];
  if (!current.some((item) => item.toLowerCase() === text.toLowerCase())) {
    current.push(presets.includes(text) ? text : text);
    answers.dates = current;
  }
  paintQuestionState('dates');
  paintProgress();
}

function renderQuestions() {
  questionList.innerHTML = questions
    .map((question) => {
      if (question.type === 'dates') return renderDatesQuestion(question);
      if (question.groups) return renderGroupedQuestion(question);
      if (question.type === 'text') return renderTextQuestion(question);
      return renderQuestion(question);
    })
    .join('');
  const datesScope = questionList.querySelector('[data-question-id="dates"]');
  if (datesScope) {
    paintDates(datesScope);
  }
  paintProgress();
}

function showThankYou() {
  state.submitted = true;
  root.dataset.state = 'done';
  thankYouScreen.hidden = false;
  questionList.querySelectorAll('.survey-question').forEach((node) => node.remove());
  submitButton.hidden = true;
}

function showSubmitError(error) {
  submitError.textContent = error.message;
  submitError.hidden = false;
}

async function handleSubmit() {
  submitError.hidden = true;
  state.submitting = true;
  applyButtonState(submitButton, pendingState());

  let endpoint;
  try {
    endpoint = submitUrl(window.SURVEY_CONFIG);
  } catch (error) {
    state.submitting = false;
    applyButtonState(submitButton, idleState(false));
    showSubmitError(error);
    return;
  }

  try {
    await postAnswers(endpoint, buildPayload(answers, questions));
  } catch (error) {
    state.submitting = false;
    applyButtonState(submitButton, idleState(false));
    showSubmitError(error);
    return;
  }

  state.submitting = false;
  showThankYou();
}

questionList.addEventListener('click', (event) => {
  if (state.submitted) {
    return;
  }

  const addButton = event.target.closest('.date-add');
  if (addButton) {
    const scope = addButton.closest('.survey-question');
    const input = scope.querySelector('.date-input');
    addDate(input.value);
    paintDates(scope);
    input.value = '';
    return;
  }

  const removeButton = event.target.closest('.date-remove');
  if (removeButton) {
    const value = removeButton.closest('.date-token').dataset.value;
    answers.dates = (answers.dates || []).filter((item) => item !== value);
    const scope = removeButton.closest('.survey-question');
    paintDates(scope);
    paintQuestionState('dates');
    paintProgress();
    return;
  }

  const chip = event.target.closest('.date-chip');
  if (chip) {
    const preset = chip.textContent.trim();
    const current = Array.isArray(answers.dates) ? [...answers.dates] : [];
    const next = current.includes(preset)
      ? current.filter((item) => item !== preset)
      : [...current, preset];
    if (next.length) {
      answers.dates = next;
    } else {
      delete answers.dates;
    }
    paintDates(chip.closest('.survey-question'));
    paintQuestionState('dates');
    paintProgress();
    return;
  }

  const option = event.target.closest('.answer-option');
  if (!option) {
    return;
  }
  const questionId = option.dataset.questionId;
  paintChoice(option);
  commitChoice(questionId, Number(option.dataset.optionIndex), option.dataset.selected === 'true');
  paintQuestionState(questionId);
  paintProgress();
});

questionList.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.matches('.date-input')) {
    event.preventDefault();
    const scope = event.target.closest('.survey-question');
    addDate(event.target.value);
    paintDates(scope);
    event.target.value = '';
  }
});

questionList.addEventListener('input', (event) => {
  const input = event.target.closest('.answer-input');
  if (!input || state.submitted || input.classList.contains('date-input')) {
    return;
  }
  const questionId = input.closest('.survey-question').dataset.questionId;
  const value = input.value.trim();
  if (value) {
    answers[questionId] = value;
  } else {
    delete answers[questionId];
  }
  paintQuestionState(questionId);
  paintProgress();
});

submitButton.addEventListener('click', () => {
  handleSubmit();
});

renderQuestions();
