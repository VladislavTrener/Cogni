/**
 * Банк из 235 логических задач для школьников (4–6 класс).
 * Задачи идут циклом из 10 типов:
 *  тип определяется номером: (n-1) mod 10.
 *  0 — Умозаключения, 1 — Анаграммы, 2 — Сравнения, 3 — Цветные слова: буквы,
 *  4 — Семья, 5 — Возраст и время, 6 — Найди лишнее, 7 — Кого больше?,
 *  8 — Цветные слова: расположение, 9 — «Или — или».
 *
 * Банк разбит на части, чтобы его было удобно переносить по частям:
 *  1–80 — logicGrade46Bank1.ts; 81–160 — logicGrade46Bank2.ts; 161–235 — logicGrade46Bank3.ts.
 */

import type { LogicQ } from './logicData';
import { G46_BANK_PART1 } from './logicGrade46Bank1';
import { G46_BANK_PART2 } from './logicGrade46Bank2';
import { G46_BANK_PART3 } from './logicGrade46Bank3';

export const g46TypeOf = (n: number) => (n - 1) % 10;

export const G46_LOGIC_TYPES = [
  { id: 0, name: 'Умозаключения', desc: 'логические рассуждения', emoji: '🕵️', color: '#e8a912' },
  { id: 1, name: 'Переставь буквы', desc: 'анаграммы', emoji: '🔤', color: '#2fa8dc' },
  { id: 2, name: 'Кто выше?', desc: 'сравнения и порядок', emoji: '📊', color: '#1fa97a' },
  { id: 3, name: 'Цветные слова: буквы', desc: 'какое слово какого цвета', emoji: '🎨', color: '#ff8a3d' },
  { id: 4, name: 'Семья и родственники', desc: 'кто кому кто', emoji: '👪', color: '#f05d50' },
  { id: 5, name: 'Возраст и время', desc: 'кто старше, кто моложе', emoji: '⏳', color: '#b388eb' },
  { id: 6, name: 'Найди лишнее', desc: 'не то и не другое', emoji: '🔍', color: '#4cc9f0' },
  { id: 7, name: 'Кого больше?', desc: 'количества', emoji: '⚖️', color: '#8ac926' },
  { id: 8, name: 'Цветные слова: расположение', desc: 'левее, правее, выше, ниже', emoji: '🗺️', color: '#f9c74f' },
  { id: 9, name: 'Или — или', desc: 'двойные условия', emoji: '🤔', color: '#ff8fab' },
];

/** Полный банк: 1–80 + 81–160 + 161–235 */
const G: LogicQ[] = [...G46_BANK_PART1, ...G46_BANK_PART2, ...G46_BANK_PART3];

export const G46_LOGIC_BANK: LogicQ[] = G;

/** Задачи одного типа, отсортированные по номеру */
export const g46ByType = (t: number): LogicQ[] => G.filter((q) => g46TypeOf(q.n) === t);

/** Случайная смешанная выборка из всего банка */
export function g46MixedSample(count: number): LogicQ[] {
  const pool = [...G];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/** Размер смешанного блока: 10 задач подряд = по одной каждого типа (цикл из 10) */
export const G46_BLOCK_SIZE = 10;

/** Сколько блоков в банке (последний может быть короче) */
export const G46_BLOCK_COUNT = Math.ceil(G.length / G46_BLOCK_SIZE);

/** Задачи блока b (1-нумерация): срез исходной последовательности, уже перемешанной по типам */
export const g46ByBlock = (b: number): LogicQ[] =>
  G.slice((b - 1) * G46_BLOCK_SIZE, b * G46_BLOCK_SIZE);

/** Источник для курса «Логика 4-6 класс» */
export const GRADE46_LOGIC_SOURCE = {
  label: 'Логика 4-6 класс',
  bankSize: G.length,
  types: G46_LOGIC_TYPES,
  typeOf: g46TypeOf,
  byType: g46ByType,
  mixedSample: g46MixedSample,
  byBlock: g46ByBlock,
  blockCount: G46_BLOCK_COUNT,
  blockSize: G46_BLOCK_SIZE,
};
