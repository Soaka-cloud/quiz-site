import { questions } from './questions.js';
import {
  applyButtonState,
  buildPayload,
  idleState,
  pendingState,
  postAnswers,
  renderQuestion,
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

function answeredCount() {
  return [...questionList.querySelectorAll('.survey-question')].filter(
    (node) => node.dataset.answered === 'true',
  ).length;
}

function paintProgress() {
  const total = questions.length;
  const answered = answeredCount();
  progressBar.setAttribute('aria-valuenow', String(answered));
  progressBar.setAttribute('aria-valuemax', String(total));
  progressValue.textContent = `${answered} из ${total}`;
  if (!state.submitting) {
    applyButtonState(submitButton, idleState(answered < total));
  }
}

function paintAnswer(node) {
  const questionId = node.dataset.questionId;
  const questionNode = questionList.querySelector(`.survey-question[data-question-id="${questionId}"]`);

  questionNode.querySelectorAll('.answer-option').forEach((option) => {
    option.dataset.selected = 'false';
    option.setAttribute('aria-pressed', 'false');
  });

  node.dataset.selected = 'true';
  node.setAttribute('aria-pressed', 'true');
  questionNode.dataset.answered = 'true';
}

function renderQuestions() {
  questionList.innerHTML = questions.map((question) => renderQuestion(question)).join('');
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
  answers[questionId] = Number(option.dataset.optionIndex);
  paintAnswer(option);
  paintProgress();
});

submitButton.addEventListener('click', () => {
  handleSubmit();
});

renderQuestions();
