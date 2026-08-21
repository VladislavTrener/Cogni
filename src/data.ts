/**
 * Домен платформы Когнитив.Про: типы, демо-данные и хелперы доступа.
 */

/** Видна в подвале сайта — помогает понять, свежая ли сборка установлена */
export const APP_VERSION = 'v1.12 · курс «Логика: 2–4 класс» (235 задач)';

export type DirectionId = 'count' | 'memory' | 'logic' | 'general';
export type Role = 'student' | 'teacher' | 'admin';
export type LessonKind = 'trainer' | 'video' | 'test';
export type TrainerId =
  | 'multLeitner'
  | 'multNotebook'
  | 'multCosmos'
  | 'quest'
  | 'nback'
  | 'sequence'
  | 'addCount'
  | 'addSmart'
  | 'addCosmos'
  | 'sub10'
  | 'sub20'
  | 'mix20'
  | 'stroop'
  | 'logic0'
  | 'logic1'
  | 'logic2'
  | 'logic3'
  | 'logic4'
  | 'logic5'
  | 'logicMix'
  | 'slogic0'
  | 'slogic1'
  | 'slogic2'
  | 'slogic3'
  | 'slogic4'
  | 'slogic5'
  | 'slogic6'
  | 'slogic7'
  | 'slogic8'
  | 'slogic9'
  | 'slogicMix';

export interface Direction {
  id: DirectionId;
  label: string;
  color: string;
  soft: string;
  tagline: string;
}

export interface Lesson {
  id: string;
  title: string;
  kind: LessonKind;
  minutes: number;
  trainer?: TrainerId;
  note?: string;
}

export interface Course {
  id: string;
  directionId: DirectionId;
  title: string;
  subtitle: string;
  level: 1 | 2 | 3;
  age: string;
  price: number; // 0 = бесплатно
  validityMonths: number; // срок действия доступа после оплаты
  published: boolean;
  lessons: Lesson[];
}

export interface Student {
  id: string;
  name: string;
  age: number;
  group: string;
  color: string;
  purchased: string[];
  done: string[];
  points: number;
  streak: number;
  registeredAt: number;
  /** courseId → timestamp окончания доступа */
  accessUntil: Record<string, number>;
  phone: string;
  email: string;
}

export interface Payment {
  id: string;
  date: string;
  studentId: string;
  studentName?: string;
  item: string;
  purpose: string;
  amount: number;
  method: string;
  status: 'оплачен';
  fresh?: boolean;
}

export interface Settings {
  trialDays: number;
  /** QR-код для оплаты (dataURL изображения), загружается администратором; null — встроенная заглушка */
  qr: string | null;
}

export interface UserAccount {
  id: string;
  role: Role;
  name: string;
  title: string;
}

/* ================= направления ================= */

export const DIRECTIONS: Direction[] = [
  { id: 'count', label: 'СЧЁТ', color: '#ff8a3d', soft: 'rgba(255,138,61,0.14)', tagline: 'ментальная арифметика, таблицы и числовые ряды' },
  { id: 'memory', label: 'ПАМЯТЬ', color: '#2fa8dc', soft: 'rgba(47,168,220,0.14)', tagline: 'рабочая память, объём и точность воспроизведения' },
  { id: 'logic', label: 'ЛОГИКА', color: '#1fa97a', soft: 'rgba(31,169,122,0.14)', tagline: 'закономерности, алгоритмы и нестандартные задачи' },
  { id: 'general', label: 'ОБЩИЕ', color: '#e8a912', soft: 'rgba(232,169,18,0.16)', tagline: 'внимание, скорость реакции и учебные навыки' },
];

export const dirById = (id: DirectionId): Direction => DIRECTIONS.find((d) => d.id === id) ?? DIRECTIONS[0];

/* ================= курсы ================= */

export const SEED_COURSES: Course[] = [
  {
    id: 'c-count-mult',
    directionId: 'count',
    title: 'Тренировка умножения',
    subtitle: 'Три тренажёра на одном движке: интервальные коробки Лейтнера, «Тетрадь в клетку» и «Космополёт» — таблица умножения доводится до автоматизма',
    level: 1,
    age: '8–11 лет',
    price: 1500,
    validityMonths: 3,
    published: true,
    lessons: [
      { id: 'ls-mult-1', title: 'Умный тренажёр: интервалы', kind: 'trainer', minutes: 15, trainer: 'multLeitner' },
      { id: 'ls-mult-2', title: 'Тетрадь в клетку: верно / неверно', kind: 'trainer', minutes: 12, trainer: 'multNotebook' },
      { id: 'ls-mult-3', title: 'Космополёт: столбики ×2–×11', kind: 'trainer', minutes: 12, trainer: 'multCosmos' },
    ],
  },
  {
    id: 'c-count-quest',
    directionId: 'count',
    title: 'Космическая тетрадь: умножение в задачах',
    subtitle: 'Квест на 100 текстовых задач по 4 планетам — кулинария, игры, путешествия и магазин со сдачей. Ошибки повторяются, полёт сохраняется',
    level: 2,
    age: '8–11 лет',
    price: 2200,
    validityMonths: 3,
    published: true,
    lessons: [{ id: 'ls-quest-1', title: 'Космический квест: 100 задач', kind: 'trainer', minutes: 45, trainer: 'quest' }],
  },
  {
    id: 'c-count-add',
    directionId: 'count',
    title: 'Тренировка сложения',
    subtitle: 'Счёт до 20 с ростом сложности, умные интервальные повторы и космолёт на двузначных числах — всё на коробках Лейтнера',
    level: 1,
    age: '6–9 лет',
    price: 1900,
    validityMonths: 3,
    published: true,
    lessons: [
      { id: 'ls-add-1', title: 'Счёт до 20: разгон', kind: 'trainer', minutes: 12, trainer: 'addCount' },
      { id: 'ls-add-2', title: 'Умные интервалы', kind: 'trainer', minutes: 12, trainer: 'addSmart' },
      { id: 'ls-add-3', title: 'Космолёт: двузначные', kind: 'trainer', minutes: 12, trainer: 'addCosmos' },
    ],
  },
  {
    id: 'c-count-sub10',
    directionId: 'count',
    title: 'Вычитание от 10',
    subtitle: 'Все случаи вычитания из 10 — с цифрами от 0 до 9. Ошибка сразу показывает верный ответ, в конце блока — кнопка «Повторить»',
    level: 1,
    age: '6–8 лет',
    price: 1500,
    validityMonths: 3,
    published: true,
    lessons: [{ id: 'ls-sub10-1', title: 'Вычитание от 10: все цифры', kind: 'trainer', minutes: 10, trainer: 'sub10' }],
  },
  {
    id: 'c-count-sub20',
    directionId: 'count',
    title: 'Вычитание от 20',
    subtitle: 'Все случаи вычитания из 20 — с цифрами от 0 до 20. Ошибка показывает ответ, блок повторяется до уверенности',
    level: 1,
    age: '7–9 лет',
    price: 1500,
    validityMonths: 3,
    published: true,
    lessons: [{ id: 'ls-sub20-1', title: 'Вычитание от 20: все цифры', kind: 'trainer', minutes: 10, trainer: 'sub20' }],
  },
  {
    id: 'c-count-mix20',
    directionId: 'count',
    title: 'Сложение и вычитание до 20',
    subtitle: 'Смешанные примеры: сложение и вычитание с числами до 20 вперемешку. Тренирует переключение между операциями',
    level: 2,
    age: '7–10 лет',
    price: 1700,
    validityMonths: 3,
    published: true,
    lessons: [{ id: 'ls-mix20-1', title: 'Микс: сложение и вычитание до 20', kind: 'trainer', minutes: 12, trainer: 'mix20' }],
  },
  {
    id: 'c-mem-nback',
    directionId: 'memory',
    title: 'N-back: тренажёр рабочей памяти',
    subtitle: 'Классическая N-back методика: сравнивай клетку с показом N шагов назад. Сложность растёт от N-1 до N-2',
    level: 2,
    age: '9–13 лет',
    price: 2100,
    validityMonths: 3,
    published: true,
    lessons: [{ id: 'ls-nback-1', title: 'Тренировка N-1 и N-2', kind: 'trainer', minutes: 15, trainer: 'nback' }],
  },
  {
    id: 'c-mem-seq',
    directionId: 'memory',
    title: 'Запомни последовательность',
    subtitle: 'Повтори порядок мигающих квадратов: поле 4×4 (до 5), затем 5×5 (до 7) и 6×6 (до 10)',
    level: 2,
    age: '7–12 лет',
    price: 1900,
    validityMonths: 3,
    published: true,
    lessons: [{ id: 'ls-seq-1', title: 'Мигающие квадраты: 4×4 → 6×6', kind: 'trainer', minutes: 12, trainer: 'sequence' }],
  },
  {
    id: 'c-mem-stroop',
    directionId: 'memory',
    title: 'Тест Струпа: таблицы внимания',
    subtitle: 'Семь блоков от 4×4 до 10×10. В каждом — три таблицы: чёрная, разноцветная и красно-чёрная Горбова. Цифры перемешиваются при каждой попытке',
    level: 2,
    age: '9–13 лет',
    price: 1900,
    validityMonths: 3,
    published: true,
    lessons: [{ id: 'ls-stroop-1', title: 'Блоки 4×4 → 10×10: три таблицы', kind: 'trainer', minutes: 15, trainer: 'stroop' }],
  },
  {
    id: 'c-logic-kids',
    directionId: 'logic',
    title: 'Логика малышам: 150 задач',
    subtitle: 'Для дошкольников и 1 класса. Шесть типов задач — рассуждения, анаграммы, сравнения, классификация, отношения и антонимы — плюс большой тест. Задачи озвучиваются голосом',
    level: 1,
    age: '5–7 лет',
    price: 1900,
    validityMonths: 3,
    published: true,
    lessons: [
      { id: 'ls-logic-0', title: 'У кого что? (рассуждения)', kind: 'trainer', minutes: 10, trainer: 'logic0' },
      { id: 'ls-logic-1', title: 'Переставь буквы (анаграммы)', kind: 'trainer', minutes: 10, trainer: 'logic1' },
      { id: 'ls-logic-2', title: 'Кто больше? (сравнения)', kind: 'trainer', minutes: 10, trainer: 'logic2' },
      { id: 'ls-logic-3', title: 'Что подходит? (классификация)', kind: 'trainer', minutes: 10, trainer: 'logic3' },
      { id: 'ls-logic-4', title: 'Семья и отношения', kind: 'trainer', minutes: 10, trainer: 'logic4' },
      { id: 'ls-logic-5', title: 'Слова-наоборот (антонимы)', kind: 'trainer', minutes: 10, trainer: 'logic5' },
      { id: 'ls-logic-mix', title: 'Большой тест: 20 задач вперемешку', kind: 'test', minutes: 12, trainer: 'logicMix' },
    ],
  },
  {
    id: 'c-logic-school',
    directionId: 'logic',
    title: 'Логика: 2–4 класс: 235 задач',
    subtitle: 'Для школьников. Десять типов задач — умозаключения, анаграммы, сравнения, цветные слова, семья, возраст, «или — или» и другие — плюс большой тест. Задачи озвучиваются голосом',
    level: 2,
    age: '8–11 лет',
    price: 2100,
    validityMonths: 3,
    published: true,
    lessons: [
      { id: 'ls-slogic-0', title: 'Умозаключения', kind: 'trainer', minutes: 10, trainer: 'slogic0' },
      { id: 'ls-slogic-1', title: 'Переставь буквы (анаграммы)', kind: 'trainer', minutes: 10, trainer: 'slogic1' },
      { id: 'ls-slogic-2', title: 'Кто выше? (сравнения)', kind: 'trainer', minutes: 10, trainer: 'slogic2' },
      { id: 'ls-slogic-3', title: 'Цветные слова: буквы', kind: 'trainer', minutes: 10, trainer: 'slogic3' },
      { id: 'ls-slogic-4', title: 'Семья и родственники', kind: 'trainer', minutes: 10, trainer: 'slogic4' },
      { id: 'ls-slogic-5', title: 'Возраст и время', kind: 'trainer', minutes: 10, trainer: 'slogic5' },
      { id: 'ls-slogic-6', title: 'Найди лишнее', kind: 'trainer', minutes: 10, trainer: 'slogic6' },
      { id: 'ls-slogic-7', title: 'Кого больше?', kind: 'trainer', minutes: 10, trainer: 'slogic7' },
      { id: 'ls-slogic-8', title: 'Цветные слова: расположение', kind: 'trainer', minutes: 10, trainer: 'slogic8' },
      { id: 'ls-slogic-9', title: 'Или — или (двойные условия)', kind: 'trainer', minutes: 10, trainer: 'slogic9' },
      { id: 'ls-slogic-mix', title: 'Большой тест: 20 задач вперемешку', kind: 'test', minutes: 12, trainer: 'slogicMix' },
    ],
  },
];

/* ================= пользователи ================= */

const now = Date.now();
const DAY_MS = 86_400_000;
const MONTH_MS = 30 * DAY_MS;

export const SEED_STUDENTS: Student[] = [
  {
    id: 'misha',
    name: 'Миша Орлов',
    age: 9,
    group: 'А',
    color: '#ff8a3d',
    purchased: ['c-count-mult', 'c-count-add'],
    done: ['ls-mult-1', 'ls-add-1'],
    points: 360,
    streak: 6,
    registeredAt: now - 40 * DAY_MS,
    accessUntil: { 'c-count-mult': now + 50 * DAY_MS, 'c-count-add': now + 62 * DAY_MS },
    phone: '+7 900 111-22-01',
    email: 'misha@demo.ru',
  },
  {
    id: 'anya',
    name: 'Аня Крылова',
    age: 8,
    group: 'А',
    color: '#2fa8dc',
    purchased: [],
    done: [],
    points: 0,
    streak: 0,
    registeredAt: now - DAY_MS, // свежая регистрация — идёт демо-доступ
    accessUntil: {},
    phone: '+7 900 111-22-02',
    email: 'anya@demo.ru',
  },
  {
    id: 'vera',
    name: 'Вера Сон',
    age: 10,
    group: 'Б',
    color: '#1fa97a',
    purchased: ['c-count-quest', 'c-mem-nback'],
    done: ['ls-nback-1'],
    points: 540,
    streak: 11,
    registeredAt: now - 60 * DAY_MS,
    accessUntil: { 'c-count-quest': now + 30 * DAY_MS, 'c-mem-nback': now + 25 * DAY_MS },
    phone: '+7 900 111-22-03',
    email: 'vera@demo.ru',
  },
  {
    id: 'lev',
    name: 'Лев Данилов',
    age: 11,
    group: 'Б',
    color: '#e8a912',
    purchased: ['c-count-mult', 'c-count-quest'],
    done: ['ls-mult-1', 'ls-mult-2', 'ls-mult-3'],
    points: 820,
    streak: 14,
    registeredAt: now - 75 * DAY_MS,
    accessUntil: { 'c-count-mult': now + 15 * DAY_MS, 'c-count-quest': now + 45 * DAY_MS },
    phone: '+7 900 111-22-04',
    email: 'lev@demo.ru',
  },
  {
    id: 'polina',
    name: 'Полина Юдина',
    age: 9,
    group: 'В',
    color: '#f05d50',
    purchased: ['c-count-mult'],
    done: ['ls-mult-1', 'ls-mult-2'],
    points: 410,
    streak: 3,
    registeredAt: now - 30 * DAY_MS,
    accessUntil: { 'c-count-mult': now + 60 * DAY_MS },
    phone: '+7 900 111-22-05',
    email: 'polina@demo.ru',
  },
];

/* ================= аккаунты (вход и пароли) ================= */

export interface Account {
  id: string;
  role: Role;
  name: string;
  /** логин: для учеников — email, для персонала — короткий логин */
  login: string;
  password: string;
  /** связь с профилем ученика (только для role === 'student') */
  studentId?: string;
}

export const SEED_ACCOUNTS: Account[] = [
  { id: 'acc-admin', role: 'admin', name: 'Администратор', login: 'admin', password: '1234567890' },
  { id: 'acc-school', role: 'admin', name: 'School', login: 'school', password: '1234567890' },
  { id: 'acc-teacher', role: 'teacher', name: 'Бичурин В. А.', login: 'bichurin', password: '1234567890' },
  { id: 'acc-misha', role: 'student', name: 'Миша Орлов', login: 'misha@demo.ru', password: 'misha2016', studentId: 'misha' },
  { id: 'acc-anya', role: 'student', name: 'Аня Крылова', login: 'anya@demo.ru', password: 'anya2017', studentId: 'anya' },
  { id: 'acc-vera', role: 'student', name: 'Вера Сон', login: 'vera@demo.ru', password: 'vera2015', studentId: 'vera' },
  { id: 'acc-lev', role: 'student', name: 'Лев Данилов', login: 'lev@demo.ru', password: 'lev2014', studentId: 'lev' },
  { id: 'acc-polina', role: 'student', name: 'Полина Юдина', login: 'polina@demo.ru', password: 'polina2016', studentId: 'polina' },
];

export const USERS: UserAccount[] = SEED_ACCOUNTS.map((a) => ({
  id: a.id,
  role: a.role,
  name: a.name,
  title: a.role === 'student' ? 'ученик' : a.role === 'teacher' ? 'преподаватель' : 'администратор',
}));

export const TEACHER_NAME = 'Бичурин В. А.';

/** Получатель платежей — самозанятый (демо-реквизиты) */
export const SELLER = {
  name: 'Бичурин В. А.',
  status: 'Самозанятый',
  inn: '771548236017',
  platform: 'Когнитив.Про',
};

export const SEED_SETTINGS: Settings = { trialDays: 3, qr: null };

/** Формат назначения платежа (на время отладки): «Когнитив.ПРО курс <название>» */
export const paymentPurposeFor = (courseTitle: string) => `Когнитив.ПРО курс ${courseTitle}`;

export const SEED_PAYMENTS: Payment[] = [
  { id: 'p-seed-1', date: '07.02.2026', studentId: 'misha', studentName: 'Миша Орлов', item: 'Тренировка умножения', purpose: 'Когнитив.ПРО курс Тренировка умножения', amount: 1500, method: 'Карта', status: 'оплачен' },
  { id: 'p-seed-2', date: '12.02.2026', studentId: 'lev', studentName: 'Лев Данилов', item: 'Космическая тетрадь: умножение в задачах', purpose: 'Когнитив.ПРО курс Космическая тетрадь: умножение в задачах', amount: 2200, method: 'СБП', status: 'оплачен' },
  { id: 'p-seed-3', date: '18.02.2026', studentId: 'polina', studentName: 'Полина Юдина', item: 'Тренировка умножения', purpose: 'Когнитив.ПРО курс Тренировка умножения', amount: 1500, method: 'СБП', status: 'оплачен' },
  { id: 'p-seed-4', date: '21.02.2026', studentId: 'vera', studentName: 'Вера Сон', item: 'N-back: тренажёр рабочей памяти', purpose: 'Когнитив.ПРО курс N-back: тренажёр рабочей памяти', amount: 2100, method: 'Карта', status: 'оплачен' },
  { id: 'p-seed-5', date: '25.02.2026', studentId: 'misha', studentName: 'Миша Орлов', item: 'Тренировка сложения', purpose: 'Когнитив.ПРО курс Тренировка сложения', amount: 1900, method: 'Карта', status: 'оплачен' },
];

/* ================= утилиты ================= */

export const fmtRub = (n: number) =>
  n === 0 ? 'бесплатно' : `${n.toLocaleString('ru-RU')} ₽`;

export const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('');

export const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const daysLeft = (ts: number) => Math.max(0, Math.ceil((ts - Date.now()) / DAY_MS));

export const monthWord = (n: number) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'месяц';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'месяца';
  return 'месяцев';
};

/* ================= доступ ================= */

/** Демо-доступ: trialDays дней с момента регистрации, все курсы открыты */
export function trialInfo(student: Student, trialDays: number) {
  const until = student.registeredAt + trialDays * DAY_MS;
  const active = Date.now() < until;
  return { active, daysLeft: active ? daysLeft(until) : 0 };
}

/** Оплаченный и неистёкший доступ к конкретному курсу */
export function hasAccess(student: Student, courseId: string): boolean {
  if (!student.purchased.includes(courseId)) return false;
  const until = student.accessUntil[courseId];
  return until === undefined || until > Date.now();
}

/** Итоговый доступ: демо или оплата */
export function canUse(student: Student, courseId: string, trialDays: number): boolean {
  return trialInfo(student, trialDays).active || hasAccess(student, courseId);
}
