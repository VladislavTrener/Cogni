/**
 * Тренажёры вкладки ПАМЯТЬ:
 * — N-back (N-1 → N-2) с нарастающей сложностью по раундам;
 * — «Запомни последовательность»: поле 4×4 (до 5), 5×5 (до 7), 6×6 (до 10).
 */

import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import { beep, beepFreq, confettiBurst, useReducedMotion } from '../../components';

const PASS_ACC = 70;

/* ================= N-back ================= */

const NB_ROUNDS = [
  { n: 1, size: 10, ms: 2400 },
  { n: 1, size: 10, ms: 1800 },
  { n: 2, size: 12, ms: 2200 },
  { n: 2, size: 12, ms: 1700 },
  { n: 2, size: 20, ms: 1400 },
];
const ROUND_PASS = 0.6;

function genSeq(size: number, n: number): number[] {
  const seq: number[] = [];
  for (let i = 0; i < size; i++) {
    let cell = Math.floor(Math.random() * 9);
    if (i >= n && Math.random() < 0.3) cell = seq[i - n];
    seq.push(cell);
  }
  return seq;
}

export function NBackTrainer({ onPass, alreadyDone, onClose }: { onPass: () => void; alreadyDone: boolean; onClose: () => void }) {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<'intro' | 'play' | 'roundEnd' | 'end'>('intro');
  const [round, setRound] = useState(0);
  const [seq, setSeq] = useState<number[]>([]);
  const [idx, setIdx] = useState(-1);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [hits, setHits] = useState(0);
  const [missed, setMissed] = useState(0);
  const [fa, setFa] = useState(0);
  const [accs, setAccs] = useState<number[]>([]);
  const [failNote, setFailNote] = useState(false);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stateRef = useRef({ seq: [] as number[], idx: -1, answered: false, hits: 0, missed: 0, fa: 0, n: 1 });

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  const startRound = (r: number) => {
    const cfg = NB_ROUNDS[r];
    const s = genSeq(cfg.size, cfg.n);
    stateRef.current = { seq: s, idx: -1, answered: false, hits: 0, missed: 0, fa: 0, n: cfg.n };
    setSeq(s);
    setIdx(-1);
    setAnswered(null);
    setHits(0);
    setMissed(0);
    setFa(0);
    setFailNote(false);
    setStage('play');

    s.forEach((_, i) => {
      timersRef.current.push(
        setTimeout(() => {
          const stt = stateRef.current;
          if (!stt.answered && i >= cfg.n) {
            const wasMatch = stt.seq[i - cfg.n] === stt.seq[i];
            if (wasMatch) stt.missed += 1;
            setMissed(stt.missed);
          }
          stt.idx = i;
          stt.answered = false;
          setIdx(i);
          setAnswered(null);
          beep('tone');
          if (i === s.length - 1) {
            timersRef.current.push(
              setTimeout(() => {
                const final = stateRef.current;
                const total = final.hits + final.missed + final.fa;
                const acc = total > 0 ? final.hits / total : 1;
                setAccs((a) => [...a, acc]);
                if (acc < ROUND_PASS) setFailNote(true);
                setStage('roundEnd');
              }, cfg.ms),
            );
          }
        }, 600 + i * cfg.ms),
      );
    });
  };

  const respond = (saidMatch: boolean) => {
    const stt = stateRef.current;
    if (stage !== 'play' || stt.answered || stt.idx < 0) return;
    stt.answered = true;
    setAnswered(saidMatch);
    const wasMatch = stt.idx >= stt.n ? stt.seq[stt.idx - stt.n] === stt.seq[stt.idx] : false;
    if (saidMatch === wasMatch) {
      stt.hits += 1;
      setHits(stt.hits);
      beep('ok');
    } else {
      if (saidMatch) {
        stt.fa += 1;
        setFa(stt.fa);
      } else {
        stt.missed += 1;
        setMissed(stt.missed);
      }
      beep('no');
    }
  };

  const avgAcc = accs.length > 0 ? accs.reduce((a, b) => a + b, 0) / accs.length : 0;
  const roundAcc = (() => {
    const total = hits + missed + fa;
    return total > 0 ? Math.round((hits / total) * 100) : 100;
  })();

  const cfg = NB_ROUNDS[round];
  const curCell = idx >= 0 ? seq[idx] : -1;

  return (
    <div className="relative rounded-xl border border-line bg-paper p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-[11px] tracking-[0.22em] text-[#1e7ea8]">ТРЕНАЖЁР · N-BACK {cfg.n > 0 && stage !== 'intro' ? `N-${cfg.n}` : ''}</p>
        {stage === 'play' && (
          <span className="rounded-full bg-ink/6 px-3 py-1 text-[12px] font-bold text-inksoft">
            раунд {round + 1}/5 · показ {Math.max(0, idx + 1)}/{cfg.size}
          </span>
        )}
      </div>

      {stage === 'intro' && (
        <div className="max-w-lg py-4 text-center mx-auto">
          <p className="text-[14px] leading-relaxed text-inksoft">
            Клетки 3×3 будут вспыхивать по очереди. Сравнивай каждую с клеткой <b className="text-ink">N показов назад</b> и отвечай:
            <b className="text-ink"> та же</b> или <b className="text-ink">другая</b>.
          </p>
          <div className="mt-4 space-y-1.5 text-left">
            {NB_ROUNDS.map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-line bg-card px-4 py-2 text-[12.5px]">
                <span className="font-bold text-ink">Раунд {i + 1} · N-{r.n}</span>
                <span className="text-inkmut">{r.size} показов · {r.ms / 1000} с/показ</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-inkmut">Раунд засчитывается от 60% · урок — от 70% средней точности</p>
          <button
            onClick={() => startRound(0)}
            className="mt-5 rounded-lg bg-pine-900 px-8 py-2.5 text-[13.5px] font-bold text-paper hover:bg-pine-700 transition-colors"
          >
            Начать раунд 1
          </button>
        </div>
      )}

      {stage === 'play' && (
        <div className="py-2">
          <div className="mx-auto grid max-w-[240px] grid-cols-3 gap-2.5">
            {Array.from({ length: 9 }, (_, i) => (
              <span
                key={i}
                className={`aspect-square rounded-lg transition-all duration-150 ${curCell === i ? 'scale-105 bg-sky shadow-[0_0_18px_rgba(47,168,220,0.6)]' : 'bg-ink/6'}`}
              />
            ))}
          </div>
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => respond(false)}
              disabled={answered !== null}
              className="rounded-lg border-2 border-ink/15 px-8 py-3 font-display text-[14px] font-700 text-ink transition-all hover:border-coral hover:text-coral disabled:opacity-40"
            >
              Другая
            </button>
            <button
              onClick={() => respond(true)}
              disabled={answered !== null}
              className="rounded-lg bg-pine-900 px-8 py-3 font-display text-[14px] font-700 text-paper transition-all hover:bg-pine-700 disabled:opacity-40"
            >
              Та же (N-{cfg.n})
            </button>
          </div>
          <p className="mt-4 text-center text-[12.5px] text-inkmut">
            попаданий: <b className="text-mint">{hits}</b> · пропусков: <b className="text-coral">{missed}</b> · ложных: <b className="text-coral">{fa}</b>
          </p>
        </div>
      )}

      {stage === 'roundEnd' && (
        <div className="py-4 text-center">
          <h4 className="font-display font-900 text-xl text-ink">Раунд {round + 1} завершён</h4>
          <p className="mt-2 text-[15px] text-inksoft">
            Точность: <b className={roundAcc >= 60 ? 'text-mint' : 'text-coral'}>{roundAcc}%</b>
            {roundAcc >= ROUND_PASS * 100 ? ' — засчитан' : ' — ниже порога 60%'}
          </p>
          {failNote && <p className="mt-1 text-[12.5px] text-coral">Сложность всё равно растёт — такова методика N-back.</p>}
          {round + 1 < NB_ROUNDS.length ? (
            <button
              onClick={() => {
                const r = round + 1;
                setRound(r);
                startRound(r);
              }}
              className="mt-5 rounded-lg bg-pine-900 px-8 py-2.5 text-[13.5px] font-bold text-paper hover:bg-pine-700 transition-colors"
            >
              Раунд {round + 2}: N-{NB_ROUNDS[round + 1].n}, {NB_ROUNDS[round + 1].ms / 1000} с/показ
            </button>
          ) : (
            <button
              onClick={() => {
                if (!reduced && avgAcc >= PASS_ACC / 100) confettiBurst();
                if (avgAcc >= PASS_ACC / 100) onPass();
                setStage('end');
              }}
              className="mt-5 rounded-lg bg-pine-900 px-8 py-2.5 text-[13.5px] font-bold text-paper hover:bg-pine-700 transition-colors"
            >
              Подвести итог
            </button>
          )}
        </div>
      )}

      {stage === 'end' && (
        <div className="py-4 text-center">
          <h4 className="font-display font-900 text-2xl text-ink">Тренировка N-back окончена</h4>
          <p className="mt-3 font-display font-900 text-4xl" style={{ color: avgAcc >= PASS_ACC / 100 ? '#1fa97a' : '#f05d50' }}>
            {Math.round(avgAcc * 100)}%
          </p>
          <p className="mt-1 text-[13px] text-inksoft">средняя точность по 5 раундам</p>
          <div className="mx-auto mt-4 flex max-w-sm justify-center gap-2">
            {accs.map((a, i) => (
              <span key={i} className={`rounded-md px-2.5 py-1 text-[12px] font-bold ${a >= ROUND_PASS ? 'bg-mint/12 text-mint' : 'bg-coral/10 text-coral'}`}>
                Р{i + 1}: {Math.round(a * 100)}%
              </span>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] text-inkmut">
            {avgAcc >= PASS_ACC / 100
              ? alreadyDone
                ? 'Урок уже был зачтён раньше — очки не начислены.'
                : 'Урок зачтён: +20 очков на счёт.'
              : `Для зачёта урока нужна средняя точность ${PASS_ACC}% — попробуй ещё раз.`}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => {
                setRound(0);
                setAccs([]);
                startRound(0);
              }}
              className="rounded-lg border border-ink/15 px-5 py-2.5 text-[13.5px] font-bold text-ink transition-colors hover:border-ink/40"
            >
              Ещё раз
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

/* ================= Запомни последовательность ================= */

const SQ_STAGES = [
  { size: 4, from: 1, to: 5 },
  { size: 5, from: 1, to: 7 },
  { size: 6, from: 1, to: 10 },
];

function genPattern(len: number, max: number): number[] {
  const p: number[] = [];
  let last = -1;
  for (let i = 0; i < len; i++) {
    let c = Math.floor(Math.random() * max);
    if (c === last) c = (c + 1 + Math.floor(Math.random() * (max - 1))) % max;
    last = c;
    p.push(c);
  }
  return p;
}

const FREQS = [261.6, 293.7, 329.6, 349.2, 392, 440, 493.9, 523.3, 587.3, 659.3, 698.5, 784];

export function SequenceTrainer({ onPass, alreadyDone, onClose }: { onPass: () => void; alreadyDone: boolean; onClose: () => void }) {
  const reduced = useReducedMotion();
  const [stageIdx, setStageIdx] = useState(0);
  const [len, setLen] = useState(1);
  const [pattern, setPattern] = useState<number[]>([]);
  const [phase, setPhase] = useState<'idle' | 'show' | 'input' | 'done' | 'passed'>('idle');
  const [flash, setFlash] = useState(-1);
  const [inputIdx, setInputIdx] = useState(0);
  const [secondChance, setSecondChance] = useState(false);
  const [best, setBest] = useState(0);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const passedRef = useRef(false);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  const cfg = SQ_STAGES[stageIdx];

  const play = (pat: number[], size: number) => {
    clearTimers();
    setPhase('show');
    setInputIdx(0);
    const step = Math.max(300, 640 - pat.length * 24 - size * 18);
    pat.forEach((c, i) => {
      timersRef.current.push(
        setTimeout(() => {
          setFlash(c);
          beepFreq(FREQS[c % FREQS.length], 0.2);
          timersRef.current.push(setTimeout(() => setFlash(-1), Math.min(300, step - 80)));
        }, 500 + i * step),
      );
    });
    timersRef.current.push(setTimeout(() => setPhase('input'), 500 + pat.length * step + 250));
  };

  const start = () => {
    const pat = genPattern(len, cfg.size * cfg.size);
    setPattern(pat);
    setSecondChance(false);
    play(pat, cfg.size);
  };

  const nextLevel = (fromStage: number, fromLen: number) => {
    const cur = SQ_STAGES[fromStage];
    if (fromLen < cur.to) {
      setLen(fromLen + 1);
      return { stage: fromStage, len: fromLen + 1 };
    }
    if (fromStage + 1 < SQ_STAGES.length) {
      setStageIdx(fromStage + 1);
      setLen(1);
      return { stage: fromStage + 1, len: 1 };
    }
    return null;
  };

  const tap = (cell: number) => {
    if (phase !== 'input') return;
    setFlash(cell);
    beepFreq(FREQS[cell % FREQS.length], 0.16);
    setTimeout(() => setFlash(-1), 180);
    if (cell === pattern[inputIdx]) {
      const next = inputIdx + 1;
      if (next >= pattern.length) {
        // последовательность воспроизведена
        const nb = Math.max(best, len);
        setBest(nb);
        if (stageIdx === 2 && len >= 6 && !passedRef.current) {
          passedRef.current = true;
          onPass();
        }
        if (stageIdx === 2 && len >= 10) {
          setPhase('done');
          if (!reduced) confettiBurst();
          beep('win');
        } else {
          setPhase('passed');
          beep('win');
          const nxt = nextLevel(stageIdx, len);
          if (nxt) {
            timersRef.current.push(
              setTimeout(() => {
                const pat = genPattern(nxt.len, SQ_STAGES[nxt.stage].size ** 2);
                setPattern(pat);
                setSecondChance(false);
                play(pat, SQ_STAGES[nxt.stage].size);
              }, 1100),
            );
          }
        }
      } else {
        setInputIdx(next);
      }
    } else {
      beep('no');
      if (!secondChance) {
        setSecondChance(true);
        timersRef.current.push(setTimeout(() => play(pattern, cfg.size), 900));
      } else {
        const newLen = Math.max(1, len - 1);
        setLen(newLen);
        setSecondChance(false);
        timersRef.current.push(
          setTimeout(() => {
            const pat = genPattern(newLen, cfg.size * cfg.size);
            setPattern(pat);
            play(pat, cfg.size);
          }, 900),
        );
      }
    }
  };

  const total = cfg.size * cfg.size;

  return (
    <div className="relative rounded-xl border border-line bg-paper p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-[11px] tracking-[0.22em] text-[#1e7ea8]">ТРЕНАЖЁР · МИГАЮЩИЕ КВАДРАТЫ</p>
        <span className="rounded-full bg-ink/6 px-3 py-1 text-[12px] font-bold text-inksoft">
          поле {cfg.size}×{cfg.size} · длина {len}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_230px] items-start">
        <div className="mx-auto w-full max-w-[340px]">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cfg.size}, minmax(0, 1fr))` }}>
            {Array.from({ length: total }, (_, i) => (
              <button
                key={`${cfg.size}-${i}`}
                onClick={() => tap(i)}
                disabled={phase !== 'input'}
                aria-label={`квадрат ${i + 1}`}
                className={`aspect-square rounded-lg border transition-all duration-150 ${
                  flash === i ? 'scale-105 border-sky bg-sky shadow-[0_0_16px_rgba(47,168,220,0.65)]' : 'border-line bg-card hover:bg-ink/6'
                }`}
              />
            ))}
          </div>

          <p className="mt-4 min-h-[24px] text-center text-[13.5px] font-bold">
            {phase === 'idle' && <span className="text-inkmut">Нажми «Старт» — смотри и запоминай порядок</span>}
            {phase === 'show' && <span className="blink-soft text-sky">Смотри внимательно…</span>}
            {phase === 'input' && (
              <span className="text-ink">
                Повтори! {inputIdx}/{pattern.length}
                {secondChance && <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] text-[#8a6606]">вторая попытка</span>}
              </span>
            )}
            {phase === 'passed' && <span className="text-mint">Отлично! Длина растёт…</span>}
            {phase === 'done' && <span className="text-mint">🎉 Длина 10 на поле 6×6 — вершина!</span>}
          </p>

          {phase === 'idle' && (
            <div className="mt-3 flex justify-center">
              <button onClick={start} className="rounded-lg bg-pine-900 px-8 py-2.5 text-[13.5px] font-bold text-paper hover:bg-pine-700 transition-colors">
                Старт
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-card p-4">
            <p className="font-display text-[11px] font-700 text-ink mb-3">МАРШРУТ</p>
            <ul className="space-y-2">
              {SQ_STAGES.map((s, i) => (
                <li key={s.size} className={`flex items-center justify-between rounded-lg px-3 py-2 text-[12.5px] ${i === stageIdx ? 'bg-sky/10 font-bold text-[#1e7ea8]' : i < stageIdx ? 'text-mint' : 'text-inkmut'}`}>
                  <span>
                    {i < stageIdx ? '✓ ' : ''}поле {s.size}×{s.size}
                  </span>
                  <span>до длины {s.to}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-card p-4">
            <p className="text-[12px] text-inksoft leading-relaxed">
              Ошибка — второй просмотр той же последовательности. Вторая ошибка — шаг назад по длине.
            </p>
            <p className="mt-2.5 text-[12px] leading-relaxed">
              <span className="font-display text-[10px] tracking-[0.18em] text-inkmut">ЗАЧЁТ УРОКА</span>
              <br />
              <span className={stageIdx === 2 && len >= 6 ? 'font-bold text-mint' : 'text-inksoft'}>
                длина 6 на поле 6×6 {stageIdx === 2 && len >= 6 ? '— выполнен ✓' : ''}
              </span>
            </p>
            <p className="mt-2 text-[11.5px] text-inkmut">
              Лучшая длина: <b className="text-ink">{best}</b>
              {alreadyDone && ' · урок уже был зачтён'}
            </p>
          </div>
          <button onClick={onClose} className="w-full rounded-lg border border-ink/15 px-5 py-2.5 text-[13px] font-bold text-ink transition-colors hover:border-ink/40">
            Закрыть тренажёр
          </button>
        </div>
      </div>
    </div>
  );
}
