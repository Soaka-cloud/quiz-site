export const questions = [
  {
    id: 'q1',
    type: 'radio',
    text: 'В каком формате ты ищешь стажировку?',
    options: [
      { label: 'Удалённо', value: 'remote' },
      { label: 'В офисе', value: 'office' },
      { label: 'Гибрид', value: 'hybrid' },
      { label: 'Пока не решил(а)', value: 'undecided' },
    ],
  },
  {
    id: 'q2',
    type: 'checkbox',
    text: 'Что тебе важно в стажировке? Можно выбрать несколько вариантов.',
    options: [
      { label: 'Реальные задачи в проекте', value: 'real_tasks' },
      { label: 'Наставник рядом', value: 'mentor' },
      { label: 'Обратная связь по работе', value: 'feedback' },
      { label: 'Возможность остаться в команде', value: 'offer' },
    ],
  },
  {
    id: 'q3',
    type: 'radio',
    text: 'Сколько времени ты готов(а) уделять стажировке в неделю?',
    options: [
      { label: 'До 10 часов', value: 'lt10' },
      { label: '10–20 часов', value: '10-20' },
      { label: '20–40 часов', value: '20-40' },
    ],
  },
  {
    id: 'q4',
    type: 'text',
    text: 'Что из своего опыта ты считаешь самым полезным для стажировки?',
    options: [],
    required: false,
    placeholder: 'Например: разбирал(а) чужие ошибки, помогал(а) тестировать чужой проект.',
  },
  {
    id: 'q5',
    type: 'text',
    text: 'Откуда ты узнал(а) про этот опрос?',
    options: [],
    required: true,
    placeholder: 'Хватит одного слова: группа, знакомый, лента, рассылка.',
  },
];

