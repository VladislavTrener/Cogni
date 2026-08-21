/**
 * «Логика малышам» — тренажёр по банку из 150 задач (дошкольники и 1 класс).
 * mode: 0..5 — один из 6 типов задач, 'mix' — большой тест (случайные 20).
 * Для малышей есть озвучка задачи голосом (speechSynthesis, ru-RU).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';
import { beep, confettiBurst, useReducedMotion } from '../../components';
import { LOGIC_TYPES, LogicQ, byType, mixedSample } from './logicData';

const PASS = 0.6; // зачёт от 60%
const LETTERS = ['а', 'б', 'в', 'г', 'д', 'е'];
const ANS_COLORS = ['#ff8a3d', '#2fa8dc', '#1fa97a', '#e8a912', '#f05d50', '#b388eb'];

const PRAISE = ['Молодец!', 'Верно!', 'Отлично!', 'Так держать!', 'Умница!', 'Правильно!'];

function speak(text: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ru-RU';
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {
    /* noop */
  }
}

const starsOf = (acc: number) => (acc >= 0.9 ? 3 : acc >= 0.75 ? 2 : acc >= PASS ? 1 : 0);

export function LogicTrainer({
  mode,
  alreadyDone,
  onPass,
  onClose,
}: {
  mode: number | 'mix';
  alreadyDone: boolean;
  onPass: () => void;
  onClose: () => void;
}) {
  const { me } = useStore();
  const reduced = useReducedMotion();

  const type = mode === 'mix' ? null : LOGIC_TYPES[mode];
  const title = mode === 'mix' ? 'Большой тест' : type!.name;
  const emoji = mode === 'mix' ? '🏆' : type!.emoji;
  const accent = mode === 'mix' ? '#e8a912' : type!.color;

  // очередь задач: сначала весь набор, при разборе ошибок — только ошибки
  const [queue, setQueue] = useState<LogicQ[]>(() =>
    mode === 'mix' ? mixedSample(20) : byType(mode),
  );
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrong, setWrong] = useState<LogicQ[]>([]); // задачи, в которых ошиблись
  const [stage, setStage] = useState<'intro' | 'play' | 'end'>('intro');
  const [passFired, setPassFired] = useState(false);

  const total = queue.length;
  const cur = queue[idx];
  const acc = total > 0 ? correctCount / total : 0;

  const speakCur = () => {
    if (!cur) return;
    const opts = cur.opts.map((o, i) => `${LETTERS[i]}) ${o}`).join('. ');
    speak(`${cur.q} Варианты: ${opts}`);
  };

  const answer = (i: number) => {
    if (chosen !== null || !cur) return;
    setChosen(i);
    if (i === cur.a) {
      setCorrectCount((c) => c + 1);
      beep('ok');
    } else {
      setWrong((w) => [...w, cur]);
      beep('no');
    }
  };

  const next = () => {
    if (idx + 1 < total) {
      setIdx((v) => v + 1);
      setChosen(null);
    } else {
      // раунд закончен
      const finalAcc = correctCount / total;
      setStage('end');
      if (finalAcc >= PASS && !passFired) {
        setPassFired(true);
        onPass();
        if (!reduced) confettiBurst([accent, '#ffd166', '#1fa97a', '#2fa8dc']);
        beep('win');
      }
    }
  };

  const reviewMistakes = () => {
    setQueue([...wrong]);
    setWrong([]);
    setIdx(0);
    setChosen(null);
    setCorrectCount(0);
    setStage('play');
  };

  const restart = () => {
    setQueue(mode === 'mix' ? mixedSample(20) : byType(mode));
    setIdx(0);
    setChosen(null);
    setCorrectCount(0);
    setWrong([]);
    setPassFired(false);
    setStage('play');
  };

  // автоозвучка при смене задачи (только если включена)
  const [autoSpeak, setAutoSpeak] = useState(false);
  useEffect(() => {
    if (autoSpeak && stage === 'play' && cur) speakCur();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, stage, autoSpeak]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const isCorrect = chosen !== null && cur ? chosen === cur.a : false;

  return (
    <div className="relative rounded-xl border border-line bg-paper p-5 sm:p-6">
      {/* шапка */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-[11px] tracking-[0.22em]" style={{ color: accent }}>
          ЛОГИКА МАЛЫШАМ · {title.toUpperCase()}
        </p>
        <div className="flex items-center gap-2">
          {stage === 'play' && (
            <span className="rounded-full bg-ink/6 px-3 py-1 text-[12px] font-bold text-inksoft">
              задача {Math.min(idx + 1, total)} из {total}
            </span>
          )}
          <button
            onClick={() => setAutoSpeak((v) => !v)}
            className={`rounded-md border px-2.5 py-1.5 text-[13px] transition-colors ${
              autoSpeak ? 'border-pine-700 bg-pine-900/5 text-pine-700' : 'border-line bg-card text-inkmut hover:border-ink/30'
            }`}
            title="Автоматически озвучивать задачи"
          >
            🔊 авто
          </button>
        </div>
      </div>

      {/* интро */}
      {stage === 'intro' && (
        <div className="mx-auto max-w-md py-4 text-center">
          <p className="text-[64px] leading-none">{emoji}</p>
          <h4 className="mt-2 font-display font-900 text-2xl text-ink">{title}</h4>
          <p className="mt-2 text-[14px] leading-relaxed text-inksoft">
            {mode === 'mix'
              ? 'Случайные 20 задач из всех шести типов. Настоящая проверка для самых смелых!'
              : `${type!.desc}. В этом задании ${total} задач. Читай внимательно — или слушай, нажав на динамик!`}
          </p>
          <button
            onClick={() => setStage('play')}
            className="mt-6 rounded-full px-9 py-3 font-display text-[14px] font-700 text-paper transition-all hover:-translate-y-0.5 hover:brightness-110"
            style={{ background: accent }}
          >
            Поехали! 🚀
          </button>
        </div>
      )}

      {/* игра */}
      {stage === 'play' && cur && (
        <div>
          {/* прогресс-бар */}
          <div className="mb-5 h-3 w-full overflow-hidden rounded-full bg-ink/8">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(idx / total) * 100}%`, background: `linear-gradient(90deg,${accent},#ffd166)` }}
            />
          </div>

          {/* вопрос */}
          <div className="rounded-xl border-2 bg-card p-5 sm:p-6" style={{ borderColor: `${accent}55` }}>
            <div className="flex items-start gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-[14px] font-700 text-paper"
                style={{ background: accent }}
              >
                {cur.n}
              </span>
              <p className="flex-1 text-[16px] leading-relaxed text-ink sm:text-[17px]">{cur.q}</p>
              <button
                onClick={speakCur}
                className="shrink-0 rounded-full border border-line bg-paper p-2.5 text-[16px] transition-all hover:scale-110 hover:border-ink/30"
                title="Послушать задачу"
                aria-label="Послушать задачу"
              >
                🔊
              </button>
            </div>
          </div>

          {/* ответы */}
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {cur.opts.map((o, i) => {
              let cls = 'border-line bg-card text-ink hover:-translate-y-0.5 hover:shadow-md';
              if (chosen !== null) {
                if (i === cur.a) cls = 'border-mint bg-mint/12 text-ink';
                else if (i === chosen) cls = 'border-coral bg-coral/10 text-ink';
                else cls = 'border-line bg-card text-ink opacity-40';
              }
              return (
                <button
                  key={i}
                  onClick={() => answer(i)}
                  disabled={chosen !== null}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-[14.5px] font-semibold transition-all ${cls}`}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[13px] font-700 text-paper"
                    style={{ background: ANS_COLORS[i] }}
                  >
                    {LETTERS[i]}
                  </span>
                  <span className="flex-1">{o}</span>
                  {chosen !== null && i === cur.a && <span className="text-mint">✓</span>}
                  {chosen !== null && i === chosen && i !== cur.a && <span className="text-coral">✗</span>}
                </button>
              );
            })}
          </div>

          {/* обратная связь */}
          {chosen !== null && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className={`text-[14px] font-bold ${isCorrect ? 'text-mint' : 'text-coral'}`}>
                {isCorrect
                  ? `${PRAISE[cur.n % PRAISE.length]} ✨`
                  : `Не совсем. Правильный ответ: ${LETTERS[cur.a]}) ${cur.opts[cur.a]}`}
              </p>
              <button
                onClick={next}
                className="rounded-full bg-ink px-7 py-2.5 font-display text-[13px] font-700 text-paper transition-all hover:bg-pine-700"
              >
                {idx + 1 < total ? 'Дальше →' : 'Результат 🎉'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* итог */}
      {stage === 'end' && (
        <div className="py-4 text-center">
          <p className="text-[56px] leading-none">{acc >= PASS ? '🎉' : '💪'}</p>
          <h4 className="mt-2 font-display font-900 text-2xl text-ink">{title}: готово!</h4>
          <p className="mt-3 font-display font-900 text-4xl" style={{ color: acc >= PASS ? '#1fa97a' : '#f05d50' }}>
            {Math.round(acc * 100)}%
          </p>
          <p className="mt-1 text-[13px] text-inksoft">
            верных: <b className="text-ink">{correctCount}</b> из {total}
          </p>
          <p className="mt-2 text-[26px] tracking-[6px] text-[#e8a912]">
            {'★'.repeat(starsOf(acc))}
            <span className="text-ink/15">{'★'.repeat(3 - starsOf(acc))}</span>
          </p>
          <p className="mx-auto mt-3 max-w-sm text-[13px] text-inksoft">
            {acc >= PASS
              ? alreadyDone
                ? 'Урок уже был зачтён раньше — очки не начислены, но тренировка засчитана!'
                : 'Урок зачтён: +20 очков на счёт!'
              : `Для зачёта нужно ${Math.round(PASS * 100)}%. Попробуй ещё раз — у тебя получится!`}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {wrong.length > 0 && (
              <button
                onClick={reviewMistakes}
                className="rounded-full border-2 border-ink/20 px-6 py-2.5 font-display text-[13px] font-700 text-ink transition-all hover:border-coral hover:text-coral"
              >
                Разобрать ошибки ({wrong.length})
              </button>
            )}
            <button
              onClick={restart}
              className="rounded-full border-2 border-ink/20 px-6 py-2.5 font-display text-[13px] font-700 text-ink transition-all hover:border-ink/50"
            >
              Ещё раз
            </button>
            <button
              onClick={onClose}
              className="rounded-full px-6 py-2.5 font-display text-[13px] font-700 text-paper transition-all hover:brightness-110"
              style={{ background: accent }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
