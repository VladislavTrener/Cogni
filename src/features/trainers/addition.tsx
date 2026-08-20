/**
 * «Тренировка сложения» — три тренажёра на общей механике интервальных коробок:
 * 1) Счёт до 20 с постепенным ростом сложности (6 уровней);
 * 2) Умные интервалы — карточки возвращаются по расписанию 20 с → 1 мин → 5 мин → 30 мин;
 * 3) Космолёт — сложение двузначных чисел в формате «верно / неверно».
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';
import { beep, confettiBurst, isSoundOn, setSound, useReducedMotion } from '../../components';

export const ADD_SESSION = 20;
export const ADD_PASS_ACC = 70;
export const COUNT_LEVELS = 6;
export const COSMOS_LEVELS = 8;
const UNLOCK_AT = 8; // верных на уровне для открытия следующего
const INTERVALS = [0, 20_000, 60_000, 300_000, 1_800_000]; // коробки 1..4
export const INTERVAL_LABELS = ['—', '20 с', '1 мин', '5 мин', '30 мин', 'освоена'];

export interface AddExample {
  a: number;
  b: number;
  ans: number;
  box: number;
  level: number;
}

export interface AdditionData {
  count: { unlocked: number; progress: Record<number, number>; boxes: Record<string, number>; due: Record<string, number> };
  cosmos: { unlocked: number; progress: Record<number, number>; boxes: Record<string, number> };
  totals: { solved: number; correct: number };
}

const blankAdd = (): AdditionData => ({
  count: { unlocked: 1, progress: {}, boxes: {}, due: {} },
  cosmos: { unlocked: 1, progress: {}, boxes: {} },
  totals: { solved: 0, correct: 0 },
});

const addKey = (a: number, b: number) => `${a}+${b}`;

function loadAdd(studentId: string): AdditionData {
  try {
    const raw = localStorage.getItem(`kognitiv-add-v1-${studentId}`);
    if (raw) return { ...blankAdd(), ...(JSON.parse(raw) as AdditionData) };
  } catch {
    /* noop */
  }
  return blankAdd();
}

function saveAdd(studentId: string, ad: AdditionData) {
  try {
    localStorage.setItem(`kognitiv-add-v1-${studentId}`, JSON.stringify(ad));
  } catch {
    /* noop */
  }
}

const rnd = (n: number) => Math.floor(Math.random() * n);

/** Задача по уровню сложности (1..6) */
function countProblem(level: number): { a: number; b: number } {
  switch (level) {
    case 1:
      return { a: rnd(4) + 1, b: rnd(4) + 1 }; // 1..4
    case 2:
      return { a: rnd(7) + 1, b: rnd(7) + 1 }; // 1..7
    case 3: {
      const a = rnd(9) + 1;
      let b = rnd(9 - a + 1) + 1; // сумма <= 10
      if (a + b > 10) b = 10 - a;
      return { a, b: Math.max(1, b) };
    }
    case 4: {
      const a = rnd(9) + 2; // 2..10
      const b = Math.max(2, 10 - a + 1 + rnd(10)); // переход через 10, сумма до 20
      return { a, b: Math.min(b, 20 - a) };
    }
    case 5: {
      const a = rnd(2) === 0 ? 10 : 20; // прибавление к «десяткам»
      return { a, b: rnd(9) + 1 };
    }
    default:
      return { a: rnd(10) + 1, b: rnd(20 - (rnd(10) + 1) + 1) + 1 }; // любые до 20
  }
}

/** Задача для космолёта по уровню (1..8) — сложение двузначных */
function cosmosPair(level: number): { a: number; b: number } {
  const two = (lo: number, hi: number) => lo + rnd(hi - lo + 1);
  switch (level) {
    case 1:
      return { a: two(10, 49), b: rnd(8) + 2 }; // двузначное + однозначное, без перехода
    case 2:
      return { a: two(10, 59), b: rnd(9) + 1 }; // с переходом через разряд
    case 3:
      return { a: two(10, 49), b: two(10, 29) }; // круглые десятки
    case 4:
      return { a: two(11, 39), b: two(11, 29) }; // без перехода через десяток
    case 5:
      return { a: two(15, 49), b: two(15, 39) }; // с переходом
    case 6:
      return { a: two(20, 69), b: two(20, 49) }; // большие
    case 7:
      return { a: two(30, 89), b: two(20, 59) }; // ближе к сотне
    default:
      return { a: two(10, 89), b: two(10, 89) }; // любые двузначные
  }
}

function corruptAdd(a: number, b: number): number {
  const real = a + b;
  const opts: number[] = [];
  [1, -1, 10, -10, 2, -2].forEach((v) => {
    const c = real + v;
    if (c > 0 && c !== real) opts.push(c);
  });
  // типичная ошибка «забыл перенести разряд»
  const carry = real - (a % 10) - (b % 10) + (((a % 10) + (b % 10)) % 10);
  if (carry > 0 && carry !== real) opts.push(carry);
  return opts[rnd(opts.length)];
}

const boxWeight = (box: number) => [4, 4, 3, 2, 1, 1][box];

/** Случайная задача уровня с учётом коробок */
function weightedCountProblem(ad: AdditionData, level: number): AddExample {
  const list: { a: number; b: number; box: number; w: number }[] = [];
  for (let i = 0; i < 40; i++) {
    const { a, b } = countProblem(level);
    const box = ad.count.boxes[addKey(a, b)] ?? 0;
    list.push({ a, b, box, w: boxWeight(box) });
  }
  // приоритет «созревшим» карточкам
  const now = Date.now();
  const dueList = list.filter((x) => {
    const t = ad.count.due[addKey(x.a, x.b)];
    return t !== undefined && t <= now;
  });
  const pool = dueList.length > 0 ? dueList : list;
  let total = 0;
  for (const x of pool) total += x.w;
  let r = Math.random() * total;
  for (const x of pool) {
    r -= x.w;
    if (r <= 0) return { a: x.a, b: x.b, ans: x.a + x.b, box: x.box, level };
  }
  const x = pool[pool.length - 1];
  return { a: x.a, b: x.b, ans: x.a + x.b, box: x.box, level };
}

function registerAdd(
  ad: AdditionData,
  part: 'count' | 'cosmos',
  a: number,
  b: number,
  ok: boolean,
  level: number,
): { next: AdditionData; unlockedNew: number | null } {
  const next: AdditionData = JSON.parse(JSON.stringify(ad)) as AdditionData;
  next.totals.solved++;
  let unlockedNew: number | null = null;
  const store = next[part];
  const k = addKey(a, b);
  if (ok) {
    next.totals.correct++;
    store.progress[level] = (store.progress[level] ?? 0) + 1;
    const cap = part === 'count' ? COUNT_LEVELS : COSMOS_LEVELS;
    if (level === store.unlocked && store.progress[level] >= UNLOCK_AT && store.unlocked < cap) {
      store.unlocked++;
      unlockedNew = store.unlocked;
    }
    const box = Math.min(5, (store.boxes[k] ?? 0) + 1);
    store.boxes[k] = box;
    if (part === 'count') {
      if (box >= 5) delete next.count.due[k];
      else next.count.due[k] = Date.now() + INTERVALS[box];
    }
  } else {
    store.boxes[k] = 1;
    if (part === 'count') next.count.due[k] = Date.now() + INTERVALS[1];
  }
  return { next, unlockedNew };
}

const masteredAdd = (ad: AdditionData, part: 'count' | 'cosmos') => Object.values(ad[part].boxes).filter((b) => b >= 4).length;

export function dueLabel(msLeft: number): string {
  if (msLeft <= 0) return 'сейчас';
  const s = Math.ceil(msLeft / 1000);
  if (s < 60) return `${s} с`;
  const m = Math.floor(s / 60);
  return `${m} мин ${s % 60} с`;
}

/* ================= общие UI-кусочки ================= */

function AddSoundToggle() {
  const [sound, setSoundUi] = useState(isSoundOn());
  return (
    <button
      onClick={() => {
        const on = !sound;
        setSound(on);
        setSoundUi(on);
        if (on) beep('ok');
      }}
      className="rounded-md border border-line bg-card px-2.5 py-1.5 text-[14px] transition-colors hover:border-ink/30"
      aria-label="Звук"
    >
      {sound ? '🔊' : '🔇'}
    </button>
  );
}

function AddEndScreen({
  correct,
  score,
  bestStreak,
  passed,
  alreadyDone,
  onRetry,
  onClose,
  title,
}: {
  correct: number;
  score: number;
  bestStreak: number;
  passed: boolean;
  alreadyDone: boolean;
  onRetry: () => void;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="py-2 text-center">
      <h4 className="font-display font-900 text-2xl text-ink">{title}</h4>
      <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
        {[
          { l: 'верных', v: `${correct}/${ADD_SESSION}` },
          { l: 'очки', v: String(score) },
          { l: 'серия', v: String(bestStreak) },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-line bg-card px-2 py-3">
            <p className="font-display font-900 text-xl text-ink">{s.v}</p>
            <p className="text-[11px] text-inkmut mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-[12.5px] text-inkmut">
        {passed
          ? alreadyDone
            ? 'Урок уже был зачтён раньше — очки не начислены, прогресс сохранён.'
            : 'Урок зачтён: +20 очков на счёт.'
          : `Для зачёта урока нужна точность ${ADD_PASS_ACC}% — попробуй ещё раз.`}
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <button onClick={onRetry} className="rounded-lg border border-ink/15 px-5 py-2.5 text-[13.5px] font-bold text-ink transition-colors hover:border-ink/40">
          Ещё раунд
        </button>
        <button onClick={onClose} className="rounded-lg bg-pine-900 px-5 py-2.5 text-[13.5px] font-bold text-paper transition-colors hover:bg-pine-700">
          Закрыть
        </button>
      </div>
    </div>
  );
}

/* ================= 1. Счёт до 20 ================= */

export function AdditionCountTrainer({ onPass, alreadyDone, onClose }: { onPass: () => void; alreadyDone: boolean; onClose: () => void }) {
  const { me } = useStore();
  const reduced = useReducedMotion();
  const studentId = me?.id ?? 'guest';

  const [ad, setAd] = useState<AdditionData>(() => loadAdd(studentId));
  const [cur, setCur] = useState<AddExample | null>(null);
  const [val, setVal] = useState('');
  const [qNum, setQNum] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const [shake, setShake] = useState(false);
  const [stage, setStage] = useState<'play' | 'end'>('play');
  const [toast, setToast] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ask = (d: AdditionData) => {
    setCur(weightedCountProblem(d, d.count.unlocked));
    setVal('');
    setFb(null);
    window.setTimeout(() => inputRef.current?.focus(), 40);
  };

  useEffect(() => {
    ask(loadAdd(studentId));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (toastRef.current) clearTimeout(toastRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => {
    if (stage !== 'play' || !cur || fb) return;
    const v = parseInt(val, 10);
    if (Number.isNaN(v)) {
      setShake(true);
      setTimeout(() => setShake(false), 380);
      return;
    }
    const ok = v === cur.ans;
    const nextQ = qNum + 1;
    const nextStreak = ok ? streak + 1 : 0;
    const nextCorrect = correct + (ok ? 1 : 0);
    const nextScore = score + (ok ? 10 + Math.min(streak, 10) : 0);

    setQNum(nextQ);
    setStreak(nextStreak);
    setBestStreak(Math.max(bestStreak, nextStreak));
    setCorrect(nextCorrect);
    setScore(nextScore);

    const { next, unlockedNew } = registerAdd(ad, 'count', cur.a, cur.b, ok, cur.level);
    setAd(next);
    saveAdd(studentId, next);
    setFb(ok ? { ok: true, text: 'Верно! Карточка поднялась по коробкам.' } : { ok: false, text: `Правильно: ${cur.ans}. Карточка вернулась в коробку 1.` });
    beep(ok ? 'ok' : 'no');
    if (unlockedNew) {
      beep('unlock');
      setToast(`Открыт уровень ${unlockedNew} — сложность выросла!`);
      if (toastRef.current) clearTimeout(toastRef.current);
      toastRef.current = setTimeout(() => setToast(null), 2600);
    }

    timerRef.current = setTimeout(() => {
      if (nextQ >= ADD_SESSION) {
        const acc = Math.round((nextCorrect / ADD_SESSION) * 100);
        setStage('end');
        if (acc >= ADD_PASS_ACC) {
          beep('win');
          if (!reduced) confettiBurst();
          onPass();
        }
      } else ask(next);
    }, ok ? 800 : 1600);
  };

  const restart = () => {
    setQNum(0);
    setScore(0);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
    setFb(null);
    setVal('');
    setStage('play');
    ask(ad);
  };

  const LEVEL_DESC = ['1–4', '1–7', 'до 10', 'через 10', 'десятки', 'всё вместе'];

  return (
    <div className="relative rounded-xl border border-line bg-paper p-5 sm:p-6">
      {toast && (
        <div className="pop-in absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-pine-900 px-4 py-2.5 text-[13px] font-bold text-paper shadow-xl">
          <span className="mr-1.5">🔓</span>
          {toast}
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-[11px] tracking-[0.22em] text-[#b05f1e]">ТРЕНИРОВКА СЛОЖЕНИЯ · СЧЁТ ДО 20</p>
        <div className="flex items-center gap-2.5">
          {stage === 'play' && (
            <span className="text-[12.5px] font-bold uppercase tracking-[0.12em] text-inksoft">
              пример {Math.min(qNum + 1, ADD_SESSION)} / {ADD_SESSION}
            </span>
          )}
          <AddSoundToggle />
        </div>
      </div>

      {stage === 'play' && cur && (
        <div className="grid gap-5 md:grid-cols-[1fr_230px] items-start">
          <div>
            <div className="rounded-xl border border-line border-l-8 bg-card p-6 sm:p-7" style={{ borderLeftColor: '#ff8a3d' }}>
              <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.14em] text-inkmut">
                уровень {cur.level} из {COUNT_LEVELS} · {LEVEL_DESC[cur.level - 1]}
              </p>
              <div className="flex flex-wrap items-baseline gap-3.5">
                <span className="font-display font-900 text-4xl sm:text-5xl tracking-tight text-ink">
                  {cur.a} + {cur.b} =
                </span>
                <input
                  ref={inputRef}
                  value={val}
                  disabled={fb !== null}
                  onChange={(e) => setVal(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label="Ответ"
                  className={`w-[3ch] border-b-[5px] border-dashed bg-transparent text-center font-display font-900 text-4xl sm:text-5xl text-ink outline-none transition-colors ${
                    shake ? 'shake border-coral' : 'border-ink/25 focus:border-orange'
                  }`}
                />
              </div>
              <p className={`mt-3.5 min-h-[24px] text-[14px] font-bold ${fb === null ? 'text-inkmut' : fb.ok ? 'text-mint' : 'text-coral'}`}>
                {fb === null ? 'Введи ответ и нажми Enter' : fb.text}
              </p>
              <button
                onClick={submit}
                disabled={fb !== null}
                className="mt-5 rounded-xl bg-ink px-7 py-3 font-display text-[14px] font-700 text-paper transition-all hover:-translate-y-0.5 hover:bg-pine-700 disabled:opacity-40"
              >
                Ответить
              </button>
            </div>
            <p className="mt-4 text-[12px] text-inkmut">
              {UNLOCK_AT} верных ответов на уровне — откроется следующий. Ошибки возвращают карточку в первую коробку.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-card p-4">
            <p className="font-display text-[11px] font-700 text-ink mb-3">УРОВНИ</p>
            <ul className="space-y-1.5">
              {LEVEL_DESC.map((lv, i) => (
                <li
                  key={lv}
                  className={`flex items-center justify-between rounded-md px-3 py-1.5 text-[12.5px] ${
                    i + 1 === ad.count.unlocked ? 'bg-orange/12 font-bold text-[#b05f1e]' : i + 1 < ad.count.unlocked ? 'text-mint' : 'text-inkmut'
                  }`}
                >
                  <span>
                    {i + 1 < ad.count.unlocked ? '✓ ' : ''}
                    {i + 1}. {lv}
                  </span>
                  {i + 1 === ad.count.unlocked && <span>{Math.min(UNLOCK_AT, ad.count.progress[i + 1] ?? 0)}/{UNLOCK_AT}</span>}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] text-inkmut">Освоено карточек: <b className="text-ink">{masteredAdd(ad, 'count')}</b></p>
          </div>
        </div>
      )}

      {stage === 'end' && (
        <AddEndScreen
          title="Раунд счёта завершён"
          correct={correct}
          score={score}
          bestStreak={bestStreak}
          passed={Math.round((correct / ADD_SESSION) * 100) >= ADD_PASS_ACC}
          alreadyDone={alreadyDone}
          onRetry={restart}
          onClose={onClose}
        />
      )}
    </div>
  );
}

/* ================= 2. Умные интервалы ================= */

export function AdditionSmartTrainer({ onPass, alreadyDone, onClose }: { onPass: () => void; alreadyDone: boolean; onClose: () => void }) {
  const { me } = useStore();
  const reduced = useReducedMotion();
  const studentId = me?.id ?? 'guest';

  const [ad, setAd] = useState<AdditionData>(() => loadAdd(studentId));
  const [cur, setCur] = useState<AddExample | null>(null);
  const [val, setVal] = useState('');
  const [qNum, setQNum] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const [isReview, setIsReview] = useState(false);
  const [shake, setShake] = useState(false);
  const [stage, setStage] = useState<'play' | 'end'>('play');
  const [toast, setToast] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ask = (d: AdditionData) => {
    const ex = weightedCountProblem(d, d.count.unlocked);
    const t = d.count.due[addKey(ex.a, ex.b)];
    setIsReview(t !== undefined && t <= Date.now());
    setCur(ex);
    setVal('');
    setFb(null);
    window.setTimeout(() => inputRef.current?.focus(), 40);
  };

  useEffect(() => {
    ask(loadAdd(studentId));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (toastRef.current) clearTimeout(toastRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => {
    if (stage !== 'play' || !cur || fb) return;
    const v = parseInt(val, 10);
    if (Number.isNaN(v)) {
      setShake(true);
      setTimeout(() => setShake(false), 380);
      return;
    }
    const ok = v === cur.ans;
    const nextQ = qNum + 1;
    const nextStreak = ok ? streak + 1 : 0;
    const nextCorrect = correct + (ok ? 1 : 0);
    const nextScore = score + (ok ? 10 + Math.min(streak, 10) : 0);

    setQNum(nextQ);
    setStreak(nextStreak);
    setBestStreak(Math.max(bestStreak, nextStreak));
    setCorrect(nextCorrect);
    setScore(nextScore);

    const { next, unlockedNew } = registerAdd(ad, 'count', cur.a, cur.b, ok, cur.level);
    setAd(next);
    saveAdd(studentId, next);
    const newBox = next.count.boxes[addKey(cur.a, cur.b)] ?? 1;
    setFb(ok ? { ok: true, text: `Верно! Повтор через ${INTERVAL_LABELS[newBox]}` } : { ok: false, text: `Правильно: ${cur.ans}. Вернёмся через 20 с.` });
    beep(ok ? 'ok' : 'no');
    if (unlockedNew) {
      beep('unlock');
      setToast(`Открыт уровень ${unlockedNew}!`);
      if (toastRef.current) clearTimeout(toastRef.current);
      toastRef.current = setTimeout(() => setToast(null), 2600);
    }

    timerRef.current = setTimeout(() => {
      if (nextQ >= ADD_SESSION) {
        const acc = Math.round((nextCorrect / ADD_SESSION) * 100);
        setStage('end');
        if (acc >= ADD_PASS_ACC) {
          beep('win');
          if (!reduced) confettiBurst();
          onPass();
        }
      } else ask(next);
    }, ok ? 800 : 1600);
  };

  const restart = () => {
    setQNum(0);
    setScore(0);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
    setFb(null);
    setVal('');
    setStage('play');
    ask(ad);
  };

  const nowTs = Date.now();
  const dueNow = Object.values(ad.count.due).filter((t) => t <= nowTs).length;
  const scheduled = Object.values(ad.count.due).filter((t) => t > nowTs).length;
  const dueList = Object.entries(ad.count.due)
    .filter(([, t]) => t > nowTs)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 4);

  return (
    <div className="relative rounded-xl border border-line bg-paper p-5 sm:p-6">
      {toast && (
        <div className="pop-in absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-pine-900 px-4 py-2.5 text-[13px] font-bold text-paper shadow-xl">
          <span className="mr-1.5">🔓</span>
          {toast}
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-[11px] tracking-[0.22em] text-[#b05f1e]">ТРЕНИРОВКА СЛОЖЕНИЯ · УМНЫЕ ИНТЕРВАЛЫ</p>
        <div className="flex items-center gap-2.5">
          {stage === 'play' && (
            <span className="text-[12.5px] font-bold uppercase tracking-[0.12em] text-inksoft">
              карточка {Math.min(qNum + 1, ADD_SESSION)} / {ADD_SESSION}
            </span>
          )}
          <AddSoundToggle />
        </div>
      </div>

      {stage === 'play' && cur && (
        <div className="grid gap-5 md:grid-cols-[1fr_250px] items-start">
          <div>
            <div className="rounded-xl border border-line border-l-8 bg-card p-6 sm:p-7" style={{ borderLeftColor: '#2fa8dc' }}>
              {isReview && (
                <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-sky/12 px-2.5 py-1 text-[11px] font-bold text-sky">⏰ повтор по расписанию</p>
              )}
              <div className="flex flex-wrap items-baseline gap-3.5">
                <span className="font-display font-900 text-4xl sm:text-5xl tracking-tight text-ink">
                  {cur.a} + {cur.b} =
                </span>
                <input
                  ref={inputRef}
                  value={val}
                  disabled={fb !== null}
                  onChange={(e) => setVal(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label="Ответ"
                  className={`w-[3ch] border-b-[5px] border-dashed bg-transparent text-center font-display font-900 text-4xl sm:text-5xl text-ink outline-none transition-colors ${
                    shake ? 'shake border-coral' : 'border-ink/25 focus:border-sky'
                  }`}
                />
              </div>
              <p className={`mt-3.5 min-h-[24px] text-[14px] font-bold ${fb === null ? 'text-inkmut' : fb.ok ? 'text-mint' : 'text-coral'}`}>
                {fb === null ? 'Введи ответ и нажми Enter' : fb.text}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-[12px] text-inkmut">
                <span className="mr-1">коробка:</span>
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className="h-3.5 w-3.5 rounded-[4px] transition-colors" style={{ background: i <= Math.max(1, cur.box) ? '#2fa8dc' : '#e3e7ef' }} />
                ))}
                <span className="ml-2">интервал: {INTERVAL_LABELS[Math.max(1, cur.box)]}</span>
              </div>
              <button
                onClick={submit}
                disabled={fb !== null}
                className="mt-5 rounded-xl bg-ink px-7 py-3 font-display text-[14px] font-700 text-paper transition-all hover:-translate-y-0.5 hover:bg-pine-700 disabled:opacity-40"
              >
                Ответить
              </button>
            </div>
            <p className="mt-4 text-[12px] text-inkmut leading-relaxed">
              Карточка возвращается ровно тогда, когда её пора повторить: 20 с → 1 мин → 5 мин → 30 мин → освоена.
              Так пример переходит в долговременную память.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-card p-4">
            <p className="font-display text-[11px] font-700 text-ink mb-3">РАСПИСАНИЕ ПОВТОРОВ</p>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-lg bg-sky/10 px-3 py-2.5 text-center">
                <p className="font-display font-900 text-xl text-sky">{dueNow}</p>
                <p className="text-[10.5px] text-inksoft">созрело сейчас</p>
              </div>
              <div className="rounded-lg bg-gold/10 px-3 py-2.5 text-center">
                <p className="font-display font-900 text-xl text-[#9c7508]">{scheduled}</p>
                <p className="text-[10.5px] text-inksoft">запланировано</p>
              </div>
            </div>
            <p className="mt-4 text-[10.5px] font-bold uppercase tracking-[0.14em] text-inkmut">ближайшие повторы</p>
            <ul className="mt-2 space-y-1.5">
              {dueList.length === 0 && <li className="text-[12px] text-inkmut">Пока пусто — отвечай, карточки встанут в очередь.</li>}
              {dueList.map(([k, t]) => (
                <li key={k} className="flex items-center justify-between rounded-md bg-paper px-3 py-1.5 text-[12.5px]">
                  <span className="font-display font-700 text-ink">{k.replace('+', ' + ')}</span>
                  <span className="text-inksoft">через {dueLabel(t - nowTs)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {stage === 'end' && (
        <AddEndScreen
          title="Сессия повторений окончена"
          correct={correct}
          score={score}
          bestStreak={bestStreak}
          passed={Math.round((correct / ADD_SESSION) * 100) >= ADD_PASS_ACC}
          alreadyDone={alreadyDone}
          onRetry={restart}
          onClose={onClose}
        />
      )}
    </div>
  );
}

/* ================= 3. Космолёт: двузначные ================= */

const ADD_PLANET_COLORS = ['#ff8fab', '#ffd166', '#8ac926', '#4cc9f0', '#b388eb', '#ff924c', '#6ee7b7', '#f9c74f'];
const ADD_FONT_HUD = "'Russo One', sans-serif";

interface AddVn {
  a: number;
  b: number;
  ans: number;
  isTrue: boolean;
  shown: number;
  level: number;
}

export function AdditionCosmosTrainer({ onPass, alreadyDone, onClose }: { onPass: () => void; alreadyDone: boolean; onClose: () => void }) {
  const { me } = useStore();
  const reduced = useReducedMotion();
  const studentId = me?.id ?? 'guest';

  const [ad, setAd] = useState<AdditionData>(() => loadAdd(studentId));
  const [cur, setCur] = useState<AddVn | null>(null);
  const [qNum, setQNum] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const [spd, setSpd] = useState('');
  const [fpt, setFpt] = useState<{ id: number; pts: number } | null>(null);
  const [stage, setStage] = useState<'play' | 'end'>('play');
  const [toast, setToast] = useState<string | null>(null);

  const queueRef = useRef<{ a: number; b: number; level: number }[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fptRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerRef = useRef<(v: boolean) => void>(() => undefined);

  const starfield = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() > 0.8 ? 3 : 2,
        dur: 2 + Math.random() * 4,
        del: Math.random() * 3,
      })),
    [],
  );

  const makeProblem = (d: AdditionData): AddVn => {
    let a: number;
    let b: number;
    let level = d.cosmos.unlocked;
    if (queueRef.current.length && Math.random() < 0.65) {
      const p = queueRef.current.shift() as { a: number; b: number; level: number };
      a = p.a;
      b = p.b;
      level = p.level;
    } else {
      const p = cosmosPair(level);
      a = p.a;
      b = p.b;
    }
    const ans = a + b;
    const isTrue = Math.random() < 0.5;
    return { a, b, ans, isTrue, shown: isTrue ? ans : corruptAdd(a, b), level };
  };

  useEffect(() => {
    setCur(makeProblem(loadAdd(studentId)));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (toastRef.current) clearTimeout(toastRef.current);
      if (fptRef.current) clearTimeout(fptRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answer = (v: boolean) => {
    if (stage !== 'play' || !cur || fb) return;
    const ok = v === cur.isTrue;
    const nextQ = qNum + 1;
    const nextStreak = ok ? streak + 1 : 0;
    const nextBest = Math.max(bestStreak, nextStreak);
    const nextCorrect = correct + (ok ? 1 : 0);
    const pts = ok ? 10 + Math.min(streak, 10) : 0;
    const nextScore = score + pts;

    setQNum(nextQ);
    setStreak(nextStreak);
    setBestStreak(nextBest);
    setCorrect(nextCorrect);
    setScore(nextScore);

    if (ok) {
      setFpt({ id: Date.now(), pts });
      if (fptRef.current) clearTimeout(fptRef.current);
      fptRef.current = setTimeout(() => setFpt(null), 900);
      setSpd(`СЕРИЯ ×${nextStreak}`);
      setFb({ ok: true, text: nextStreak >= 3 ? `ТЯГА ×${nextStreak}!` : 'Подтверждено!' });
    } else {
      queueRef.current.push({ a: cur.a, b: cur.b, level: cur.level });
      setSpd('');
      setFb({ ok: false, text: `Бортовой компьютер: ${cur.a} + ${cur.b} = ${cur.ans}` });
    }
    beep(ok ? 'ok' : 'no');

    const { next, unlockedNew } = registerAdd(ad, 'cosmos', cur.a, cur.b, ok, cur.level);
    setAd(next);
    saveAdd(studentId, next);
    if (unlockedNew) {
      beep('unlock');
      setToast(`Новая планета: уровень ${unlockedNew}!`);
      if (toastRef.current) clearTimeout(toastRef.current);
      toastRef.current = setTimeout(() => setToast(null), 2600);
    }

    timerRef.current = setTimeout(() => {
      if (nextQ >= ADD_SESSION) {
        const acc = Math.round((nextCorrect / ADD_SESSION) * 100);
        setStage('end');
        if (acc >= ADD_PASS_ACC) {
          beep('win');
          if (!reduced) confettiBurst(ADD_PLANET_COLORS);
          onPass();
        }
      } else {
        setFb(null);
        setCur(makeProblem(next));
      }
    }, ok ? 950 : 1800);
  };

  answerRef.current = answer;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'ArrowRight' || e.key === '1') answerRef.current(true);
      else if (e.key === 'ArrowLeft' || e.key === '2') answerRef.current(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const restart = () => {
    queueRef.current = [];
    setQNum(0);
    setScore(0);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
    setFb(null);
    setSpd('');
    setFpt(null);
    setStage('play');
    setCur(makeProblem(ad));
  };

  const rocketBottom = 4 + (qNum / ADD_SESSION) * 90;
  const boost = streak >= 3;

  return (
    <div
      className="relative overflow-hidden rounded-[18px] border border-[rgba(76,201,240,.35)]"
      style={{
        background:
          'radial-gradient(1200px 600px at 80% -10%,rgba(59,84,165,.5),transparent 60%),radial-gradient(900px 500px at 8% 108%,rgba(94,45,140,.4),transparent 60%),#070b1e',
        fontFamily: "'Exo 2', sans-serif",
        color: '#eaf6ff',
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {starfield.map((s) => (
          <i key={s.id} className="cosmos-star" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDuration: `${s.dur}s`, animationDelay: `${s.del}s` }} />
        ))}
      </div>

      {toast && (
        <div className="pop-in absolute left-1/2 top-3 z-20 -translate-x-1/2 whitespace-nowrap rounded-xl border-2 border-[rgba(76,201,240,.5)] bg-[#0d1435] px-4 py-2.5 text-[14px] font-bold shadow-xl">
          <span className="mr-1.5">🪐</span>
          {toast}
        </div>
      )}

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 pt-5 sm:px-8">
        <p style={{ fontFamily: ADD_FONT_HUD }} className="text-[13px] tracking-[0.16em] text-[#8fd6ff]">
          КОСМОЛЁТ · СЛОЖЕНИЕ · {Math.min(qNum + 1, ADD_SESSION)} / {ADD_SESSION}
        </p>
        <div className="order-first w-full text-center sm:order-none sm:w-auto">
          <p style={{ fontFamily: ADD_FONT_HUD }} className="text-[15px] tracking-[0.1em] text-[#9fb4e8]">
            ВЫСОТА <b className="text-[22px] text-[#ffd166]">{score}</b>
          </p>
          <p style={{ fontFamily: ADD_FONT_HUD }} className="min-h-[20px] text-[14px] text-[#ff9d5c]">
            {spd}
          </p>
        </div>
        <span className="text-[13px] font-extrabold text-[#9fb4e8]">пилот {me?.name ?? 'Ученик'}</span>
      </div>

      {stage === 'play' && cur && (
        <div className="relative z-10 mx-auto grid max-w-[880px] items-center gap-6 px-6 py-6 sm:px-8 md:grid-cols-[130px_1fr]">
          <aside className="relative hidden h-[46vh] md:block">
            <span className="absolute bottom-0 left-1/2 top-0 w-[3px] -translate-x-1/2 rounded-full" style={{ background: 'linear-gradient(#ffd16633,#4cc9f066,#ffd16633)' }} />
            {ADD_PLANET_COLORS.map((col, i) => {
              const lvl = i + 1;
              const lit = lvl <= ad.cosmos.unlocked;
              const target = lvl === ad.cosmos.unlocked;
              return (
                <span
                  key={lvl}
                  className={`absolute left-1/2 h-5 w-5 -translate-x-1/2 rounded-full transition-all duration-500 ${target ? 'cosmos-target' : ''}`}
                  style={{
                    bottom: `${6 + i * (88 / 7)}%`,
                    background: col,
                    color: col,
                    opacity: lit ? 1 : 0.3,
                    boxShadow: lit && !target ? `0 0 14px 2px ${col}` : undefined,
                  }}
                >
                  <b className="absolute left-7 top-0.5 text-[10px] text-[#9fb4e8]" style={{ fontFamily: ADD_FONT_HUD }}>
                    У{lvl}
                  </b>
                </span>
              );
            })}
            <span
              className="absolute left-1/2 -translate-x-1/2 -rotate-45 text-[36px] transition-all duration-500"
              style={{ bottom: `${rocketBottom}%`, filter: boost ? 'drop-shadow(0 6px 14px #ff9d00)' : 'drop-shadow(0 0 6px #ff9d0088)' }}
            >
              🚀
            </span>
          </aside>

          <section
            className="relative rounded-[18px] border-2 px-6 py-7 text-center sm:px-8"
            style={{ background: 'rgba(13,20,53,.8)', borderColor: 'rgba(76,201,240,.35)', boxShadow: '0 0 40px rgba(76,201,240,.12), inset 0 0 30px rgba(76,201,240,.05)' }}
          >
            {fpt && (
              <span key={fpt.id} className="cosmos-fpt absolute right-5 top-2.5 text-[20px] text-[#7cfc90]" style={{ fontFamily: ADD_FONT_HUD }}>
                +{fpt.pts}
              </span>
            )}
            <p style={{ fontFamily: ADD_FONT_HUD }} className="text-[11px] tracking-[0.16em] text-[#6f86c2]">
              УРОВЕНЬ {cur.level} / {COSMOS_LEVELS}
            </p>
            <p className="mt-3 text-[clamp(28px,6vw,46px)] leading-tight" style={{ fontFamily: ADD_FONT_HUD, textShadow: '0 0 18px rgba(76,201,240,.5)' }}>
              {cur.a} + {cur.b} = <span className="text-[#ffd166]">{cur.shown}</span>
            </p>
            <p className="mb-1 mt-2 font-semibold text-[#9fb4e8]">Бортовой компьютер прав?</p>
            <p className={`min-h-[30px] font-extrabold ${fb ? (fb.ok ? 'text-[#7cfc90]' : 'text-[#ff8080]') : 'text-transparent'}`}>{fb ? fb.text : '·'}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => answer(true)}
                disabled={fb !== null}
                className="rounded-xl px-9 py-3 text-[20px] tracking-[0.06em] text-[#05260f] transition-all hover:-translate-y-[3px] active:translate-y-px disabled:opacity-50"
                style={{ fontFamily: ADD_FONT_HUD, background: '#22c55e', boxShadow: '0 0 22px rgba(34,197,94,.45)' }}
              >
                ВЕРНО
              </button>
              <button
                onClick={() => answer(false)}
                disabled={fb !== null}
                className="rounded-xl px-9 py-3 text-[20px] tracking-[0.06em] text-white transition-all hover:-translate-y-[3px] active:translate-y-px disabled:opacity-50"
                style={{ fontFamily: ADD_FONT_HUD, background: '#ef4444', boxShadow: '0 0 22px rgba(239,68,68,.4)' }}
              >
                НЕВЕРНО
              </button>
            </div>
            <p className="mt-3.5 text-[12px] text-[#6f86c2]">→ / 1 — верно · ← / 2 — неверно</p>
          </section>
        </div>
      )}

      {stage === 'end' && (
        <div className="relative z-10 px-6 py-4">
          <div className="mx-auto max-w-[440px] rounded-[18px] border-2 px-8 py-7 text-center" style={{ background: '#0d1435', borderColor: 'rgba(76,201,240,.5)', boxShadow: '0 30px 70px rgba(0,0,0,.6)' }}>
            <h4 className="text-[22px] tracking-[0.06em]" style={{ fontFamily: ADD_FONT_HUD }}>
              ПОЛЁТ ЗАВЕРШЁН
            </h4>
            <p className="mt-3 text-[15px]">
              Высота: <b>{score}</b> · верных: <b>{correct}</b> из {ADD_SESSION} · серия <b>{bestStreak}</b>
            </p>
            <p className="mt-2 text-[12.5px] text-[#9fb4e8]" style={{ fontFamily: "'Golos Text', sans-serif" }}>
              {Math.round((correct / ADD_SESSION) * 100) >= ADD_PASS_ACC
                ? alreadyDone
                  ? 'Урок уже был зачтён раньше — очки не начислены, прогресс сохранён.'
                  : 'Урок зачтён: +20 очков на счёт.'
                : `Для зачёта нужна точность ${ADD_PASS_ACC}% — попробуй ещё раз.`}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button onClick={restart} className="rounded-[10px] border-2 border-[#4cc9f0] px-6 py-2.5 text-[15px] tracking-[0.06em] transition-colors hover:bg-[rgba(76,201,240,.15)]" style={{ fontFamily: ADD_FONT_HUD }}>
                ЕЩЁ ПОЛЁТ
              </button>
              <button onClick={onClose} className="rounded-[10px] border-2 border-[#4cc9f0] px-6 py-2.5 text-[15px] tracking-[0.06em] transition-colors hover:bg-[rgba(76,201,240,.15)]" style={{ fontFamily: ADD_FONT_HUD }}>
                ЗАКРЫТЬ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
