/**
 * Тест Струпа (вкладка ПАМЯТЬ): блоки от 4×4 до 10×10.
 * В каждом блоке три таблицы:
 *   1) чёрная — цифры одного цвета, нажимать по порядку 1, 2, 3…;
 *   2) разноцветная — те же цифры, но цвет мешает (эффект Струпа);
 *   3) таблица Горбова — чёрные по возрастанию, красные по убыванию, чередуя.
 * Цифры перемешиваются при каждой попытке. Урок зачитывается после блока 6×6.
 */

import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import { beep, confettiBurst, useReducedMotion } from '../../components';

const SIZES = [4, 5, 6, 7, 8, 9, 10];
const PASS_SIZE = 6; // блок, после которого зачитывается урок

type StageId = 'plain' | 'color' | 'gorbov';

const STAGES: { id: StageId; label: string; hint: string }[] = [
  { id: 'plain', label: 'Чёрная', hint: 'Все цифры одного цвета. Нажимай 1, 2, 3… по порядку как можно быстрее.' },
  { id: 'color', label: 'Разноцветная', hint: 'Те же цифры, но каждая в своём цвете. Цвет — помеха: ищи только по номеру.' },
  { id: 'gorbov', label: 'Горбова', hint: 'Красно-чёрная таблица: чёрные — по возрастанию, красные — по убыванию, чередуя.' },
];

const COLOR_PALETTE = ['#f05d50', '#2fa8dc', '#1fa97a', '#e8a912', '#8e44ad', '#ff8a3d'];
const RED = '#d3372c';
const BLACK = '#152420';

interface Cell {
  id: number;
  kind: 'plain' | 'b' | 'r';
  v: number;
  color: string;
  found: boolean;
}

interface Expect {
  k: 'plain' | 'b' | 'r';
  v: number;
}

interface TableResult {
  stage: number;
  time: number; // секунды
  errors: number;
}

/* ---------- генерация таблиц (каждый раз заново) ---------- */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeTable(size: number, stage: StageId): { cells: Cell[]; seq: Expect[] } {
  const m = size * size;
  if (stage === 'gorbov') {
    const blackCount = Math.ceil(m / 2);
    const redCount = Math.floor(m / 2);
    const cells: Cell[] = [
      ...Array.from({ length: blackCount }, (_, i) => ({ id: i, kind: 'b' as const, v: i + 1, color: BLACK, found: false })),
      ...Array.from({ length: redCount }, (_, i) => ({ id: blackCount + i, kind: 'r' as const, v: i + 1, color: RED, found: false })),
    ];
    const seq: Expect[] = [];
    let bi = 1;
    let ri = redCount;
    while (bi <= blackCount || ri >= 1) {
      if (bi <= blackCount) seq.push({ k: 'b', v: bi++ });
      if (ri >= 1) seq.push({ k: 'r', v: ri-- });
    }
    return { cells: shuffle(cells), seq };
  }
  const cells: Cell[] = Array.from({ length: m }, (_, i) => ({
    id: i,
    kind: 'plain' as const,
    v: i + 1,
    color: stage === 'color' ? COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)] : BLACK,
    found: false,
  }));
  const seq: Expect[] = Array.from({ length: m }, (_, i) => ({ k: 'plain' as const, v: i + 1 }));
  return { cells: shuffle(cells), seq };
}

/* ---------- сохранение прогресса (по каждому ученику) ---------- */

const pKey = (studentId: string) => `kognitiv-stroop-v1-${studentId}`;

function loadUnlocked(studentId: string): number {
  try {
    const raw = localStorage.getItem(pKey(studentId));
    if (raw) {
      const p = JSON.parse(raw) as { unlocked?: number };
      if (typeof p.unlocked === 'number') return Math.min(10, Math.max(4, p.unlocked));
    }
  } catch {
    /* noop */
  }
  return 4;
}

function saveUnlocked(studentId: string, unlocked: number) {
  try {
    localStorage.setItem(pKey(studentId), JSON.stringify({ unlocked }));
  } catch {
    /* noop */
  }
}

const fmtSec = (s: number) => `${s.toFixed(1).replace('.', ',')} с`;

/* ================= компонент ================= */

export function StroopTrainer({ onPass, alreadyDone, onClose }: { onPass: () => void; alreadyDone: boolean; onClose: () => void }) {
  const { me } = useStore();
  const reduced = useReducedMotion();
  const studentId = me?.id ?? 'guest';

  const [unlocked, setUnlocked] = useState(() => loadUnlocked(studentId));
  const [size, setSize] = useState(() => loadUnlocked(studentId));
  const [stageIdx, setStageIdx] = useState(0);
  const [phase, setPhase] = useState<'intro' | 'play' | 'end'>('intro');
  const [cells, setCells] = useState<Cell[]>([]);
  const [seq, setSeq] = useState<Expect[]>([]);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState(0);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [results, setResults] = useState<TableResult[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const startRef = useRef(Date.now());
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // таймер текущей таблицы
  useEffect(() => {
    if (phase !== 'play') return;
    const int = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 100);
    return () => clearInterval(int);
  }, [phase]);

  useEffect(() => () => { if (wrongTimer.current) clearTimeout(wrongTimer.current); }, []);

  const startTable = (sz: number, stIdx: number) => {
    const { cells: c, seq: s } = makeTable(sz, STAGES[stIdx].id);
    setCells(c);
    setSeq(s);
    setProgress(0);
    setErrors(0);
    setWrongId(null);
    setElapsed(0);
    startRef.current = Date.now();
    setStageIdx(stIdx);
    setPhase('play');
  };

  const startBlock = (sz: number) => {
    setResults([]);
    setSize(sz);
    startTable(sz, 0);
  };

  const clickCell = (cell: Cell) => {
    if (phase !== 'play' || cell.found) return;
    const expected = seq[progress];
    const ok =
      stageIdx < 2
        ? cell.v === expected.v
        : cell.kind === expected.k && cell.v === expected.v;

    if (!ok) {
      setErrors((e) => e + 1);
      setWrongId(cell.id);
      beep('no');
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => setWrongId(null), 420);
      return;
    }

    const nextProgress = progress + 1;
    setCells((cs) => cs.map((c) => (c.id === cell.id ? { ...c, found: true } : c)));
    setProgress(nextProgress);

    if (nextProgress >= seq.length) {
      // таблица завершена
      const time = Math.round(((Date.now() - startRef.current) / 1000) * 10) / 10;
      const nextResults = [...results, { stage: stageIdx, time, errors }];
      setResults(nextResults);
      beep('ok');
      if (stageIdx < 2) {
        startTable(size, stageIdx + 1);
      } else {
        // блок завершён
        const newUnlocked = Math.min(10, Math.max(unlocked, size + 1));
        if (newUnlocked !== unlocked) {
          setUnlocked(newUnlocked);
          saveUnlocked(studentId, newUnlocked);
        }
        if (size === PASS_SIZE && !alreadyDone) {
          if (!reduced) confettiBurst();
          beep('win');
          onPass();
        }
        setPhase('end');
      }
    }
  };

  const total = results.reduce((s, r) => s + r.time, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors, 0);
  const expected = seq[progress];

  const cellTextSize = size <= 5 ? 'text-2xl' : size === 6 ? 'text-xl' : size === 7 ? 'text-lg' : size <= 8 ? 'text-base' : 'text-sm';
  const gridMax = size <= 6 ? 'max-w-[340px]' : size <= 8 ? 'max-w-[430px]' : 'max-w-[500px]';

  return (
    <div className="relative rounded-xl border border-line bg-paper p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-[11px] tracking-[0.22em] text-[#1e7ea8]">
          ТЕСТ СТРУПА · БЛОК {size}×{size}
        </p>
        {phase === 'play' && (
          <span className="rounded-full bg-ink/6 px-3 py-1 text-[12px] font-bold text-inksoft">
            таблица {stageIdx + 1}/3 · {fmtSec(elapsed)}
          </span>
        )}
      </div>

      {/* выбор блока */}
      {(phase === 'intro' || phase === 'end') && (
        <div className="mb-5 flex flex-wrap justify-center gap-1.5">
          {SIZES.map((s) => {
            const locked = s > unlocked;
            const active = s === size;
            return (
              <button
                key={s}
                disabled={locked || phase === 'end'}
                onClick={() => setSize(s)}
                className={`rounded-lg border-2 px-3 py-1.5 font-display text-[13px] font-700 transition-all ${
                  active
                    ? 'border-sky bg-sky/10 text-sky'
                    : locked
                      ? 'cursor-not-allowed border-line bg-card text-inkmut/40'
                      : 'border-line bg-card text-inksoft hover:border-sky/60 hover:text-ink'
                }`}
                title={locked ? `Откроется после блока ${s - 1}×${s - 1}` : `Блок ${s}×${s}`}
              >
                {s}×{s}
                {locked && <span className="ml-1 text-[10px]">🔒</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* вступление */}
      {phase === 'intro' && (
        <div className="mx-auto max-w-lg py-4 text-center">
          <p className="text-[14px] leading-relaxed text-inksoft">
            В блоке <b className="text-ink">{size}×{size}</b> — три таблицы подряд. Цифры перемешиваются при каждой попытке.
          </p>
          <div className="mt-4 space-y-1.5 text-left">
            {STAGES.map((st, i) => (
              <div key={st.id} className="flex items-start gap-3 rounded-lg border border-line bg-card px-4 py-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky/12 font-display text-[12px] font-700 text-sky">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-[13px] font-bold text-ink">{st.label}</span>
                  <span className="text-[12px] leading-snug text-inksoft">{st.hint}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-inkmut">
            {size === PASS_SIZE
              ? 'После блока 6×6 урок зачитывается: +20 очков'
              : size < PASS_SIZE
                ? `Урок зачтётся после блока ${PASS_SIZE}×${PASS_SIZE}`
                : alreadyDone
                  ? 'Урок уже зачтён — тренируйся для скорости'
                  : ''}
          </p>
          <button
            onClick={() => startBlock(size)}
            className="mt-5 rounded-lg bg-pine-900 px-8 py-2.5 text-[13.5px] font-bold text-paper transition-colors hover:bg-pine-700"
          >
            Начать блок {size}×{size}
          </button>
        </div>
      )}

      {/* игра */}
      {phase === 'play' && (
        <div className="py-1">
          {/* индикатор трёх таблиц */}
          <div className="mb-4 flex flex-wrap justify-center gap-1.5">
            {STAGES.map((st, i) => {
              const done = i < stageIdx || (i === stageIdx && false);
              const res = results[i];
              return (
                <span
                  key={st.id}
                  className={`rounded-full px-3 py-1 text-[11.5px] font-bold transition-colors ${
                    i === stageIdx
                      ? 'bg-sky text-paper'
                      : res
                        ? 'bg-mint/12 text-mint'
                        : 'bg-ink/6 text-inkmut'
                  }`}
                >
                  {i + 1}. {st.label}
                  {res && ` · ${fmtSec(res.time)}`}
                </span>
              );
            })}
          </div>

          {/* текущая цель */}
          <p className="mb-3 text-center text-[13.5px] font-semibold text-inksoft">
            {stageIdx < 2 ? (
              <>Нажимай по порядку · следующее: <b className="font-display text-[15px] text-ink">{expected?.v}</b></>
            ) : expected ? (
              <>
                Чёрные ↑ · красные ↓ · сейчас:{' '}
                <b className="font-display text-[15px]" style={{ color: expected.k === 'b' ? BLACK : RED }}>
                  {expected.k === 'b' ? 'чёрная' : 'красная'} {expected.v}
                </b>
              </>
            ) : null}
            <span className="ml-3 text-[12px] font-normal text-inkmut">
              найдено {progress}/{seq.length} · ошибок: <b className={errors > 0 ? 'text-coral' : 'text-inkmut'}>{errors}</b>
            </span>
          </p>

          {/* сетка */}
          <div className={`mx-auto grid ${gridMax} gap-1.5`} style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
            {cells.map((cell) => (
              <button
                key={cell.id}
                onClick={() => clickCell(cell)}
                disabled={cell.found}
                className={`aspect-square select-none rounded-md border font-display font-700 transition-all duration-150 ${cellTextSize} ${
                  cell.found
                    ? 'border-line bg-ink/4 text-inkmut/30 line-through decoration-1'
                    : wrongId === cell.id
                      ? 'shake border-coral bg-coral/12'
                      : 'border-line bg-card hover:-translate-y-0.5 hover:border-ink/35 hover:shadow-sm active:translate-y-0'
                }`}
                style={cell.found ? undefined : { color: cell.color }}
              >
                {cell.v}
              </button>
            ))}
          </div>

          {stageIdx === 2 && (
            <p className="mt-3 text-center text-[11.5px] text-inkmut">
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: BLACK }} />
              чёрные — по возрастанию
              <span className="mx-2">·</span>
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: RED }} />
              красные — по убыванию
            </p>
          )}
        </div>
      )}

      {/* итоги блока */}
      {phase === 'end' && (
        <div className="py-4 text-center">
          <h4 className="font-display font-900 text-2xl text-ink">Блок {size}×{size} завершён</h4>
          <p className="mt-3 font-display font-900 text-4xl text-[#1e7ea8]">{fmtSec(total)}</p>
          <p className="mt-1 text-[13px] text-inksoft">
            общее время · ошибок: <b className={totalErrors === 0 ? 'text-mint' : 'text-coral'}>{totalErrors}</b>
          </p>

          <div className="mx-auto mt-5 grid max-w-md grid-cols-1 gap-2 sm:grid-cols-3">
            {results.map((r) => (
              <div key={r.stage} className="rounded-lg border border-line bg-card px-3 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-inkmut">{STAGES[r.stage].label}</p>
                <p className="mt-0.5 font-display font-900 text-lg text-ink">{fmtSec(r.time)}</p>
                <p className="text-[11px] text-inksoft">ошибок: {r.errors}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[12.5px] text-inkmut">
            {size === PASS_SIZE
              ? alreadyDone
                ? 'Урок уже был зачтён раньше — очки не начислены, прогресс блоков сохранён.'
                : 'Урок зачтён: +20 очков на счёт.'
              : size < PASS_SIZE
                ? `Урок зачтётся после блока ${PASS_SIZE}×${PASS_SIZE} — вперёд!`
                : 'Блоки выше 6×6 — тренировка мастерства: очки за урок уже начислены.'}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => startBlock(size)}
              className="rounded-lg border border-ink/15 px-5 py-2.5 text-[13.5px] font-bold text-ink transition-colors hover:border-ink/40"
            >
              Повторить блок
            </button>
            {size < 10 && size + 1 <= unlocked && (
              <button
                onClick={() => {
                  setSize(size + 1);
                  setResults([]);
                  setPhase('intro');
                }}
                className="rounded-lg bg-pine-900 px-5 py-2.5 text-[13.5px] font-bold text-paper transition-colors hover:bg-pine-700"
              >
                Следующий блок {size + 1}×{size + 1}
              </button>
            )}
            <button onClick={onClose} className="rounded-lg bg-sky px-5 py-2.5 text-[13.5px] font-bold text-paper transition-colors hover:brightness-110">
              Во вкладку ПАМЯТЬ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
