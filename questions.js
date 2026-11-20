export const questions = [
  {
    id: 'place',
    type: 'radio',
    text: 'Место',
    hint: 'одно из трёх',
    options: [
      {
        label: 'Винный бар',
        value: 'wine_bar',
        note: 'свечи, тихий зал, разговоры без спешки',
        price: '18:00—23:00',
      },
      {
        label: 'Кофейня у парка',
        value: 'coffee',
        note: 'светло, можно задержаться хоть на три часа',
        price: '10:00—21:00',
      },
      {
        label: 'Набережная',
        value: 'embankment',
        note: 'без брони, шаг в шаг, ветер в лицо',
        price: 'закат',
      },
    ],
  },
  {
    id: 'time',
    type: 'radio',
    text: 'Время',
    hint: 'выбери одно',
    options: [
      { label: 'Будний вечер', value: 'weekday_evening' },
      { label: 'Выходные днём', value: 'weekend_day' },
      { label: 'Выходные вечером', value: 'weekend_evening' },
    ],
  },
  {
    id: 'mood',
    type: 'checkbox',
    text: 'Настроение',
    hint: 'можно несколько',
    options: [
      { label: 'Тихо', value: 'quiet' },
      { label: 'Живо', value: 'live' },
      { label: 'Поесть хорошо', value: 'food' },
      { label: 'Погулять', value: 'walk' },
    ],
  },
];
