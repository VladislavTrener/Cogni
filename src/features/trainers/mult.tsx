/**
 * «Школа умножения» — движок Лейтнера и три режима:
 * Тренажёр (интервалы), Тетрадь в клетку, Космополёт.
 * Порт оригинальных HTML-игр на Когнитив.Про.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';
import { beep, confettiBurst, isSoundOn, setSound, useReducedMotion } from '../../components';

/* ================= движок ================= */

export const COL_MIN = 2;
export const COL_MAX = 11;
export const THRESHOLD = 10;
export const SESSION = 20;
export const PASS_ACC = 70;

export interface MultExample {
  a: number;
  b: number;
  ans: number;
  box: number;
}

export interface BadgeDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
}

export const BADGES: BadgeDef[] = [
  { id: 'first_flight', icon: '🚀', name: 'Первый полёт', desc: 'Завершить первый раунд' },
  { id: 'hundred', icon: '💯', name: 'Сотня', desc: '100 верных ответов' },
  { id: 'flawless', icon: '🎖️', name: 'Без ошибок', desc: 'Раунд без единой ошибки' },
  { id: 'streak20', icon: '🔥', name: 'Серия 20', desc: '20 верных подряд' },
  { id: 'column11', icon: '🪐', name: 'Столбик ×11', desc: 'Открыт последний столбик' },
  { id: 'all100', icon: '👑', name: 'Таблица освоена', desc: 'Все карточки в коробках 4–5' },
];

const RANKS: [number, string][] = [
  [0, 'Ученик'],
  [100, 'Знаток'],
  [300, 'Мастер'],
  [600, 'Гроссмейстер таблицы'],
  [1000, 'Легенда счёта'],
];

export interface MultData {
  player: { name: string; created: number };
  unlocked: number;
  colProgress: Record<number, number>;
  boxes: Record<string, number>;
  totals: { solved: number; correct: number; bestStreak: number; sessions: number };
  records: { score: number; acc: number; streak: number; name: string; date: number }[];
  badges: string[];
}

const key = (a: number, b: number) => `${a}×${b}`;
export const cols = () => Array.from({ length: COL_MAX - COL_MIN + 1 }, (_, i) => COL_MIN + i);

const blank = (name: string): MultData => ({
  player: { name, created: Date.now() },
  unlocked: COL_MIN,
  colProgress: {},
  boxes: {},
  totals: { solved: 0, correct: 0, bestStreak: 0, sessions: 0 },
  records: [],
  badges: [],
});

const storeKey = (studentId: string) => `kognitiv-mult-v1-${studentId}`;

export function loadMult(studentId: string): MultData {
  try {
    const raw = localStorage.getItem(storeKey(studentId));
    if (raw) return { ...blank('Ученик'), ...(JSON.parse(raw) as MultData) };
  } catch {
    /* noop */
  }
  return blank('Ученик');
}

export function saveMult(studentId: string, md: MultData) {
  try {
    localStorage.setItem(storeKey(studentId), JSON.stringify(md));
  } catch {
    /* noop */
  }
}

const randInt = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));

export function corrupt(a: number, b: number): number {
  const real = a * b;
  const opts: number[] = [];
  [1, -1, 2, -2, 10, -10, a, -a, b, -b].forEach((v) => {
    const c = real + v;
    if (c > 0 && c !== real) opts.push(c);
  });
  const s = String(real);
  if (s.length === 2) {
    const sw = +(s[1] + s[0]);
    if (sw !== real) opts.push(sw);
  }
  return opts[randInt(0, opts.length - 1)];
}

export const boxOf = (md: MultData, a: number, b: number) => md.boxes[key(a, b)] ?? 0;

export function newExample(md: MultData): MultExample {
  const u = md.unlocked;
  let a: number;
  let b: number;
  if (Math.random() < 0.5) {
    a = u;
    b = randInt(COL_MIN, u);
  } else {
    a = randInt(COL_MIN, u);
    b = randInt(COL_MIN, u);
  }
  if (Math.random() < 0.5) {
    const t = a;
    a = b;
    b = t;
  }
  return { a, b, ans: a * b, box: boxOf(md, a, b) };
}

export function weightedExample(md: MultData): MultExample {
  const list: (MultExample & { w: number })[] = [];
  for (let a = COL_MIN; a <= md.unlocked; a++) {
    for (let b = COL_MIN; b <= md.unlocked; b++) {
      const box = boxOf(md, a, b);
      list.push({ a, b, ans: a * b, box, w: [4, 4, 3, 2, 1, 1][box] });
    }
  }
  let total = 0;
  for (const x of list) total += x.w;
  let r = Math.random() * total;
  for (const x of list) {
    r -= x.w;
    if (r <= 0) return x;
  }
  return list[list.length - 1];
}

export const cardCount = (md: MultData) => (md.unlocked - COL_MIN + 1) ** 2;

export function masteredCount(md: MultData) {
  let n = 0;
  for (let a = COL_MIN; a <= md.unlocked; a++) {
    for (let b = COL_MIN; b <= md.unlocked; b++) {
      if (boxOf(md, a, b) >= 4) n++;
    }
  }
  return n;
}

function allMastered(md: MultData) {
  for (let a = COL_MIN; a <= COL_MAX; a++) {
    for (let b = COL_MIN; b <= COL_MAX; b++) {
      if (boxOf(md, a, b) < 4) return false;
    }
  }
  return true;
}

export function registerAnswer(md: MultData, a: number, b: number, ok: boolean): { next: MultData; unlockedNew: number | null } {
  const next: MultData = JSON.parse(JSON.stringify(md)) as MultData;
  next.totals.solved++;
  let unlockedNew: number | null = null;
  if (ok) {
    next.totals.correct++;
    const c = Math.max(a, b);
    next.colProgress[c] = (next.colProgress[c] ?? 0) + 1;
    if (c === next.unlocked && next.colProgress[c] >= THRESHOLD && next.unlocked < COL_MAX) {
      next.unlocked++;
      unlockedNew = next.unlocked;
      if (next.unlocked === COL_MAX && !next.badges.includes('column11')) next.badges.push('column11');
    }
    next.boxes[key(a, b)] = Math.min(5, (next.boxes[key(a, b)] ?? 1) + 1);
  } else {
    next.boxes[key(a, b)] = 1;
  }
  return { next, unlockedNew };
}

export function finishSession(
  md: MultData,
  playerName: string,
  st: { score: number; acc: number; bestStreak: number; errors: number },
): { next: MultData; stars: number; newBadges: BadgeDef[]; rank: number } {
  const next: MultData = JSON.parse(JSON.stringify(md)) as MultData;
  next.player.name = playerName || 'Ученик';
  next.totals.sessions++;
  next.totals.bestStreak = Math.max(next.totals.bestStreak, st.bestStreak);
  const newBadges: BadgeDef[] = [];
  const award = (id: string) => {
    if (!next.badges.includes(id)) {
      next.badges.push(id);
      const def = BADGES.find((b) => b.id === id);
      if (def) newBadges.push(def);
    }
  };
  award('first_flight');
  if (st.errors === 0) award('flawless');
  if (st.bestStreak >= 20) award('streak20');
  if (next.totals.correct >= 100) award('hundred');
  if (allMastered(next)) award('all100');

  const entry = { score: st.score, acc: st.acc, streak: st.bestStreak, name: next.player.name, date: Date.now() };
  const list = [...next.records, entry].sort((x, y) => y.score - x.score);
  next.records = list.slice(0, 5);
  const idx = next.records.indexOf(entry);
  const rank = idx >= 0 && idx < 5 ? idx + 1 : 0;
  const stars = st.acc >= 95 ? 3 : st.acc >= 85 ? 2 : st.acc >= 70 ? 1 : 0;
  return { next, stars, newBadges, rank };
}

export const rankOf = (total: number) => {
  let name = RANKS[0][1];
  for (const [t, n] of RANKS) if (total >= t) name = n;
  return name;
};

/* ================= общие куски UI ================= */

function SoundToggle({ className = '' }: { className?: string }) {
  const [sound, setSoundUi] = useState(isSoundOn());
  return (
    <button
      onClick={() => {
        const on = !sound;
        setSound(on);
        setSoundUi(on);
        if (on) beep('ok');
      }}
      className={`rounded-md border border-line bg-card px-2.5 py-1.5 text-[14px] transition-colors hover:border-ink/30 ${className}`}
      aria-label={sound ? 'Выключить звук' : 'Включить звук'}
    >
      {sound ? '🔊' : '🔇'}
    </button>
  );
}

function UnlockToast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="pop-in absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-pine-900 px-4 py-2.5 text-[13px] font-bold text-paper shadow-xl">
      <span className="mr-1.5">🔓</span>
      {text}
    </div>
  );
}

function BadgeChips({ badges }: { badges: BadgeDef[] }) {
  if (badges.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-2">
      {badges.map((b) => (
        <span key={b.id} className="pop-in rounded-full bg-gold/14 px-3.5 py-1.5 text-[12px] font-bold text-[#8a6606]" title={b.desc}>
          <span className="mr-1">{b.icon}</span>
          {b.name}
        </span>
      ))}
    </div>
  );
}

/* ================= 1. Тренажёр: интервалы ================= */

const BOX_FILL = ['#d7dbe2', '#e35d5d', '#ef8f4f', '#f2c14e', '#9ccc65', '#4caf50'];
const BOX_BORDER = ['#d7dbe2', '#e35d5d', '#e35d5d', '#f2c14e', '#4caf50', '#4caf50'];

export function MultLeitnerTrainer({ onPass, alreadyDone, onClose }: { onPass: () => void; alreadyDone: boolean; onClose: () => void }) {
  const { me } = useStore();
  const reduced = useReducedMotion();
  const studentId = me?.id ?? 'guest';

  const [d, setD] = useState<MultData>(() => loadMult(studentId));
  const [cur, setCur] = useState<MultExample | null>(null);
  const [val, setVal] = useState('');
  const [qNum, setQNum] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [errors, setErrors] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const [shake, setShake] = useState(false);
  const [stage, setStage] = useState<'play' | 'end'>('play');
  const [end, setEnd] = useState<{ stars: number; rank: number; newBadges: BadgeDef[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ask = (md: MultData) => {
    setCur(weightedExample(md));
    setVal('');
    setFb(null);
    window.setTimeout(() => inputRef.current?.focus(), 40);
  };

  useEffect(() => {
    ask(loadMult(studentId));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (toastRef.current) clearTimeout(toastRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endSession = (md: MultData, corr: number, sc: number, bs: number, errs: number) => {
    const acc = Math.round((corr / SESSION) * 100);
    const { next, stars, newBadges, rank } = finishSession(md, me?.name ?? 'Ученик', { score: sc, acc, bestStreak: bs, errors: errs });
    setD(next);
    saveMult(studentId, next);
    setEnd({ stars, rank, newBadges });
    setStage('end');
    if (rank > 0) {
      beep('win');
      if (!reduced) confettiBurst();
    }
    if (acc >= PASS_ACC) onPass();
  };

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
    const nextBest = Math.max(bestStreak, nextStreak);
    const nextCorrect = correct + (ok ? 1 : 0);
    const nextScore = score + (ok ? 10 + Math.min(streak, 10) : 0);
    const nextErrors = errors + (ok ? 0 : 1);

    setQNum(nextQ);
    setStreak(nextStreak);
    setBestStreak(nextBest);
    setCorrect(nextCorrect);
    setScore(nextScore);
    setErrors(nextErrors);

    const { next, unlockedNew } = registerAnswer(d, cur.a, cur.b, ok);
    setD(next);
    saveMult(studentId, next);
    setFb(ok ? { ok: true, text: `Верно! Карточка поднялась в коробку ${Math.min(5, cur.box + 1)}` } : { ok: false, text: `Правильно: ${cur.ans}. Карточка вернулась в коробку 1` });
    beep(ok ? 'ok' : 'no');
    if (unlockedNew) {
      beep('unlock');
      setToast(`Открыт столбик ×${unlockedNew} — новые карточки!`);
      if (toastRef.current) clearTimeout(toastRef.current);
      toastRef.current = setTimeout(() => setToast(null), 2600);
    }

    timerRef.current = setTimeout(() => {
      if (nextQ >= SESSION) endSession(next, nextCorrect, nextScore, nextBest, nextErrors);
      else ask(next);
    }, ok ? 900 : 1700);
  };

  const restart = () => {
    setQNum(0);
    setScore(0);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
    setErrors(0);
    setEnd(null);
    setStage('play');
    ask(d);
  };

  const mastered = masteredCount(d);
  const total = cardCount(d);
  const gridCols = cols();

  return (
    <div className="relative rounded-xl border border-line bg-paper p-5 sm:p-6">
      <UnlockToast text={toast} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-[11px] tracking-[0.22em] text-[#b05f1e]">УМНЫЙ ТРЕНАЖЁР · ИНТЕРВАЛЫ</p>
        <div className="flex items-center gap-2.5">
          {stage === 'play' && (
            <span className="text-[12.5px] font-bold uppercase tracking-[0.12em] text-inksoft">
              карточка {Math.min(qNum + 1, SESSION)} / {SESSION}
            </span>
          )}
          <SoundToggle />
        </div>
      </div>

      {stage === 'play' && cur && (
        <div className="grid gap-5 md:grid-cols-[1fr_280px] items-start">
          <div>
            <div className="rounded-xl border border-line border-l-8 bg-card p-6 sm:p-7 transition-colors" style={{ borderLeftColor: BOX_BORDER[Math.min(cur.box, 5)] }}>
              <div className="flex flex-wrap items-baseline gap-3.5">
                <span className="font-display font-900 text-4xl sm:text-5xl tracking-tight text-ink">
                  {cur.a} × {cur.b} =
                </span>
                <input
                  ref={inputRef}
                  value={val}
                  disabled={fb !== null}
                  onChange={(e) => setVal(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label="Ответ"
                  className={`w-[4.5ch] border-b-[5px] border-dashed bg-transparent text-center font-display font-900 text-4xl sm:text-5xl text-ink outline-none transition-colors ${
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
                  <span key={i} className="h-3.5 w-3.5 rounded-[4px] transition-colors" style={{ background: i <= Math.max(1, cur.box) ? '#4361ee' : '#e3e7ef' }} />
                ))}
              </div>
              <button
                onClick={submit}
                disabled={fb !== null}
                className="mt-5 rounded-xl bg-ink px-7 py-3 font-display text-[14px] font-700 text-paper transition-all hover:-translate-y-0.5 hover:bg-pine-700 disabled:opacity-40"
              >
                Ответить
              </button>
            </div>

            <div className="mt-5">
              <p className="text-[13px] font-semibold text-inksoft">
                Освоено карточек: <b className="text-ink">{mastered}</b> из {total}
              </p>
              <span className="mt-1.5 block h-2.5 w-full overflow-hidden rounded-full bg-ink/8">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${total === 0 ? 0 : (mastered / total) * 100}%`, background: 'linear-gradient(90deg,#f2c14e,#4caf50)', transition: 'width 0.6s ease' }}
                />
              </span>
              <p className="mt-2 text-[12px] text-inkmut">
                {d.unlocked < COL_MAX
                  ? `Открыты столбики до ×${d.unlocked}. ${THRESHOLD} верных на столбик — откроется ×${d.unlocked + 1}.`
                  : 'Открыта вся таблица — доводи карточки до коробки 5.'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-card p-5">
            <p className="font-display text-[12px] font-700 text-ink mb-3">Карта таблицы</p>
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${gridCols.length + 1}, minmax(0, 1fr))` }}>
              <span className="flex aspect-square items-center justify-center text-[9px] font-bold text-inkmut">×</span>
              {gridCols.map((c) => (
                <span key={`h-${c}`} className="flex aspect-square items-center justify-center text-[9px] font-bold text-inkmut">
                  {c}
                </span>
              ))}
              {gridCols.map((r) => (
                <React.Fragment key={`r-${r}`}>
                  <span className="flex aspect-square items-center justify-center text-[9px] font-bold text-inkmut">{r}</span>
                  {gridCols.map((c) => {
                    const locked = Math.max(r, c) > d.unlocked;
                    const box = boxOf(d, r, c);
                    return (
                      <span
                        key={`c-${r}-${c}`}
                        title={`${r} × ${c}${locked ? ' · закрыто' : box ? ` · коробка ${box}` : ' · новая'}`}
                        className="aspect-square rounded-[4px] transition-colors duration-300"
                        style={{ background: locked ? 'repeating-linear-gradient(135deg,#e8ebf2 0 4px,transparent 4px 8px)' : BOX_FILL[box] }}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-3.5 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[10.5px] text-inkmut">
              <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: '#d7dbe2' }} />новая</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: '#e35d5d' }} />сложная</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: '#f2c14e' }} />почти</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: '#4caf50' }} />освоена</span>
            </div>
          </div>
        </div>
      )}

      {stage === 'end' && end && (
        <div className="py-2 text-center">
          <h4 className="font-display font-900 text-2xl text-ink">Тренировка окончена</h4>
          <p className="mt-2 font-display text-[32px] tracking-[6px] text-[#e8a20c] leading-none">
            {'★'.repeat(end.stars)}
            <span className="text-ink/15">{'★'.repeat(3 - end.stars)}</span>
          </p>
          <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { l: 'верных', v: `${correct} из ${SESSION}` },
              { l: 'очки', v: String(score) },
              { l: 'лучшая серия', v: String(bestStreak) },
              { l: 'звание', v: rankOf(d.totals.correct) },
            ].map((s) => (
              <div key={s.l} className="rounded-lg border border-line bg-card px-2 py-3">
                <p className="font-display font-900 text-[15px] text-ink">{s.v}</p>
                <p className="text-[11px] text-inkmut mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[14px] text-inksoft">
            {end.rank > 0 ? (
              <>
                <span className="mr-1">🏆</span>Новое место на Доске почёта: <b className="text-ink">{end.rank}</b>!
              </>
            ) : (
              'Рекорд Доски почёта пока впереди!'
            )}
          </p>
          <p className="mt-1.5 text-[12.5px] text-inkmut">
            {alreadyDone ? 'Урок уже был зачтён раньше — очки за него не начислены, прогресс сохранён.' : 'Урок зачтён: +20 очков на счёт.'}
          </p>
          <BadgeChips badges={end.newBadges} />
          <div className="mt-7 flex justify-center gap-3">
            <button onClick={restart} className="rounded-lg border border-ink/15 px-5 py-2.5 text-[13.5px] font-bold text-ink transition-colors hover:border-ink/40">
              Ещё тренировка
            </button>
            <button onClick={onClose} className="rounded-lg bg-pine-900 px-5 py-2.5 text-[13.5px] font-bold text-paper transition-colors hover:bg-pine-700">
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= 2. Тетрадь в клетку ================= */

const PRAISE = ['Молодец!', 'Отлично!', 'Так держать!', 'Умница!', 'Точно!'];
const BLOB = '255px 15px 225px 15px / 15px 225px 15px 255px';
const BLOB_CARD = '255px 25px 225px 25px / 25px 225px 25px 255px';
const MARK_RING = '48% 52% 55% 45% / 50% 46% 54% 50%';

interface VnProblem {
  a: number;
  b: number;
  ans: number;
  isTrue: boolean;
  shown: number;
}

function makeVnProblem(md: MultData, queue: { a: number; b: number }[]): VnProblem {
  let a: number;
  let b: number;
  if (queue.length && Math.random() < 0.65) {
    const p = queue.shift() as { a: number; b: number };
    a = p.a;
    b = p.b;
  } else {
    const e = newExample(md);
    a = e.a;
    b = e.b;
  }
  const ans = a * b;
  const isTrue = Math.random() < 0.5;
  return { a, b, ans, isTrue, shown: isTrue ? ans : corrupt(a, b) };
}

export function MultNotebookTrainer({ onPass, alreadyDone, onClose }: { onPass: () => void; alreadyDone: boolean; onClose: () => void }) {
  const { me } = useStore();
  const reduced = useReducedMotion();
  const studentId = me?.id ?? 'guest';

  const [d, setD] = useState<MultData>(() => loadMult(studentId));
  const [cur, setCur] = useState<VnProblem | null>(null);
  const [qNum, setQNum] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [errors, setErrors] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const [stage, setStage] = useState<'play' | 'end'>('play');
  const [end, setEnd] = useState<{ stars: number; rank: number; newBadges: BadgeDef[]; mark: string; acc: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const queueRef = useRef<{ a: number; b: number }[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerRef = useRef<(v: boolean) => void>(() => undefined);

  useEffect(() => {
    setCur(makeVnProblem(loadMult(studentId), queueRef.current));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (toastRef.current) clearTimeout(toastRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endSession = (md: MultData, corr: number, sc: number, bs: number, errs: number) => {
    const acc = Math.round((corr / SESSION) * 100);
    const { next, stars, newBadges, rank } = finishSession(md, me?.name ?? 'Ученик', { score: sc, acc, bestStreak: bs, errors: errs });
    setD(next);
    saveMult(studentId, next);
    setEnd({ stars, rank, newBadges, acc, mark: acc >= 90 ? '5' : acc >= 70 ? '4' : acc >= 50 ? '3' : '2' });
    setStage('end');
    if (rank > 0) {
      beep('win');
      if (!reduced) confettiBurst();
    }
    if (acc >= PASS_ACC) onPass();
  };

  const answer = (v: boolean) => {
    if (stage !== 'play' || !cur || fb) return;
    const ok = v === cur.isTrue;
    const nextQ = qNum + 1;
    const nextStreak = ok ? streak + 1 : 0;
    const nextBest = Math.max(bestStreak, nextStreak);
    const nextCorrect = correct + (ok ? 1 : 0);
    const nextScore = score + (ok ? 10 + Math.min(streak, 10) : 0);
    const nextErrors = errors + (ok ? 0 : 1);

    setQNum(nextQ);
    setStreak(nextStreak);
    setBestStreak(nextBest);
    setCorrect(nextCorrect);
    setScore(nextScore);
    setErrors(nextErrors);
    if (!ok) queueRef.current.push({ a: cur.a, b: cur.b });

    const { next, unlockedNew } = registerAnswer(d, cur.a, cur.b, ok);
    setD(next);
    saveMult(studentId, next);
    setFb(ok ? { ok: true, text: PRAISE[randInt(0, PRAISE.length - 1)] } : { ok: false, text: `На самом деле: ${cur.a} × ${cur.b} = ${cur.ans}` });
    beep(ok ? 'ok' : 'no');
    if (unlockedNew) {
      beep('unlock');
      setToast(`Открыт столбик ×${unlockedNew}!`);
      if (toastRef.current) clearTimeout(toastRef.current);
      toastRef.current = setTimeout(() => setToast(null), 2600);
    }

    timerRef.current = setTimeout(() => {
      if (nextQ >= SESSION) endSession(next, nextCorrect, nextScore, nextBest, nextErrors);
      else {
        setFb(null);
        setCur(makeVnProblem(next, queueRef.current));
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
    setErrors(0);
    setFb(null);
    setEnd(null);
    setStage('play');
    setCur(makeVnProblem(d, queueRef.current));
  };

  const gridCols = cols();

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-line"
      style={{
        backgroundColor: '#fbf7ea',
        backgroundImage:
          'linear-gradient(rgba(150,180,215,.28) 1px,transparent 1px),linear-gradient(90deg,rgba(150,180,215,.28) 1px,transparent 1px)',
        backgroundSize: '26px 26px',
        fontFamily: "'Neucha', cursive",
        color: '#2b3a67',
      }}
    >
      <span className="pointer-events-none absolute bottom-0 left-10 top-0 w-[2px] bg-[rgba(224,102,102,.5)]" aria-hidden="true" />
      <UnlockToast text={toast} />

      <div className="relative mx-auto max-w-[720px] px-6 sm:px-10 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p style={{ fontFamily: "'Caveat', cursive" }} className="text-[32px] font-semibold leading-none">
              Тетрадь по умножению
            </p>
            <p className="mt-1 text-[15px] opacity-80">
              Ученик: <b>{me?.name ?? 'Ученик'}</b> · раунд: {SESSION} примеров · «верно / неверно»
            </p>
          </div>
          <SoundToggle />
        </div>

        <div className="mt-4 flex flex-wrap gap-[7px]">
          {gridCols.map((c) => {
            const isDone = c < d.unlocked;
            const isActive = c === d.unlocked;
            const p = Math.min(THRESHOLD, d.colProgress[c] ?? 0);
            return (
              <span
                key={c}
                className={`inline-flex items-center gap-1.5 border-2 px-3 py-0.5 text-[16px] transition-colors ${
                  isDone ? 'border-[#3e7c3e] bg-[#d6eccf] text-[#2e5d2e]' : isActive ? 'border-[#2b3a67] bg-[#fff3c9]' : 'border-[#2b3a67] bg-white opacity-40'
                }`}
                style={{ borderRadius: BLOB }}
              >
                ×{c}
                {isDone && <span>✓</span>}
                {isActive && (
                  <span className="inline-flex items-center gap-[2px]">
                    {Array.from({ length: THRESHOLD }, (_, i) => (
                      <i key={i} className="inline-block h-[7px] w-[7px] rounded-[2px] border-[1.5px] border-[#2b3a67]" style={{ background: i < p ? '#2b3a67' : 'transparent' }} />
                    ))}
                  </span>
                )}
                {!isDone && !isActive && <span>🔒</span>}
              </span>
            );
          })}
        </div>

        {stage === 'play' && cur && (
          <div className="pb-4 pt-7 text-center">
            <p className="text-[19px] opacity-75">
              Пример {Math.min(qNum + 1, SESSION)} из {SESSION}
            </p>
            <p className="mt-3 text-[clamp(42px,9vw,68px)] leading-none tracking-[2px]">
              {cur.a} × {cur.b} ={' '}
              <span className={`inline-block transition-all duration-200 ${fb ? (fb.ok ? 'border-b-[5px] border-[#3e7c3e]' : 'text-[#888] line-through decoration-[#d33] decoration-4') : ''}`}>
                {cur.shown}
              </span>
            </p>
            <p className={`min-h-[44px] text-[25px] ${fb ? (fb.ok ? 'text-[#2e7d32]' : 'text-[#d33]') : 'text-transparent'}`}>
              {fb ? (fb.ok ? `✓ ${fb.text}` : fb.text) : '·'}
            </p>
            <div className="flex flex-wrap justify-center gap-5">
              <button
                onClick={() => answer(true)}
                disabled={fb !== null}
                className="border-[3px] border-[#2b3a67] bg-white px-9 py-2.5 text-[26px] transition-all hover:-translate-y-[3px] hover:-rotate-1 hover:bg-[#e7f5e3] active:translate-y-px disabled:opacity-50"
                style={{ borderRadius: BLOB, boxShadow: '3px 4px 0 rgba(43,58,103,.25)' }}
              >
                Верно ✓
              </button>
              <button
                onClick={() => answer(false)}
                disabled={fb !== null}
                className="border-[3px] border-[#c0392b] bg-white px-9 py-2.5 text-[26px] text-[#c0392b] transition-all hover:-translate-y-[3px] hover:rotate-1 hover:bg-[#fdecea] active:translate-y-px disabled:opacity-50"
                style={{ borderRadius: BLOB, boxShadow: '3px 4px 0 rgba(192,57,43,.22)' }}
              >
                Неверно ✗
              </button>
            </div>
            <p className="mt-4 text-[14px] opacity-55">клавиши: → или 1 — верно · ← или 2 — неверно</p>
            <p className="mt-1 min-h-[28px] text-[21px] text-[#b3541e]">{streak > 1 ? `серия: ${streak} 🔥` : ''}</p>
          </div>
        )}

        {stage === 'end' && end && (
          <div className="relative z-10 mx-auto my-8 max-w-[420px] border-[3px] border-[#2b3a67] bg-[#fffdf4] px-8 py-8 text-center" style={{ borderRadius: BLOB_CARD, boxShadow: '0 30px 60px rgba(43,58,103,.3)' }}>
            <span
              className="mx-auto flex h-[92px] w-[92px] -rotate-[8deg] items-center justify-center border-4 border-[#d33] text-[54px] leading-none text-[#d33]"
              style={{ borderRadius: MARK_RING, fontFamily: "'Caveat', cursive", fontWeight: 700 }}
            >
              {end.mark}
            </span>
            <h4 className="mt-2 text-[34px] leading-tight" style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}>
              Раунд окончен!
            </h4>
            <p className="text-[30px] tracking-[6px] text-[#e8a20c] leading-none">
              {'★'.repeat(end.stars)}
              <span className="text-[#2b3a67]/20">{'★'.repeat(3 - end.stars)}</span>
            </p>
            <p className="mt-3 text-[17px]">
              Верных: <b>{correct}</b> из {SESSION} · точность <b>{end.acc}%</b> · очки <b>{score}</b>
            </p>
            <p className="mt-2 text-[16px]">
              {end.rank > 0 ? (
                <>
                  <span className="mr-1">🏆</span>Новое место на Доске почёта: <b>{end.rank}</b>!
                </>
              ) : (
                'Рекорд Доски почёта пока впереди!'
              )}
            </p>
            <p className="mt-1.5 text-[13px] opacity-70" style={{ fontFamily: "'Golos Text', sans-serif" }}>
              {alreadyDone ? 'Урок уже был зачтён раньше — очки не начислены, прогресс тетради сохранён.' : 'Урок зачтён: +20 очков на счёт.'}
            </p>
            <BadgeChips badges={end.newBadges} />
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button onClick={restart} className="border-[3px] border-[#2b3a67] bg-white px-6 py-1.5 text-[20px] transition-all hover:-translate-y-0.5 hover:bg-[#eef2fa]" style={{ borderRadius: BLOB }}>
                Ещё раунд
              </button>
              <button onClick={onClose} className="border-[3px] border-[#2b3a67] bg-white px-6 py-1.5 text-[20px] transition-all hover:-translate-y-0.5 hover:bg-[#eef2fa]" style={{ borderRadius: BLOB }}>
                Закрыть
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= 3. Космополёт ================= */

const PLANET_COLORS = ['#ff8fab', '#ffd166', '#8ac926', '#4cc9f0', '#b388eb', '#ff924c', '#6ee7b7', '#f9c74f', '#90b8f8', '#f28ab2'];
const FONT_HUD = "'Russo One', sans-serif";

export function MultCosmosTrainer({ onPass, alreadyDone, onClose }: { onPass: () => void; alreadyDone: boolean; onClose: () => void }) {
  const { me } = useStore();
  const reduced = useReducedMotion();
  const studentId = me?.id ?? 'guest';

  const [d, setD] = useState<MultData>(() => loadMult(studentId));
  const [cur, setCur] = useState<VnProblem | null>(null);
  const [qNum, setQNum] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [errors, setErrors] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const [spd, setSpd] = useState('');
  const [fpt, setFpt] = useState<{ id: number; pts: number } | null>(null);
  const [stage, setStage] = useState<'play' | 'end'>('play');
  const [end, setEnd] = useState<{ stars: number; rank: number; newBadges: BadgeDef[]; acc: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const queueRef = useRef<{ a: number; b: number }[]>([]);
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

  useEffect(() => {
    setCur(makeVnProblem(loadMult(studentId), queueRef.current));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (toastRef.current) clearTimeout(toastRef.current);
      if (fptRef.current) clearTimeout(fptRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endSession = (md: MultData, corr: number, sc: number, bs: number, errs: number) => {
    const acc = Math.round((corr / SESSION) * 100);
    const { next, stars, newBadges, rank } = finishSession(md, me?.name ?? 'Ученик', { score: sc, acc, bestStreak: bs, errors: errs });
    setD(next);
    saveMult(studentId, next);
    setEnd({ stars, rank, newBadges, acc });
    setStage('end');
    if (rank > 0) {
      beep('win');
      if (!reduced) confettiBurst(PLANET_COLORS);
    }
    if (acc >= PASS_ACC) onPass();
  };

  const answer = (v: boolean) => {
    if (stage !== 'play' || !cur || fb) return;
    const ok = v === cur.isTrue;
    const nextQ = qNum + 1;
    const nextStreak = ok ? streak + 1 : 0;
    const nextBest = Math.max(bestStreak, nextStreak);
    const nextCorrect = correct + (ok ? 1 : 0);
    const pts = ok ? 10 + Math.min(streak, 10) : 0;
    const nextScore = score + pts;
    const nextErrors = errors + (ok ? 0 : 1);

    setQNum(nextQ);
    setStreak(nextStreak);
    setBestStreak(nextBest);
    setCorrect(nextCorrect);
    setScore(nextScore);
    setErrors(nextErrors);

    if (ok) {
      setFpt({ id: Date.now(), pts });
      if (fptRef.current) clearTimeout(fptRef.current);
      fptRef.current = setTimeout(() => setFpt(null), 900);
      setSpd(`СЕРИЯ ×${nextStreak}`);
      setFb({ ok: true, text: nextStreak >= 3 ? `ТЯГА ×${nextStreak}!` : 'Подтверждено!' });
    } else {
      queueRef.current.push({ a: cur.a, b: cur.b });
      setSpd('');
      setFb({ ok: false, text: `Бортовой компьютер: ${cur.a} × ${cur.b} = ${cur.ans}` });
    }
    beep(ok ? 'ok' : 'no');

    const { next, unlockedNew } = registerAnswer(d, cur.a, cur.b, ok);
    setD(next);
    saveMult(studentId, next);
    if (unlockedNew) {
      beep('unlock');
      setToast(`Новая планета открыта: ×${unlockedNew}!`);
      if (toastRef.current) clearTimeout(toastRef.current);
      toastRef.current = setTimeout(() => setToast(null), 2600);
    }

    timerRef.current = setTimeout(() => {
      if (nextQ >= SESSION) endSession(next, nextCorrect, nextScore, nextBest, nextErrors);
      else {
        setFb(null);
        setCur(makeVnProblem(next, queueRef.current));
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
    setErrors(0);
    setFb(null);
    setSpd('');
    setFpt(null);
    setEnd(null);
    setStage('play');
    setCur(makeVnProblem(d, queueRef.current));
  };

  const gridCols = cols();
  const rocketBottom = 4 + (qNum / SESSION) * 90;
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
        <p style={{ fontFamily: FONT_HUD }} className="text-[13px] tracking-[0.16em] text-[#8fd6ff]">
          КОСМОПОЛЁТ · {Math.min(qNum + 1, SESSION)} / {SESSION}
        </p>
        <div className="order-first w-full text-center sm:order-none sm:w-auto">
          <p style={{ fontFamily: FONT_HUD }} className="text-[15px] tracking-[0.1em] text-[#9fb4e8]">
            ВЫСОТА <b className="text-[22px] text-[#ffd166]">{score}</b>
          </p>
          <p style={{ fontFamily: FONT_HUD }} className="min-h-[20px] text-[14px] text-[#ff9d5c]">
            {spd}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-extrabold text-[#9fb4e8]">пилот {me?.name ?? 'Ученик'}</span>
          <SoundToggle className="border-[rgba(76,201,240,.4)] bg-[#0d1435] hover:border-[#4cc9f0]" />
        </div>
      </div>

      <div className="relative z-10 mx-6 mt-3 h-2 overflow-hidden rounded-md bg-[#101838] md:hidden">
        <i className="block h-full rounded-md" style={{ width: `${(qNum / SESSION) * 100}%`, background: 'linear-gradient(90deg,#4cc9f0,#ffd166)', transition: 'width 0.4s ease' }} />
      </div>

      {stage === 'play' && cur && (
        <div className="relative z-10 mx-auto grid max-w-[880px] items-center gap-6 px-6 py-6 sm:px-8 md:grid-cols-[150px_1fr]">
          <aside className="relative hidden h-[52vh] md:block">
            <span className="absolute bottom-0 left-1/2 top-0 w-[3px] -translate-x-1/2 rounded-full" style={{ background: 'linear-gradient(#ffd16633,#4cc9f066,#ffd16633)' }} />
            {gridCols.map((c, i) => {
              const lit = c <= d.unlocked;
              const target = c === d.unlocked;
              return (
                <span
                  key={c}
                  className={`absolute left-1/2 h-6 w-6 -translate-x-1/2 rounded-full transition-all duration-500 ${target ? 'cosmos-target' : ''}`}
                  style={{
                    bottom: `${6 + i * (88 / 9)}%`,
                    background: PLANET_COLORS[i],
                    color: PLANET_COLORS[i],
                    opacity: lit ? 1 : 0.3,
                    boxShadow: lit && !target ? `0 0 14px 2px ${PLANET_COLORS[i]}` : undefined,
                  }}
                >
                  <b className="absolute left-8 top-1 text-[11px] text-[#9fb4e8]" style={{ fontFamily: FONT_HUD }}>
                    ×{c}
                  </b>
                </span>
              );
            })}
            <span
              className="absolute left-1/2 -translate-x-1/2 -rotate-45 text-[40px] transition-all duration-500"
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
              <span key={fpt.id} className="cosmos-fpt absolute right-5 top-2.5 text-[20px] text-[#7cfc90]" style={{ fontFamily: FONT_HUD }}>
                +{fpt.pts}
              </span>
            )}
            <p style={{ fontFamily: FONT_HUD }} className="text-[12px] tracking-[0.16em] text-[#6f86c2]">
              ЗАДАНИЕ {Math.min(qNum + 1, SESSION)} / {SESSION}
            </p>
            <p className="mt-3 text-[clamp(30px,7vw,52px)] leading-tight" style={{ fontFamily: FONT_HUD, textShadow: '0 0 18px rgba(76,201,240,.5)' }}>
              {cur.a} × {cur.b} = <span className="text-[#ffd166]">{cur.shown}</span>
            </p>
            <p className="mb-1 mt-2 font-semibold text-[#9fb4e8]">Бортовой компьютер прав?</p>
            <p className={`min-h-[30px] font-extrabold ${fb ? (fb.ok ? 'text-[#7cfc90]' : 'text-[#ff8080]') : 'text-transparent'}`}>{fb ? fb.text : '·'}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => answer(true)}
                disabled={fb !== null}
                className="rounded-xl px-9 py-3 text-[20px] tracking-[0.06em] text-[#05260f] transition-all hover:-translate-y-[3px] active:translate-y-px disabled:opacity-50"
                style={{ fontFamily: FONT_HUD, background: '#22c55e', boxShadow: '0 0 22px rgba(34,197,94,.45)' }}
              >
                ВЕРНО
              </button>
              <button
                onClick={() => answer(false)}
                disabled={fb !== null}
                className="rounded-xl px-9 py-3 text-[20px] tracking-[0.06em] text-white transition-all hover:-translate-y-[3px] active:translate-y-px disabled:opacity-50"
                style={{ fontFamily: FONT_HUD, background: '#ef4444', boxShadow: '0 0 22px rgba(239,68,68,.4)' }}
              >
                НЕВЕРНО
              </button>
            </div>
            <p className="mt-3.5 text-[12px] text-[#6f86c2]">→ / 1 — верно · ← / 2 — неверно</p>
          </section>
        </div>
      )}

      {stage === 'end' && end && (
        <div className="relative z-10 mx-auto max-w-[450px] px-6 py-8">
          <div className="rounded-[18px] border-2 px-8 py-8 text-center" style={{ background: '#0d1435', borderColor: 'rgba(76,201,240,.5)', boxShadow: '0 30px 70px rgba(0,0,0,.6)' }}>
            <h4 className="text-[22px] tracking-[0.06em]" style={{ fontFamily: FONT_HUD }}>
              ПОЛЁТ ЗАВЕРШЁН
            </h4>
            <p className="mt-2 text-[32px] leading-none tracking-[8px] text-[#ffd166]">
              {'★'.repeat(end.stars)}
              <span className="text-[#eaf6ff]/20">{'★'.repeat(3 - end.stars)}</span>
            </p>
            <p className="mt-4 text-[15px]">
              Высота: <b>{score}</b> · верных: <b>{correct}</b> из {SESSION} ({end.acc}%)
            </p>
            <p className="text-[15px]">
              Лучшая серия: <b>{bestStreak}</b>
            </p>
            <p className="mt-2 text-[15px]">
              {end.rank > 0 ? (
                <>
                  <span className="mr-1">🏆</span>Новое место на Доске почёта: <b>{end.rank}</b>!
                </>
              ) : (
                'Рекорд Доски почёта пока впереди!'
              )}
            </p>
            <p className="mt-2 text-[12.5px] text-[#9fb4e8]" style={{ fontFamily: "'Golos Text', sans-serif" }}>
              {alreadyDone ? 'Урок уже был зачтён раньше — очки не начислены, прогресс полёта сохранён.' : 'Урок зачтён: +20 очков на счёт.'}
            </p>
            <BadgeChips badges={end.newBadges} />
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button onClick={restart} className="rounded-[10px] border-2 border-[#4cc9f0] px-6 py-2.5 text-[15px] tracking-[0.06em] transition-colors hover:bg-[rgba(76,201,240,.15)]" style={{ fontFamily: FONT_HUD }}>
                ЕЩЁ ПОЛЁТ
              </button>
              <button onClick={onClose} className="rounded-[10px] border-2 border-[#4cc9f0] px-6 py-2.5 text-[15px] tracking-[0.06em] transition-colors hover:bg-[rgba(76,201,240,.15)]" style={{ fontFamily: FONT_HUD }}>
                ЗАКРЫТЬ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
