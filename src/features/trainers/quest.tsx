/**
 * «Космическая тетрадь» — квест на 100 текстовых задач по 4 планетам:
 * кулинария, игры, путешествия, магазин со сдачей.
 * Ошибки повторяются, полёт сохраняется между заходами.
 */

import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useStore } from '../../store';
import { beep, confettiBurst, isSoundOn, setSound, useReducedMotion } from '../../components';

export const TASKS_PER_BLOCK = 25;
export const MAX_REPEATS_PER_BLOCK = 3;
export const TOTAL_TASKS = 100;

interface Theme {
  name: string;
}

const THEMES: Theme[] = [
  { name: 'Кулинария 🍳' },
  { name: 'Игры 🎮' },
  { name: 'Путешествия 🚗' },
  { name: 'Животные 🐾' },
  { name: 'Друзья и семья 🏪' },
];

const BLOCK_NAMES = ['', 'Кулинария 🍳', 'Игры 🎮', 'Путешествия 🚗', 'Животные 🐾 и Друзья 🏪'];
const BLOCK_EMOJI = ['', '🍳', '🎮', '🚗', '🏪'];
const BLOCK_DESC = [
  '',
  'Простые задачи на умножение. Разминка перед полётом!',
  'Добавляем сложение! Будь внимателен.',
  'Двузначные числа и два действия. Ты справишься!',
  'Финальный босс: Магазин и сдача! Посчитай деньги.',
];

export interface QuestTask {
  text: string;
  answer: number;
  theme: Theme;
  isRepeat: boolean;
}

export interface SpaceState {
  name: string;
  block: number;
  taskInBlock: number;
  globalTask: number;
  stars: number;
  mistakes: number;
  blockMistakes: number;
  mistakesPool: QuestTask[];
  blockStartTime: number;
  globalStartTime: number;
  isRepeatMode: boolean;
}

const blankState = (name: string): SpaceState => ({
  name,
  block: 1,
  taskInBlock: 1,
  globalTask: 1,
  stars: 0,
  mistakes: 0,
  blockMistakes: 0,
  mistakesPool: [],
  blockStartTime: Date.now(),
  globalStartTime: Date.now(),
  isRepeatMode: false,
});

const spaceKey = (studentId: string) => `kognitiv-snb-v1-${studentId}`;

function loadSpace(studentId: string): SpaceState | null {
  try {
    const raw = localStorage.getItem(spaceKey(studentId));
    if (!raw) return null;
    const st = JSON.parse(raw) as SpaceState;
    if (!st || typeof st.globalTask !== 'number') return null;
    return st;
  } catch {
    return null;
  }
}

function saveSpace(studentId: string, st: SpaceState) {
  try {
    localStorage.setItem(spaceKey(studentId), JSON.stringify(st));
  } catch {
    /* noop */
  }
}

function clearSpace(studentId: string) {
  try {
    localStorage.removeItem(spaceKey(studentId));
  } catch {
    /* noop */
  }
}

export function declension(number: number, titles: [string, string, string]): string {
  const cases = [2, 0, 1, 1, 1, 2];
  return titles[number % 100 > 4 && number % 100 < 20 ? 2 : cases[number % 10 < 5 ? number % 10 : 5]];
}

const rnd = (n: number) => Math.floor(Math.random() * n);

export function generateTask(block: number, isRepeat = false, repeatData?: QuestTask): QuestTask {
  if (isRepeat && repeatData) return repeatData;

  let theme = THEMES[rnd(THEMES.length)];
  let text = '';
  let answer = 0;
  let a: number;
  let b: number;
  let c: number;

  if (block === 1) {
    a = rnd(8) + 2;
    b = rnd(8) + 2;
    answer = a * b;
    if (theme.name.includes('Кулинария'))
      text = `На 1 противень помещается ${a} ${declension(a, ['пирог', 'пирога', 'пирогов'])}. Сколько пирогов поместится на ${b} ${declension(b, ['противень', 'противня', 'противней'])}?`;
    else if (theme.name.includes('Игры'))
      text = `За прохождение уровня дают ${a} ${declension(a, ['монета', 'монеты', 'монет'])}. Ты прошёл ${b} ${declension(b, ['уровень', 'уровня', 'уровней'])}. Сколько всего монет?`;
    else if (theme.name.includes('Путешествия'))
      text = `Одна серия мультфильма длится ${a} ${declension(a, ['минута', 'минуты', 'минут'])}. Сколько минут займут ${b} ${declension(b, ['серия', 'серии', 'серий'])}?`;
    else if (theme.name.includes('Животные'))
      text = `У одного паука ${a} ${declension(a, ['лапа', 'лапы', 'лап'])}. Сколько лап у ${b} ${declension(b, ['паук', 'паука', 'пауков'])}?`;
    else text = `Ты покупаешь ${b} ${declension(b, ['наклейка', 'наклейки', 'наклеек'])} по ${a} ${declension(a, ['рубль', 'рубля', 'рублей'])}. Сколько это стоит?`;
  } else if (block === 2) {
    a = rnd(8) + 2;
    b = rnd(8) + 2;
    c = rnd(10) + 1;
    while (c === a || c === b) c = rnd(10) + 1;
    if (theme.name.includes('Кулинария')) {
      text = `Мама испекла ${a} ${declension(a, ['пирожок', 'пирожка', 'пирожков'])} с яблоками и ${b} ${declension(b, ['тарелка', 'тарелки', 'тарелок'])} с капустой. На каждой тарелке лежит по ${c} ${declension(c, ['пирожок', 'пирожка', 'пирожков'])}. Сколько всего пирожков?`;
      answer = a + b * c;
    } else if (theme.name.includes('Игры')) {
      text = `У тебя было ${c} ${declension(c, ['звезда', 'звезды', 'звёзд'])}. Ты прошёл ${b} ${declension(b, ['уровень', 'уровня', 'уровней'])}, и за каждый получил ${a} ${declension(a, ['звезда', 'звезды', 'звёзд'])}. Сколько стало?`;
      answer = c + b * a;
    } else if (theme.name.includes('Путешествия')) {
      text = `В автобусе ехало ${c} ${declension(c, ['человек', 'человека', 'человек'])}. Он сделал ${b} ${declension(b, ['остановка', 'остановки', 'остановок'])}, и на каждой остановке вошло ${a} ${declension(a, ['человек', 'человека', 'человек'])}. Сколько стало?`;
      answer = c + b * a;
    } else if (theme.name.includes('Животные')) {
      text = `В ${b} ${declension(b, ['гнездо', 'гнезда', 'гнёзд'])} сидит по ${a} ${declension(a, ['птенец', 'птенца', 'птенцов'])}, и ещё ${c} ${declension(c, ['птенец', 'птенца', 'птенцов'])} учатся летать. Сколько всего?`;
      answer = b * a + c;
    } else {
      text = `У тебя было ${c} ${declension(c, ['рубль', 'рубля', 'рублей'])}. Друзья скинулись: каждый из ${b} ${declension(b, ['друг', 'друга', 'друзей'])} дал тебе ${a} ${declension(a, ['рубль', 'рубля', 'рублей'])}. Сколько стало?`;
      answer = c + b * a;
    }
  } else if (block === 3) {
    a = rnd(8) + 2;
    b = rnd(10) + 10;
    c = rnd(15) + 5;
    if (Math.random() > 0.5) {
      answer = a * b;
      if (theme.name.includes('Кулинария'))
        text = `В одной коробке ${b} ${declension(b, ['конфета', 'конфеты', 'конфет'])}. Сколько конфет в ${a} ${declension(a, ['коробка', 'коробки', 'коробок'])}?`;
      else if (theme.name.includes('Игры'))
        text = `В игре ${a} ${declension(a, ['мир', 'мира', 'миров'])}, в каждом по ${b} ${declension(b, ['уровень', 'уровня', 'уровней'])}. Сколько всего уровней?`;
      else if (theme.name.includes('Путешествия'))
        text = `В ${a} ${declension(a, ['вагон', 'вагона', 'вагонов'])} по ${b} ${declension(b, ['место', 'места', 'мест'])}. Сколько всего мест?`;
      else if (theme.name.includes('Животные'))
        text = `В зоопарке ${a} ${declension(a, ['вольер', 'вольера', 'вольеров'])}, в каждом по ${b} ${declension(b, ['животное', 'животных', 'животных'])}. Сколько всего животных?`;
      else text = `У ${a} ${declension(a, ['друг', 'друга', 'друзей'])} по ${b} ${declension(b, ['марка', 'марки', 'марок'])}. Сколько всего марок?`;
    } else {
      answer = a * b - c;
      if (theme.name.includes('Кулинария'))
        text = `Было ${a} ${declension(a, ['упаковка', 'упаковки', 'упаковок'])} по ${b} ${declension(b, ['печенье', 'печенья', 'печений'])}. ${c} ${declension(c, ['штука', 'штуки', 'штук'])} съели. Сколько осталось?`;
      else if (theme.name.includes('Игры'))
        text = `Ты собрал ${a} ${declension(a, ['набор', 'набора', 'наборов'])} по ${b} ${declension(b, ['карточка', 'карточки', 'карточек'])}. ${c} ${declension(c, ['карточка', 'карточки', 'карточек'])} потерялось. Сколько осталось?`;
      else if (theme.name.includes('Путешествия'))
        text = `В ${a} ${declension(a, ['поезд', 'поезда', 'поездов'])} по ${b} ${declension(b, ['вагон', 'вагона', 'вагонов'])}. ${c} ${declension(c, ['вагон', 'вагона', 'вагонов'])} на ремонте. Сколько вагонов в пути?`;
      else if (theme.name.includes('Животные'))
        text = `В ${a} ${declension(a, ['стая', 'стаи', 'стай'])} по ${b} ${declension(b, ['птица', 'птицы', 'птиц'])}. ${c} ${declension(c, ['птица', 'птицы', 'птиц'])} улетели. Сколько осталось?`;
      else text = `Было ${a} ${declension(a, ['коробка', 'коробки', 'коробок'])} по ${b} ${declension(b, ['игрушка', 'игрушки', 'игрушек'])}. ${c} ${declension(c, ['игрушка', 'игрушки', 'игрушек'])} сломалось. Сколько целых?`;
    }
  } else {
    theme = THEMES[4];
    a = rnd(20) + 5;
    b = rnd(6) + 2;
    const total = a * b;
    let given = Math.ceil(total / 50) * 50;
    if (given < total + 10) given += 50;
    answer = given - total;
    text = `Ты с друзьями покупаешь ${b} ${declension(b, ['шоколадка', 'шоколадки', 'шоколадок'])}, каждая стоит ${a} ${declension(a, ['рубль', 'рубля', 'рублей'])}. Ты дал кассиру ${given} ${declension(given, ['рубль', 'рубля', 'рублей'])}. Сколько сдачи ты должен получить?`;
  }

  return { text, answer, theme, isRepeat: false };
}

const fmtTime = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

type Screen = 'start' | 'intro' | 'task' | 'report' | 'final';

export function QuestTrainer({ onPass, alreadyDone, onClose }: { onPass: () => void; alreadyDone: boolean; onClose: () => void }) {
  const { me } = useStore();
  const reduced = useReducedMotion();
  const studentId = me?.id ?? 'guest';

  const [screen, setScreen] = useState<Screen>('start');
  const [st, setSt] = useState<SpaceState>(() => loadSpace(studentId) ?? blankState(me?.name ?? 'Ученик'));
  const [cur, setCur] = useState<QuestTask | null>(null);
  const [val, setVal] = useState('');
  const [wrong, setWrong] = useState(false);
  const [sound, setSoundUi] = useState(isSoundOn());

  const inputRef = useRef<HTMLInputElement>(null);
  const savedExists = loadSpace(studentId) !== null;
  const passedRef = useRef(false);

  const persist = (next: SpaceState) => {
    setSt(next);
    saveSpace(studentId, next);
  };

  const startBlock = () => {
    const next = { ...st, taskInBlock: 1, blockMistakes: 0, isRepeatMode: false, blockStartTime: Date.now() };
    persist(next);
    setScreen('task');
    setCur(generateTask(next.block));
    setVal('');
    window.setTimeout(() => inputRef.current?.focus(), 60);
  };

  const loadNext = (base: SpaceState) => {
    let task: QuestTask;
    let next = base;
    if (!base.isRepeatMode && base.mistakesPool.length > 0 && base.taskInBlock <= MAX_REPEATS_PER_BLOCK) {
      const pool = [...base.mistakesPool];
      const repeatTask = pool.shift() as QuestTask;
      task = generateTask(base.block, true, repeatTask);
      next = { ...base, mistakesPool: pool, isRepeatMode: true };
    } else {
      task = generateTask(base.block);
      next = { ...base, isRepeatMode: false };
    }
    setCur(task);
    setVal('');
    setWrong(false);
    window.setTimeout(() => inputRef.current?.focus(), 40);
    return next;
  };

  const showReport = (base: SpaceState) => {
    beep('win');
    persist(base);
    setScreen('report');
  };

  const showFinal = (base: SpaceState) => {
    beep('win');
    if (!reduced) confettiBurst();
    persist(base);
    clearSpace(studentId);
    setScreen('final');
    if (!passedRef.current) {
      passedRef.current = true;
      onPass();
    }
  };

  const check = () => {
    if (!cur) return;
    const userAnswer = parseInt(val, 10);
    if (Number.isNaN(userAnswer)) return;
    if (userAnswer === cur.answer) {
      beep('ok');
      const s2: SpaceState = { ...st, stars: st.stars + 1, taskInBlock: st.taskInBlock + 1, globalTask: st.globalTask + 1 };
      if (s2.globalTask > TOTAL_TASKS) {
        showFinal(s2);
        return;
      }
      if (s2.taskInBlock > TASKS_PER_BLOCK) {
        showReport(s2);
      } else {
        persist(loadNext(s2));
      }
    } else {
      beep('no');
      setWrong(true);
      const pool = !cur.isRepeat && !st.mistakesPool.some((t) => t.text === cur.text) ? [...st.mistakesPool, cur] : st.mistakesPool;
      persist({ ...st, mistakes: st.mistakes + 1, blockMistakes: st.blockMistakes + 1, mistakesPool: pool });
      setTimeout(() => {
        setWrong(false);
        setVal('');
        inputRef.current?.focus();
      }, 550);
    }
  };

  const resetAll = () => {
    clearSpace(studentId);
    const fresh = blankState(me?.name ?? 'Ученик');
    setSt(fresh);
    passedRef.current = false;
    setScreen('intro');
  };

  const toggleSound = () => {
    const on = !sound;
    setSound(on);
    setSoundUi(on);
    if (on) beep('ok');
  };

  const pct = ((st.taskInBlock - 1) / TASKS_PER_BLOCK) * 100;
  const blockAcc = Math.max(0, Math.round(((TASKS_PER_BLOCK - st.blockMistakes) / TASKS_PER_BLOCK) * 100));
  const globalAcc = Math.max(0, Math.round(((Math.min(st.globalTask, TOTAL_TASKS) - st.mistakes) / Math.min(st.globalTask, TOTAL_TASKS)) * 100));

  const notebookStyle: CSSProperties = {
    backgroundColor: '#fff',
    backgroundImage: 'linear-gradient(#e1f0ff 1px, transparent 1px), linear-gradient(90deg, #e1f0ff 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    borderLeft: '4px solid #ff9999',
    fontFamily: "'Comfortaa', cursive",
    color: '#2c3e50',
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-line p-5 sm:p-7"
      style={{
        backgroundColor: '#f0f4f8',
        backgroundImage: 'radial-gradient(#d1d9e6 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        fontFamily: "'Comfortaa', cursive",
        color: '#2c3e50',
      }}
    >
      <div className="mx-auto max-w-[620px] text-center">
        {/* старт */}
        {screen === 'start' && (
          <div className="snb-fade py-6">
            <h4 className="text-[26px] font-bold text-[#4a90e2]">🚀 Космическая тетрадь</h4>
            <p className="mt-1 text-[14px]">Отработка таблицы умножения в реальных задачах</p>
            {savedExists && (
              <div className="mt-5 rounded-xl bg-white p-5 shadow-sm">
                <p className="text-[14px]">
                  С возвращением, <b className="text-[#4a90e2]">{st.name}</b>!
                </p>
                <p className="text-[14px]">
                  Прогресс: <b>{Math.min(st.globalTask, TOTAL_TASKS)}</b>/{TOTAL_TASKS}
                </p>
                <button
                  onClick={() => {
                    beep('unlock');
                    setScreen('intro');
                  }}
                  className="mt-3 rounded-full bg-[#4a90e2] px-7 py-3 text-[15px] font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
                >
                  Продолжить полёт ▶
                </button>
              </div>
            )}
            {!savedExists && (
              <button
                onClick={() => {
                  beep('unlock');
                  setScreen('intro');
                }}
                className="mt-6 rounded-full bg-[#4a90e2] px-8 py-3.5 text-[16px] font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
              >
                Поехали! 🚀
              </button>
            )}
            <p className="mt-4 text-[12px] opacity-60">100 задач · 4 планеты · ошибки возвращаются на повторение</p>
          </div>
        )}

        {/* планета */}
        {screen === 'intro' && (
          <div className="snb-fade py-6">
            <div className="snb-pop text-[76px] leading-none">{BLOCK_EMOJI[st.block]}</div>
            <h4 className="mt-3 text-[24px] font-bold text-[#4a90e2]">Планета: {BLOCK_NAMES[st.block]}</h4>
            <p className="mt-1 text-[14px]">{BLOCK_DESC[st.block]}</p>
            <button
              onClick={() => {
                beep('unlock');
                startBlock();
              }}
              className="mt-6 rounded-full bg-[#4a90e2] px-8 py-3.5 text-[16px] font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
            >
              Начать блок ▶
            </button>
          </div>
        )}

        {/* задача */}
        {screen === 'task' && cur && (
          <div className="snb-fade">
            <div className="flex items-center justify-between rounded-full bg-white px-5 py-2.5 text-[14px] font-bold shadow-sm">
              <span>✨ {st.stars}</span>
              <span>🚀 Блок {st.block}</span>
              <span className="flex items-center gap-2">
                ❌ {st.mistakes}
                <button onClick={toggleSound} className="rounded-md border border-[#d1d9e6] px-2 py-0.5 text-[13px]" aria-label="Звук">
                  {sound ? '🔊' : '🔇'}
                </button>
              </span>
            </div>

            <div className="relative mt-4 h-[25px] overflow-hidden rounded-[15px] bg-[#e0e0e0] shadow-inner">
              <div className="h-full rounded-[15px]" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#4caf50,#8bc34a)', transition: 'width 0.5s ease' }} />
              <span className="absolute top-[-5px] z-[2] text-[26px] transition-all duration-500" style={{ left: `calc(${pct}% - 12px)`, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.2))' }}>
                🚀
              </span>
            </div>
            <p className="mt-1.5 text-right text-[13px] text-[#7f8c8d]">
              Задача {st.taskInBlock} из {TASKS_PER_BLOCK} (всего: {Math.min(st.globalTask, TOTAL_TASKS)}/{TOTAL_TASKS})
            </p>

            <div className="relative mt-3 rounded-lg px-5 pb-6 pt-7 text-left shadow-md sm:px-8" style={notebookStyle}>
              <span className="absolute bottom-0 left-[30px] top-0 w-[2px] bg-[#ff9999]" aria-hidden="true" />
              {cur.isRepeat && (
                <span className="snb-pop mb-2 inline-block rounded-[20px] bg-[#f8d7da] px-4 py-1 text-[13px] font-bold text-[#721c24]">🔁 Повторение ошибки</span>
              )}
              <span className="mb-3 inline-block rounded-[20px] bg-[#fff3cd] px-4 py-1 text-[13px] font-bold text-[#856404]">{cur.theme.name}</span>
              <p className="text-[26px] leading-[40px] text-[#1a237e]" style={{ fontFamily: "'Caveat', cursive" }}>
                {cur.text}
              </p>
              <div className="mt-6 text-center">
                <input
                  ref={inputRef}
                  value={val}
                  onChange={(e) => setVal(e.target.value.replace(/[^\d]/g, '').slice(0, 5))}
                  onKeyDown={(e) => e.key === 'Enter' && check()}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="?"
                  aria-label="Ответ"
                  className={`w-[150px] rounded-[10px] border-2 px-3 py-2 text-center text-[26px] outline-none transition-colors ${wrong ? 'snb-shake border-[#f44336]' : 'border-[#4a90e2] focus:border-[#2c6fce]'}`}
                  style={{ fontFamily: "'Caveat', cursive" }}
                />
                <br />
                <button
                  onClick={check}
                  className="mt-4 rounded-full bg-[#4a90e2] px-8 py-3 text-[15px] font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
                >
                  Проверить ✅
                </button>
              </div>
            </div>
          </div>
        )}

        {/* отчёт по блоку */}
        {screen === 'report' && (
          <div className="snb-fade py-4">
            <h4 className="text-[24px] font-bold text-[#4a90e2]">🎉 Блок {st.block} завершён!</h4>
            <div className="mt-4 h-[30px] overflow-hidden rounded-[15px] bg-[#e0e0e0] shadow-inner">
              <div className="h-full" style={{ width: `${(Math.min(st.globalTask, TOTAL_TASKS) / TOTAL_TASKS) * 100}%`, background: 'linear-gradient(90deg,#4caf50,#8bc34a)', transition: 'width 0.6s ease' }} />
            </div>
            <p className="mt-2 text-[14px]">
              Общий прогресс полёта: <b>{Math.min(st.globalTask, TOTAL_TASKS)}</b>/{TOTAL_TASKS}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { v: String(st.stars), l: 'Звёзд всего' },
                { v: String(st.blockMistakes), l: 'Ошибок в блоке' },
                { v: `${blockAcc}%`, l: 'Точность блока' },
                { v: fmtTime(Date.now() - st.blockStartTime), l: 'Время в блоке' },
              ].map((s) => (
                <div key={s.l} className="rounded-[15px] bg-white px-3 py-3.5 shadow-sm">
                  <p className="text-[26px] font-bold text-[#4a90e2]">{s.v}</p>
                  <p className="text-[12.5px] text-[#7f8c8d]">{s.l}</p>
                </div>
              ))}
            </div>
            {st.mistakesPool.length > 0 && <p className="mt-3 text-[13px] text-[#f44336]">⚠️ В следующий блок добавлены задачи для повторения!</p>}
            <button
              onClick={() => {
                beep('unlock');
                if (st.block >= 4) showFinal(st);
                else {
                  const next = { ...st, block: st.block + 1 };
                  persist(next);
                  setScreen('intro');
                }
              }}
              className="mt-5 rounded-full bg-[#4a90e2] px-8 py-3.5 text-[16px] font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
            >
              {st.block >= 4 ? 'Получить награду 🏆' : 'Летим дальше 🚀'}
            </button>
          </div>
        )}

        {/* финал */}
        {screen === 'final' && (
          <div className="snb-fade py-4">
            <div className="snb-pop text-[76px] leading-none">🏆</div>
            <h4 className="mt-2 text-[26px] font-bold text-[#4a90e2]">
              Поздравляем, {st.name}!
            </h4>
            <p className="mt-1 text-[14px]">Ты успешно прошёл все 100 задач и покорил космос математики!</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { v: String(st.stars), l: 'Всего звёзд' },
                { v: String(st.mistakes), l: 'Всего ошибок' },
                { v: `${globalAcc}%`, l: 'Общая точность' },
                { v: fmtTime(Date.now() - st.globalStartTime), l: 'Общее время' },
              ].map((s) => (
                <div key={s.l} className="rounded-[15px] bg-white px-3 py-3.5 shadow-sm">
                  <p className="text-[26px] font-bold text-[#4a90e2]">{s.v}</p>
                  <p className="text-[12.5px] text-[#7f8c8d]">{s.l}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12.5px] opacity-70" style={{ fontFamily: "'Golos Text', sans-serif" }}>
              {alreadyDone ? 'Урок уже был зачтён раньше — очки не начислены.' : 'Урок зачтён: +20 очков на счёт.'}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button onClick={resetAll} className="rounded-full bg-[#4a90e2] px-7 py-3 text-[15px] font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5">
                Начать заново 🔄
              </button>
              <button onClick={onClose} className="rounded-full border-2 border-[#bdc3c7] px-7 py-3 text-[15px] font-bold text-[#7f8c8d] transition-transform hover:-translate-y-0.5">
                Закрыть
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
