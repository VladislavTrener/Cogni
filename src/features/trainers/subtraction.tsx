/**
 * Тренажёры вычитания (Блок 1):
 *  - sub10: вычитание от 10 со всеми цифрами 0–9
 *  - sub20: вычитание от 20 со всеми цифрами 0–20
 *  - mix20: сложение и вычитание с числами до 20 вперемешку
 *
 * Логика простая и честная: при ошибке сразу показывается верный ответ,
 * по окончании блока — итог и кнопка «Повторить».
 */

import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import { beep, confettiBurst, useReducedMotion } from '../../components';

export type SubMode = 'sub10' | 'sub20' | 'mix20';

interface Problem {
  a: number;
  b: number;
  op: '+' | '−';
  ans: number;
}

const ROUND = 15; // примеров в одном блоке

function makeProblem(mode: SubMode): Problem {
  const ri = (n: number) => Math.floor(Math.random() * n);
  if (mode === 'sub10') {
    const b = ri(11); // 0..10
    return { a: 10, b, op: '−', ans: 10 - b };
  }
  if (mode === 'sub20') {
    const b = ri(21); // 0..20
    return { a: 20, b, op: '−', ans: 20 - b };
  }
  // mix20: сложение или вычитание, результат в пределах 20
  if (Math.random() < 0.5) {
    const a = ri(20); // 0..19
    const b = ri(20 - a + 1); // чтобы a+b <= 20
    return { a, b, op: '+', ans: a + b };
  }
  const a = ri(21); // 0..20
  const b = ri(a + 1); // 0..a
  return { a, b, op: '−', ans: a - b };
}

const MODE_META: Record<SubMode, { title: string; color: string; subtitle: string }> = {
  sub10: { title: 'ВЫЧИТАНИЕ ОТ 10', color: '#b05f1e', subtitle: '10 − … со всеми цифрами' },
  sub20: { title: 'ВЫЧИТАНИЕ ОТ 20', color: '#1e7ea8', subtitle: '20 − … со всеми цифрами' },
  mix20: { title: 'СЛОЖЕНИЕ И ВЫЧИТАНИЕ ДО 20', color: '#177a58', subtitle: 'примеры вперемешку' },
};

export function SubtractionTrainer({
  mode,
  onPass,
  alreadyDone,
  onClose,
}: {
  mode: SubMode;
  onPass: () => void;
  alreadyDone: boolean;
  onClose: () => void;
}) {
  const { me } = useStore();
  const reduced = useReducedMotion();
  const meta = MODE_META[mode];

  const [qNum, setQNum] = useState(0);
  const [cur, setCur] = useState<Problem>(() => makeProblem(mode));
  const [val, setVal] = useState('');
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const [correct, setCorrect] = useState(0);
  const [shake, setShake] = useState(false);
  const [stage, setStage] = useState<'play' | 'end'>('play');
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    window.setTimeout(() => inputRef.current?.focus(), 40);
  }, [cur]);

  const submit = () => {
    if (stage !== 'play' || fb) return;
    const v = parseInt(val, 10);
    if (Number.isNaN(v)) {
      setShake(true);
      setTimeout(() => setShake(false), 380);
      return;
    }
    const ok = v === cur.ans;
    const nextCorrect = correct + (ok ? 1 : 0);
    setCorrect(nextCorrect);
    setFb(
      ok
        ? { ok: true, text: 'Верно!' }
        : { ok: false, text: `Неверно. Правильный ответ: ${cur.ans}` },
    );
    beep(ok ? 'ok' : 'no');

    const nextQ = qNum + 1;
    timerRef.current = setTimeout(() => {
      if (nextQ >= ROUND) {
        setStage('end');
        if (nextCorrect >= Math.ceil(ROUND * 0.7)) {
          beep('win');
          if (!reduced) confettiBurst();
          onPass();
        }
      } else {
        setQNum(nextQ);
        setCur(makeProblem(mode));
        setVal('');
        setFb(null);
      }
    }, ok ? 750 : 1500);
  };

  const restart = () => {
    setQNum(0);
    setCur(makeProblem(mode));
    setVal('');
    setFb(null);
    setCorrect(0);
    setStage('play');
    window.setTimeout(() => inputRef.current?.focus(), 40);
  };

  const acc = Math.round((correct / ROUND) * 100);
  const passed = correct >= Math.ceil(ROUND * 0.7);

  return (
    <div className="relative rounded-xl border border-line bg-paper p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-[11px] tracking-[0.22em]" style={{ color: meta.color }}>
            {meta.title}
          </p>
          <p className="text-[12px] text-inkmut mt-0.5">{meta.subtitle} · ученик: {me?.name ?? 'Ученик'}</p>
        </div>
        {stage === 'play' && (
          <span className="text-[12.5px] font-bold uppercase tracking-[0.12em] text-inksoft">
            пример {Math.min(qNum + 1, ROUND)} / {ROUND}
          </span>
        )}
      </div>

      {stage === 'play' && (
        <div className="mx-auto max-w-md">
          {/* полоса прогресса блока */}
          <div className="mb-6 flex gap-1">
            {Array.from({ length: ROUND }, (_, i) => (
              <span
                key={i}
                className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                style={{ background: i < qNum ? meta.color : 'rgba(21,36,32,0.1)' }}
              />
            ))}
          </div>

          <div
            className="rounded-xl border border-line border-l-8 bg-card p-8 text-center transition-colors"
            style={{ borderLeftColor: meta.color }}
          >
            <div className="flex items-baseline justify-center gap-4">
              <span className="font-display font-900 text-5xl tracking-tight text-ink">
                {cur.a} {cur.op} {cur.b} =
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
                className={`w-[3ch] border-b-[5px] border-dashed bg-transparent text-center font-display font-900 text-5xl text-ink outline-none transition-colors ${
                  shake ? 'shake border-coral' : 'border-ink/25 focus:border-sky'
                }`}
              />
            </div>
            <p className={`mt-4 min-h-[24px] text-[14.5px] font-bold ${fb === null ? 'text-inkmut' : fb.ok ? 'text-mint' : 'text-coral'}`}>
              {fb === null ? 'Введи ответ и нажми Enter' : fb.text}
            </p>
            <button
              onClick={submit}
              disabled={fb !== null}
              className="mt-4 rounded-xl bg-ink px-8 py-3 font-display text-[14px] font-700 text-paper transition-all hover:-translate-y-0.5 hover:bg-pine-700 disabled:opacity-40"
            >
              Ответить
            </button>
          </div>

          <p className="mt-4 text-center text-[12px] text-inkmut">
            Ошибка не страшна — верный ответ показывается сразу. Верных сейчас: <b className="text-ink">{correct}</b>
          </p>
        </div>
      )}

      {stage === 'end' && (
        <div className="py-2 text-center">
          <span
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${passed ? 'bg-mint/14 text-mint' : 'bg-orange/14 text-orange'}`}
          >
            <span className="font-display font-900 text-2xl">{passed ? '✓' : '!'}</span>
          </span>
          <h4 className="font-display font-900 text-2xl text-ink mt-4">Блок завершён</h4>
          <p className="font-display font-700 text-4xl text-ink mt-2">
            {correct}<span className="text-inkmut text-2xl">/{ROUND}</span>
          </p>
          <p className="mt-2 text-[14px] text-inksoft">точность {acc}%</p>
          <p className="mt-2 text-[12.5px] text-inkmut max-w-sm mx-auto leading-relaxed">
            {passed
              ? alreadyDone
                ? 'Урок уже был зачтён раньше — очки не начислены, но навык потренирован.'
                : 'Отличный результат! Урок зачтён: +20 очков на счёт.'
              : 'Пока не хватило для зачёта (нужно 70%). Нажми «Повторить» и попробуй ещё раз — ошибки подсвечиваются сразу.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={restart}
              className="rounded-lg border border-ink/15 px-6 py-2.5 text-[13.5px] font-bold text-ink transition-colors hover:border-ink/40"
            >
              Повторить
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-pine-900 px-6 py-2.5 text-[13.5px] font-bold text-paper transition-colors hover:bg-pine-700"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
