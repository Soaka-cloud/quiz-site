import { questions } from './questions.js';
import {
  applyButtonState,
  buildPayload,
  idleState,
  pendingState,
  postAnswers,
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

function isAnswered(question) {
  const value = answers[question.id];
  if (question.type === 'text') {
    return typeof value === 'string' && value.trim() !== '';
  }
  if (question.type === 'checkbox') {
    return Array.isArray(value) && value.length > 0;
  }
  return typeof value === 'number';
}

function isRequired(question) {
  return question.required !== false;
}

function answeredCount() {
  return questions.filter(isAnswered).length;
}

function requiredLeft() {
  return questions.filter((question) => isRequired(question) && !isAnswered(question)).length;
}

function paintQuestionState(questionId) {
  const question = questions.find((item) => item.id === questionId);
  const questionNode = questionList.querySelector(`.survey-question[data-question-id="${questionId}"]`);
  if (!question || !questionNode) {
    return;
  }
  questionNode.dataset.answered = String(isAnswered(question));
}

function paintProgress() {
  const total = questions.length;
  const answered = answeredCount();
  progressBar.setAttribute('aria-valuenow', String(answered));
  progressBar.setAttribute('aria-valuemax', String(total));
  progressValue.textContent = `${answered} из ${total}`;
  if (!state.submitting) {
    applyButtonState(submitButton, idleState(requiredLeft() > 0));
  }
}

function paintChoice(node) {
  const questionId = node.dataset.questionId;
  const question = questions.find((item) => item.id === questionId);
  const questionNode = questionList.querySelector(`.survey-question[data-question-id="${questionId}"]`);

  if (question.type !== 'checkbox') {
    questionNode.querySelectorAll('.answer-option').forEach((option) => {
      option.dataset.selected = 'false';
      option.setAttribute('aria-pressed', 'false');
    });
  }

  const checked = node.dataset.selected !== 'true';
  node.dataset.selected = String(checked);
  node.setAttribute('aria-pressed', String(checked));
}

function commitChoice(questionId, optionIndex, checked) {
  const question = questions.find((item) => item.id === questionId);
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

function renderQuestions() {
  questionList.innerHTML = questions
    .map((question) => (question.type === 'text' ? renderTextQuestion(question) : renderQuestion(question)))
    .join('');
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
  const option = event.target.closest('.answer-option');
  if (!option || state.submitted) {
    return;
  }
  const questionId = option.dataset.questionId;
  paintChoice(option);
  commitChoice(questionId, Number(option.dataset.optionIndex), option.dataset.selected === 'true');
  paintQuestionState(questionId);
  paintProgress();
});

questionList.addEventListener('input', (event) => {
  const input = event.target.closest('.answer-input');
  if (!input || state.submitted) {
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
