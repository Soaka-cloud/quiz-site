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
          { label: 'Азия', value: 'asia' },
          { label: 'Паназия', value: 'pan_asia' },
          { label: 'Европа', value: 'europe' },
          { label: 'Италия', value: 'italy' },
          { label: 'Кавказ', value: 'caucasus' },
        ],
      },
      {
        name: 'Конкретнее',
        options: [
          { label: 'Пицца', value: 'pizza' },
          { label: 'Роллы', value: 'rolls' },
          { label: 'Кофе и десерт', value: 'coffee_dessert' },
          { label: 'Стейк', value: 'steak' },
          { label: 'Паста', value: 'pasta' },
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
      { label: 'Кафе', value: 'cafe', note: 'уютно и без долгих сборов' },
      { label: 'Ресторан', value: 'restaurant', note: 'повод одеться' },
      { label: 'Кофейня', value: 'coffee_shop', note: 'днём, с кофе и разговорами' },
      { label: 'Приготовить дома вдвоём', value: 'cook_together', note: 'свой рецепт, своя атмосфера' },
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
