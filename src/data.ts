/**
 * Домен платформы Когнитив.Про: типы, демо-данные и хелперы доступа.
 */

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
  | 'addCosmos';

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
  password: string;
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
    password: 'misha2016',
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
    password: 'anya2017',
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
    password: 'vera2015',
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
    password: 'lev2014',
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
    password: 'polina2016',
  },
];

export const USERS: UserAccount[] = [
  ...SEED_STUDENTS.map((s) => ({ id: s.id, role: 'student' as Role, name: s.name, title: `ученик · группа ${s.group}` })),
  { id: 'teacher', role: 'teacher', name: 'Марина Ветрова', title: 'преподаватель' },
  { id: 'admin', role: 'admin', name: 'Алексей Ким', title: 'администратор' },
];

export const TEACHER_NAME = 'Марина Сергеевна Ветрова';

/** Получатель платежей — самозанятый (демо-реквизиты) */
export const SELLER = {
  name: 'Ветрова Марина Сергеевна',
  status: 'Самозанятый',
  inn: '771548236017',
  platform: 'Когнитив.Про',
};

export const SEED_SETTINGS: Settings = { trialDays: 3 };

export const SEED_PAYMENTS: Payment[] = [
  { id: 'p-seed-1', date: '07.02.2026', studentId: 'misha', studentName: 'Миша Орлов', item: 'Тренировка умножения', purpose: 'Курс «Тренировка умножения» — Когнитив.Про', amount: 1500, method: 'Карта', status: 'оплачен' },
  { id: 'p-seed-2', date: '12.02.2026', studentId: 'lev', studentName: 'Лев Данилов', item: 'Космическая тетрадь: умножение в задачах', purpose: 'Курс «Космическая тетрадь: умножение в задачах» — Когнитив.Про', amount: 2200, method: 'СБП', status: 'оплачен' },
  { id: 'p-seed-3', date: '18.02.2026', studentId: 'polina', studentName: 'Полина Юдина', item: 'Тренировка умножения', purpose: 'Курс «Тренировка умножения» — Когнитив.Про', amount: 1500, method: 'СБП', status: 'оплачен' },
  { id: 'p-seed-4', date: '21.02.2026', studentId: 'vera', studentName: 'Вера Сон', item: 'N-back: тренажёр рабочей памяти', purpose: 'Курс «N-back: тренажёр рабочей памяти» — Когнитив.Про', amount: 2100, method: 'Карта', status: 'оплачен' },
  { id: 'p-seed-5', date: '25.02.2026', studentId: 'misha', studentName: 'Миша Орлов', item: 'Тренировка сложения', purpose: 'Курс «Тренировка сложения» — Когнитив.Про', amount: 1900, method: 'Карта', status: 'оплачен' },
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
