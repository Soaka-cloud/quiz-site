export const questions = [
  {
    id: 'dates',
    type: 'dates',
    text: 'Даты',
    hint: 'можно несколько, свои тоже',
    presets: ['Ближайшая пятница', 'Суббота', 'Воскресенье', 'На следующей неделе'],
    placeholder: 'Своя дата — например, «7 декабря»',
  },
  {
    id: 'cuisine',
    type: 'checkbox',
    text: 'Кухня',
    hint: 'можно несколько',
    groups: [
      {
        name: 'Кухни',
        options: [
          { label: 'Азия', value: 'азия' },
          { label: 'Паназия', value: 'паназия' },
          { label: 'Европа', value: 'европа' },
          { label: 'Италия', value: 'италия' },
          { label: 'Кавказ', value: 'кавказ' },
        ],
      },
      {
        name: 'Конкретнее',
        options: [
          { label: 'Пицца', value: 'пицца' },
          { label: 'Роллы', value: 'роллы' },
          { label: 'Кофе и десерт', value: 'кофе и десерт' },
          { label: 'Стейк', value: 'стейк' },
          { label: 'Паста', value: 'паста' },
        ],
      },
    ],
  },
  {
    id: 'format',
    type: 'radio',
    text: 'Формат',
    hint: 'выбери один',
    options: [
      { label: 'Кафе', value: 'кафе', note: 'уютно и без долгих сборов' },
      { label: 'Ресторан', value: 'ресторан', note: 'повод одеться' },
      { label: 'Кофейня', value: 'кофейня', note: 'днём, с кофе и разговорами' },
      { label: 'Приготовить дома вдвоём', value: 'дома вдвоём', note: 'свой рецепт, своя атмосфера' },
    ],
  },
  {
    id: 'custom',
    type: 'text',
    text: 'Свои варианты',
    hint: 'необязательно',
    options: [],
    required: false,
    placeholder: 'Есть своя идея — впиши её здесь. Например: «суши-бар у дома» или «пятница, 19:00, Гринвич».',
  },
];
