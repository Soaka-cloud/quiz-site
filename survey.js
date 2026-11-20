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
