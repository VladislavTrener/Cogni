/**
 * Кабинет ученика: вкладки направлений, витрина с замками и сроками доступа,
 * демо-период, оплата на самозанятого и живые уроки-тренажёры.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Course,
  DIRECTIONS,
  DirectionId,
  Lesson,
  SELLER,
  canUse,
  dirById,
  fmtDate,
  fmtRub,
  hasAccess,
  monthWord,
  paymentPurposeFor,
  trialInfo,
} from '../data';
import { useStore } from '../store';
import {
  Bar,
  IconArrowR,
  IconBook,
  IconCard,
  IconCheck,
  IconClock,
  IconClose,
  IconCoin,
  IconFlame,
  IconLock,
  IconPlay,
  IconQr,
  IconSpark,
  Modal,
  Ring,
  Spinner,
} from '../components';
import { MultCosmosTrainer, MultLeitnerTrainer, MultNotebookTrainer } from './trainers/mult';
import { QuestTrainer } from './trainers/quest';
import { NBackTrainer, SequenceTrainer } from './trainers/memory';
import { StroopTrainer } from './trainers/stroop';
import { AdditionCosmosTrainer, AdditionCountTrainer, AdditionSmartTrainer } from './trainers/addition';
import { SubtractionTrainer } from './trainers/subtraction';
import { LogicTrainer } from './trainers/logic';
import { KIDS_LOGIC_SOURCE } from './trainers/logicData';
import { SCHOOL_LOGIC_SOURCE } from './trainers/logicData2';

const MONTH = 30 * 24 * 60 * 60 * 1000;

const courseProgress = (course: Course, done: string[]) =>
  course.lessons.filter((l) => done.includes(l.id)).length / course.lessons.length;

const totalMinutes = (course: Course) => course.lessons.reduce((s, l) => s + l.minutes, 0);

/* ================= табы ================= */

function TabBar({
  tab,
  setTab,
  counts,
  ownedCounts,
}: {
  tab: DirectionId;
  setTab: (t: DirectionId) => void;
  counts: Record<DirectionId, number>;
  ownedCounts: Record<DirectionId, number>;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ind, setInd] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const measure = () => {
      const el = refs.current[tab];
      if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    const t = setTimeout(measure, 350);
    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(t);
    };
  }, [tab]);

  return (
    <div className="relative border-b border-line">
      <div className="flex gap-1 overflow-x-auto">
        {DIRECTIONS.map((d) => (
          <button
            key={d.id}
            ref={(el) => {
              refs.current[d.id] = el;
            }}
            onClick={() => setTab(d.id)}
            className={`relative whitespace-nowrap px-4 sm:px-5 py-3.5 font-display text-[12px] sm:text-[13px] tracking-[0.12em] transition-colors ${
              tab === d.id ? 'text-ink' : 'text-inkmut hover:text-inksoft'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-[3px] rotate-45" style={{ background: d.color }} />
              {d.label}
              <span
                className="rounded-full px-1.5 py-px text-[10px] font-body font-bold"
                style={{ background: tab === d.id ? d.soft : 'rgba(21,36,32,0.06)', color: tab === d.id ? d.color : '#8b9a91' }}
              >
                {counts[d.id]}
              </span>
              {ownedCounts[d.id] > 0 && <span className="h-1.5 w-1.5 rounded-full bg-mint" title="есть доступ" />}
            </span>
          </button>
        ))}
      </div>
      <span
        className="absolute bottom-0 h-[3px] rounded-t-full transition-all duration-300 ease-out"
        style={{ left: ind.left, width: ind.width, background: dirById(tab).color }}
      />
    </div>
  );
}

/* ================= карточка курса ================= */

function CourseCard({
  course,
  owned,
  until,
  isTrial,
  progress,
  onOpen,
  onBuy,
  index,
}: {
  course: Course;
  owned: boolean;
  until: number | null;
  isTrial: boolean;
  progress: number;
  onOpen: () => void;
  onBuy: () => void;
  index: number;
}) {
  const d = dirById(course.directionId);
  return (
    <article
      className="card-rise group relative flex flex-col rounded-xl border border-line bg-card p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-24px_rgba(8,23,17,0.35)] cursor-pointer overflow-hidden"
      style={{ ['--d' as string]: `${index * 80}ms` }}
      onClick={onOpen}
    >
      <span className="absolute inset-x-0 top-0 h-1 transition-all duration-300 group-hover:h-1.5" style={{ background: d.color }} />
      {!owned && course.price > 0 && (
        <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full border border-ink/12 bg-paper px-2.5 py-1 text-[11px] font-semibold text-inksoft">
          <IconLock className="w-3 h-3" />
          платный
        </span>
      )}

      <div className="mb-3 flex items-center gap-3">
        <span className="flex items-center gap-1" title={`уровень ${course.level} из 3`}>
          {[1, 2, 3].map((i) => (
            <span key={i} className="h-2 w-2 rounded-full" style={{ background: i <= course.level ? d.color : 'rgba(21,36,32,0.12)' }} />
          ))}
        </span>
        <span className="text-[11.5px] font-semibold text-inkmut">{course.age}</span>
        {owned && (
          <span
            className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${
              isTrial ? 'bg-sky/12 text-sky' : 'bg-mint/12 text-mint'
            }`}
          >
            <IconCheck className="w-3 h-3" /> {isTrial ? 'демо-доступ' : 'оплачен'}
          </span>
        )}
      </div>

      <h3 className="font-display font-700 text-[17px] leading-snug text-ink pr-16">{course.title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-inksoft">{course.subtitle}</p>

      <div className="mt-4 flex items-center gap-4 text-[12.5px] text-inksoft">
        <span className="inline-flex items-center gap-1.5">
          <IconBook className="w-4 h-4" /> {course.lessons.length} {course.lessons.length === 1 ? 'урок' : 'урока'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <IconClock className="w-4 h-4" /> {totalMinutes(course)} мин
        </span>
      </div>

      <div className="mt-4 flex-1" />

      {owned ? (
        <div>
          <div className="flex items-center justify-between text-[12px] font-semibold text-inksoft mb-1.5">
            <span>прогресс курса</span>
            <span style={{ color: d.color }}>{Math.round(progress * 100)}%</span>
          </div>
          <Bar value={progress} color={d.color} />
          <p className="mt-2 text-[11px] text-inkmut">
            {isTrial ? 'Демо-доступ: после окончания — по оплате' : until ? `Доступ до ${fmtDate(until)}` : 'Доступ открыт'}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-pine-900 px-4 py-2.5 text-[13.5px] font-bold text-paper transition-all hover:bg-pine-700 hover:gap-3"
          >
            {progress >= 1 ? 'Повторить курс' : 'Продолжить'}
            <IconArrowR className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display font-700 text-lg text-ink leading-none">{course.price === 0 ? 'бесплатно' : fmtRub(course.price)}</p>
            <p className="text-[11px] text-inkmut mt-1">
              доступ на {course.validityMonths} {monthWord(course.validityMonths)}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBuy();
            }}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13.5px] font-bold transition-all hover:brightness-110 hover:gap-3"
            style={{ background: d.color, color: course.directionId === 'general' ? '#152420' : '#fff' }}
          >
            {course.price === 0 ? 'Открыть' : 'Купить'}
            <IconArrowR className="w-4 h-4" />
          </button>
        </div>
      )}
    </article>
  );
}

/* ================= модалка урока ================= */

function LessonModal({ course, lesson, onClose }: { course: Course; lesson: Lesson; onClose: () => void }) {
  const { dispatch, me } = useStore();
  const done = me?.done.includes(lesson.id) ?? false;
  const [alreadyDone] = useState(done);

  const complete = (points: number) => {
    if (me) dispatch({ type: 'COMPLETE_LESSON', studentId: me.id, lessonId: lesson.id, points });
  };

  const d = dirById(course.directionId);
  const t = lesson.trainer;
  const pass = () => complete(20);

  return (
    <Modal onClose={onClose} width="max-w-4xl" labelledBy="lesson-title">
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-[10.5px] tracking-[0.24em]" style={{ color: d.color }}>
              {course.title.toUpperCase()}
            </p>
            <h3 id="lesson-title" className="font-display font-700 text-xl text-ink mt-1.5">
              {lesson.title}
            </h3>
            <div className="mt-2 flex items-center gap-3 text-[12.5px] text-inksoft">
              <span
                className="rounded-full px-2 py-0.5 font-bold uppercase tracking-wide text-[10.5px]"
                style={{ background: d.soft, color: d.color }}
              >
                тренажёр
              </span>
              <span className="inline-flex items-center gap-1">
                <IconClock className="w-3.5 h-3.5" /> ~{lesson.minutes} мин
              </span>
              {done && (
                <span className="inline-flex items-center gap-1 font-bold text-mint">
                  <IconCheck className="w-3.5 h-3.5" /> пройден
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-inkmut hover:bg-ink/6 hover:text-ink transition-colors" aria-label="Закрыть урок">
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6">
          {t === 'multLeitner' && <MultLeitnerTrainer alreadyDone={alreadyDone} onClose={onClose} onPass={pass} />}
          {t === 'multNotebook' && <MultNotebookTrainer alreadyDone={alreadyDone} onClose={onClose} onPass={pass} />}
          {t === 'multCosmos' && <MultCosmosTrainer alreadyDone={alreadyDone} onClose={onClose} onPass={pass} />}
          {t === 'quest' && <QuestTrainer alreadyDone={alreadyDone} onClose={onClose} onPass={pass} />}
          {t === 'addCount' && <AdditionCountTrainer alreadyDone={alreadyDone} onClose={onClose} onPass={pass} />}
          {t === 'addSmart' && <AdditionSmartTrainer alreadyDone={alreadyDone} onClose={onClose} onPass={pass} />}
          {t === 'addCosmos' && <AdditionCosmosTrainer alreadyDone={alreadyDone} onClose={onClose} onPass={pass} />}
          {t === 'nback' && <NBackTrainer alreadyDone={alreadyDone} onClose={onClose} onPass={pass} />}
          {t === 'sequence' && <SequenceTrainer alreadyDone={alreadyDone} onClose={onClose} onPass={pass} />}
          {t === 'stroop' && <StroopTrainer alreadyDone={alreadyDone} onClose={onClose} onPass={pass} />}
          {(t === 'sub10' || t === 'sub20' || t === 'mix20') && (
            <SubtractionTrainer mode={t} alreadyDone={alreadyDone} onClose={onClose} onPass={pass} />
          )}
          {(t === 'logic0' || t === 'logic1' || t === 'logic2' || t === 'logic3' || t === 'logic4' || t === 'logic5' || t === 'logicMix') && (
            <LogicTrainer
              source={KIDS_LOGIC_SOURCE}
              mode={t === 'logicMix' ? 'mix' : Number(t.slice(5))}
              alreadyDone={alreadyDone}
              onClose={onClose}
              onPass={pass}
            />
          )}
          {(t === 'slogic0' || t === 'slogic1' || t === 'slogic2' || t === 'slogic3' || t === 'slogic4' ||
            t === 'slogic5' || t === 'slogic6' || t === 'slogic7' || t === 'slogic8' || t === 'slogic9' || t === 'slogicMix') && (
            <LogicTrainer
              source={SCHOOL_LOGIC_SOURCE}
              mode={t === 'slogicMix' ? 'mix' : Number(t.slice(6))}
              alreadyDone={alreadyDone}
              onClose={onClose}
              onPass={pass}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ================= модалка курса ================= */

function CourseModal({
  course,
  onBuy,
  onLesson,
  onClose,
}: {
  course: Course;
  onBuy: () => void;
  onLesson: (l: Lesson) => void;
  onClose: () => void;
}) {
  const { state, me } = useStore();
  const d = dirById(course.directionId);
  const trialActive = me ? trialInfo(me, state.settings.trialDays).active : false;
  const owned = me ? trialActive || hasAccess(me, course.id) : false;
  const doneList = me?.done ?? [];
  const progress = courseProgress(course, doneList);
  const until = me?.accessUntil[course.id] ?? null;

  return (
    <Modal onClose={onClose} width="max-w-2xl" labelledBy="course-title">
      <div className="relative overflow-hidden rounded-t-xl p-6 sm:p-7 pb-5" style={{ background: d.soft }}>
        {!owned && <div className="absolute inset-0 stripes-lock" />}
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-1 font-display text-[10.5px] tracking-[0.18em] font-700"
                style={{ background: d.color, color: course.directionId === 'general' ? '#152420' : '#fff' }}
              >
                {d.label}
              </span>
              <span className="text-[12px] font-semibold text-inksoft">
                уровень {course.level}/3 · {course.age}
              </span>
            </div>
            <h3 id="course-title" className="font-display font-900 text-[22px] leading-snug text-ink mt-3">
              {course.title}
            </h3>
            <p className="mt-1.5 text-[13.5px] text-inksoft">{course.subtitle}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-ink/50 hover:bg-ink/8 hover:text-ink transition-colors" aria-label="Закрыть">
            <IconClose className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-6 sm:p-7 pt-5">
        <p className="font-display text-[10.5px] tracking-[0.24em] text-inksoft mb-3">
          ПРОГРАММА · {course.lessons.length} {course.lessons.length === 1 ? 'УРОК' : 'УРОКА'} · {totalMinutes(course)} МИН
        </p>
        <ul className="space-y-2">
          {course.lessons.map((l, i) => {
            const isDone = doneList.includes(l.id);
            return (
              <li
                key={l.id}
                className={`flex items-center gap-3.5 rounded-lg border px-3.5 py-3 transition-all ${
                  owned ? 'border-line bg-card hover:border-ink/25 cursor-pointer group' : 'border-line bg-paper opacity-80'
                }`}
                onClick={() => owned && onLesson(l)}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-[12px] font-700"
                  style={{ background: isDone ? 'rgba(31,169,122,0.14)' : d.soft, color: isDone ? '#1fa97a' : d.color }}
                >
                  {isDone ? <IconCheck className="w-4 h-4" /> : i + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[13.5px] font-semibold truncate ${owned ? 'text-ink' : 'text-inksoft'}`}>{l.title}</span>
                  <span className="text-[11.5px] text-inkmut">тренажёр · {l.minutes} мин</span>
                </span>
                {owned ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-inksoft group-hover:text-ink transition-colors">
                    {isDone ? <span className="text-mint">пройден</span> : 'начать'}
                    {!isDone && <IconArrowR className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />}
                  </span>
                ) : (
                  <IconLock className="w-4 h-4 text-inkmut" />
                )}
              </li>
            );
          })}
        </ul>

        {owned ? (
          <div className="mt-6 rounded-lg border border-line bg-paper px-4 py-3.5 flex items-center gap-4">
            <Ring value={progress} size={46} stroke={5} color={d.color} label={<span className="text-[10px]">{Math.round(progress * 100)}%</span>} />
            <div className="flex-1">
              <p className="text-[13px] font-bold text-ink">
                {progress >= 1 ? 'Курс пройден целиком. Красавчик!' : trialActive && !until ? 'Демо-доступ — занимайся бесплатно' : 'Курс открыт — занимайся в своём темпе'}
              </p>
              <p className="text-[12px] text-inksoft mt-0.5">
                {until ? `Доступ до ${fmtDate(until)} · +20 очков за тренажёр` : '+20 очков за тренажёр'}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-paper px-4 py-4">
            <div>
              <p className="font-display font-900 text-2xl text-ink">{course.price === 0 ? 'бесплатно' : fmtRub(course.price)}</p>
              <p className="text-[11.5px] text-inkmut mt-0.5">
                доступ на {course.validityMonths} {monthWord(course.validityMonths)} · оплата на самозанятого
              </p>
            </div>
            <button
              onClick={onBuy}
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-[14px] font-bold transition-all hover:brightness-110 hover:gap-3"
              style={{ background: d.color, color: course.directionId === 'general' ? '#152420' : '#fff' }}
            >
              {course.price === 0 ? 'Открыть бесплатно' : 'Купить курс'}
              <IconArrowR className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ================= модалка покупки ================= */

function FakeQr() {
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const corner = (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
      const filled = corner || (r * 7 + c * 11 + r * c) % 3 !== 0;
      cells.push(<rect key={`${r}-${c}`} x={c * 12 + 2} y={r * 12 + 2} width={9} height={9} rx={2} fill={filled ? '#0d231b' : 'transparent'} />);
    }
  }
  return (
    <svg viewBox="0 0 112 112" className="w-32 h-32 bg-card rounded-lg border border-line p-1.5" aria-label="QR-код для оплаты через СБП">
      {cells}
    </svg>
  );
}

function PurchaseModal({ course, onClose, onDone }: { course: Course; onClose: () => void; onDone: () => void }) {
  const { state, dispatch, me } = useStore();
  const d = dirById(course.directionId);

  const packageCourses = useMemo(
    () => state.courses.filter((c) => c.published && c.directionId === course.directionId && !(me ? hasAccess(me, c.id) : false)),
    [state.courses, course.directionId, me],
  );
  const packagePrice = Math.round(packageCourses.reduce((s, c) => s + c.price, 0) * 0.8);
  const hasPackage = packageCourses.length > 1;

  const [plan, setPlan] = useState<'single' | 'package'>(hasPackage ? 'package' : 'single');
  const [method, setMethod] = useState<'card' | 'sbp'>('card');
  const [num, setNum] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [stage, setStage] = useState<'form' | 'processing' | 'done'>('form');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const amount = plan === 'single' ? course.price : packagePrice;
  const item = plan === 'single' ? course.title : `Пакет «${d.label}» — ${packageCourses.length} курса(ов)`;
  const purpose =
    plan === 'single'
      ? paymentPurposeFor(course.title)
      : paymentPurposeFor(`Пакет «${d.label}» (${packageCourses.length} курса)`);
  const accessMonths = plan === 'single' ? course.validityMonths : packageCourses[0]?.validityMonths ?? course.validityMonths;
  const accessUntilDate = Date.now() + accessMonths * MONTH;
  const cardValid = num.replace(/\s/g, '').length >= 12 && exp.length >= 5 && cvc.length === 3;
  const valid = method === 'sbp' ? true : cardValid;

  const pay = () => {
    if (!valid || !me) return;
    setStage('processing');
    timeoutRef.current = setTimeout(() => {
      dispatch({
        type: 'PURCHASE',
        studentId: me.id,
        courseIds: plan === 'single' ? [course.id] : packageCourses.map((c) => c.id),
        amount,
        item,
        purpose,
        method: method === 'card' ? 'Карта' : 'СБП',
      });
      setStage('done');
    }, 1500);
  };

  return (
    <Modal onClose={stage === 'processing' ? () => undefined : onClose} width="max-w-lg" labelledBy="pay-title">
      {stage === 'form' && (
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-display text-[10.5px] tracking-[0.24em]" style={{ color: d.color }}>
                ОФОРМЛЕНИЕ ДОСТУПА
              </p>
              <h3 id="pay-title" className="font-display font-700 text-xl text-ink mt-1.5">
                {course.title}
              </h3>
            </div>
            <button onClick={onClose} className="rounded-md p-2 text-inkmut hover:bg-ink/6 hover:text-ink transition-colors" aria-label="Закрыть">
              <IconClose className="w-5 h-5" />
            </button>
          </div>

          <p className="font-display text-[10.5px] tracking-[0.22em] text-inksoft mt-6 mb-2.5">ТАРИФ</p>
          <div className="space-y-2">
            <button
              onClick={() => setPlan('single')}
              className={`w-full flex items-center justify-between rounded-lg border-2 px-4 py-3 text-left transition-all ${
                plan === 'single' ? 'border-pine-900 bg-pine-900/4' : 'border-line bg-card hover:border-ink/30'
              }`}
            >
              <span>
                <span className="block text-[13.5px] font-bold text-ink">Только этот курс</span>
                <span className="text-[11.5px] text-inksoft">
                  доступ на {course.validityMonths} {monthWord(course.validityMonths)}
                </span>
              </span>
              <span className="font-display font-700 text-[15px] text-ink">{fmtRub(course.price)}</span>
            </button>
            {hasPackage && (
              <button
                onClick={() => setPlan('package')}
                className={`w-full flex items-center justify-between rounded-lg border-2 px-4 py-3 text-left transition-all ${
                  plan === 'package' ? 'border-pine-900 bg-pine-900/4' : 'border-line bg-card hover:border-ink/30'
                }`}
              >
                <span>
                  <span className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
                    Всё направление «{d.label}»
                    <span className="rounded-full bg-coral/12 px-2 py-0.5 text-[10px] font-bold text-coral">−20%</span>
                  </span>
                  <span className="text-[11.5px] text-inksoft">{packageCourses.length} курса(ов) одной покупкой</span>
                </span>
                <span className="font-display font-700 text-[15px] text-ink">{fmtRub(packagePrice)}</span>
              </button>
            )}
          </div>

          <div className="mt-6 rounded-lg border border-dashed border-ink/25 bg-paper px-4 py-3.5 space-y-1.5">
            <p className="text-[12px] text-inksoft leading-snug">
              <span className="font-display text-[9.5px] tracking-[0.22em] text-inkmut mr-2.5">ПОЛУЧАТЕЛЬ</span>
              {SELLER.status} · <span className="font-semibold text-ink">{SELLER.name}</span> · ИНН {SELLER.inn}
            </p>
            <p className="text-[12px] text-inksoft leading-snug">
              <span className="font-display text-[9.5px] tracking-[0.22em] text-inkmut mr-2.5">НАЗНАЧЕНИЕ</span>
              <span className="font-semibold text-ink">«{purpose}»</span>
            </p>
          </div>

          <p className="font-display text-[10.5px] tracking-[0.22em] text-inksoft mt-6 mb-2.5">СПОСОБ ОПЛАТЫ</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMethod('card')}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-[13px] font-bold transition-all ${
                method === 'card' ? 'border-pine-900 bg-pine-900/4 text-ink' : 'border-line bg-card text-inksoft hover:border-ink/30'
              }`}
            >
              <IconCard className="w-4 h-4" /> Карта
            </button>
            <button
              onClick={() => setMethod('sbp')}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-[13px] font-bold transition-all ${
                method === 'sbp' ? 'border-pine-900 bg-pine-900/4 text-ink' : 'border-line bg-card text-inksoft hover:border-ink/30'
              }`}
            >
              <IconQr className="w-4 h-4" /> СБП · QR
            </button>
          </div>

          <div className="mt-4">
            {method === 'card' ? (
              <div className="space-y-2.5">
                <input
                  value={num}
                  onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '))}
                  placeholder="0000 0000 0000 0000"
                  inputMode="numeric"
                  className="w-full rounded-lg border border-line bg-card px-4 py-3 font-display text-[15px] tracking-wider text-ink outline-none placeholder:text-inkmut/50 focus:border-pine-700 transition-colors"
                  aria-label="Номер карты"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    value={exp}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setExp(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
                    }}
                    placeholder="ММ/ГГ"
                    inputMode="numeric"
                    className="rounded-lg border border-line bg-card px-4 py-3 font-display text-[15px] text-ink outline-none placeholder:text-inkmut/50 focus:border-pine-700 transition-colors"
                    aria-label="Срок действия карты"
                  />
                  <input
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="CVC"
                    type="password"
                    inputMode="numeric"
                    className="rounded-lg border border-line bg-card px-4 py-3 font-display text-[15px] text-ink outline-none placeholder:text-inkmut/50 focus:border-pine-700 transition-colors"
                    aria-label="CVC код"
                  />
                </div>
                <p className="text-[11px] text-inkmut">Демо-режим: введите любые 16 цифр — деньги не спишутся.</p>
              </div>
            ) : (
              <div className="flex items-center gap-4 rounded-lg border border-line bg-card p-4">
                {state.settings.qr ? (
                  <img
                    src={state.settings.qr}
                    alt="QR-код для оплаты"
                    className="w-32 h-32 shrink-0 rounded-lg border border-line bg-white object-contain p-1"
                  />
                ) : (
                  <FakeQr />
                )}
                <p className="text-[12.5px] text-inksoft leading-relaxed">
                  Отсканируй QR в приложении банка и подтверди платёж на имя: <b className="text-ink">{SELLER.name}</b> ({SELLER.status.toLowerCase()}, ИНН {SELLER.inn}). В демо оплата проходит автоматически.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={pay}
            disabled={!valid}
            className="mt-6 w-full rounded-lg bg-pine-900 py-3.5 font-display text-[14px] font-700 tracking-wide text-paper transition-all hover:bg-pine-700 disabled:opacity-40"
          >
            {amount > 0 ? `ОПЛАТИТЬ ${fmtRub(amount)}` : 'ОТКРЫТЬ БЕСПЛАТНО'}
          </button>
          <p className="text-center text-[11px] text-inkmut mt-3">Нажимая кнопку, вы соглашаетесь с условиями оферты (демо)</p>
        </div>
      )}

      {stage === 'processing' && (
        <div className="p-10 text-center">
          <Spinner className="w-10 h-10 text-pine-700 mx-auto" />
          <p className="font-display font-700 text-ink mt-5">Обрабатываем платёж…</p>
          <p className="text-[13px] text-inksoft mt-1.5">Обычно это занимает пару секунд</p>
        </div>
      )}

      {stage === 'done' && (
        <div className="p-8 sm:p-10 text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-mint/14">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-mint)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
              <path d="M4.5 12.5l5 5 10-11" pathLength={100} className="draw-path" />
            </svg>
          </span>
          <h3 className="font-display font-900 text-2xl text-ink mt-5">Оплата прошла!</h3>
          <p className="text-[13.5px] text-inksoft mt-2 max-w-xs mx-auto leading-relaxed">
            «{item}» открыт в твоём кабинете. Уроки уже доступны — можно начинать прямо сейчас.
          </p>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-mint/12 px-3 py-1 text-[12px] font-bold text-mint mt-3">
            <IconClock className="w-3.5 h-3.5" /> Доступ до {fmtDate(accessUntilDate)} ({accessMonths} {monthWord(accessMonths)})
          </p>
          <p className="text-[11.5px] text-inkmut mt-3">Чек от самозанятого ({SELLER.name}) придёт на почту — в демо письма не отправляются.</p>
          <div className="mt-7 flex justify-center gap-3">
            <button onClick={onClose} className="rounded-lg border border-ink/15 px-5 py-2.5 text-[13.5px] font-bold text-ink hover:border-ink/40 transition-colors">
              Закрыть
            </button>
            <button onClick={onDone} className="rounded-lg bg-pine-900 px-5 py-2.5 text-[13.5px] font-bold text-paper hover:bg-pine-700 transition-colors">
              Перейти к курсу
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ================= кабинет ученика ================= */

export default function StudentView() {
  const { state, me, dispatch } = useStore();
  const [tab, setTab] = useState<DirectionId>('count');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [lesson, setLesson] = useState<{ course: Course; lesson: Lesson } | null>(null);

  const published = useMemo(() => state.courses.filter((c) => c.published), [state.courses]);

  const counts = useMemo(() => {
    const rec = { count: 0, memory: 0, logic: 0, general: 0 } as Record<DirectionId, number>;
    published.forEach((c) => {
      rec[c.directionId] += 1;
    });
    return rec;
  }, [published]);

  const ownedCounts = useMemo(() => {
    const rec = { count: 0, memory: 0, logic: 0, general: 0 } as Record<DirectionId, number>;
    published.forEach((c) => {
      if (me && canUse(me, c.id, state.settings.trialDays)) rec[c.directionId] += 1;
    });
    return rec;
  }, [published, me, state.settings.trialDays]);

  const tabCourses = useMemo(() => published.filter((c) => c.directionId === tab), [published, tab]);

  if (!me) return null;

  const trial = trialInfo(me, state.settings.trialDays);
  const canAccess = (c: Course) => canUse(me, c.id, state.settings.trialDays);
  const ownedCourses = published.filter(canAccess);
  const totalLessons = ownedCourses.reduce((s, c) => s + c.lessons.length, 0);
  const doneOwned = ownedCourses.reduce((s, c) => s + c.lessons.filter((l) => me.done.includes(l.id)).length, 0);
  const overall = totalLessons === 0 ? 0 : doneOwned / totalLessons;

  const course = courseId ? state.courses.find((c) => c.id === courseId) ?? null : null;
  const purchaseCourse = purchaseId ? state.courses.find((c) => c.id === purchaseId) ?? null : null;

  const hour = new Date().getHours();
  const hello = hour < 5 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  const buyCourse = (c: Course) => {
    if (c.price === 0) {
      dispatch({
        type: 'PURCHASE',
        studentId: me.id,
        courseIds: [c.id],
        amount: 0,
        item: c.title,
        purpose: paymentPurposeFor(c.title),
        method: '—',
      });
    } else {
      setPurchaseId(c.id);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
      <section className="pt-8 sm:pt-10 pb-7 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="font-display text-[11px] tracking-[0.3em] text-inksoft">{hello.toUpperCase()},</p>
          <h1 className="font-display font-900 text-[28px] sm:text-4xl text-ink mt-1.5 leading-tight">
            {me.name.split(' ')[0]}! Мозг готов к тренировке?
          </h1>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-[13px] font-semibold text-ink">
              <IconCoin className="w-4 h-4 text-gold" /> {me.points} очков
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-[13px] font-semibold text-ink">
              <IconFlame className="w-4 h-4 text-orange" /> серия {me.streak} дн.
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-[13px] font-semibold text-ink">
              <IconBook className="w-4 h-4 text-sky" /> {ownedCourses.length} из {published.length} курсов
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-[13px] font-semibold text-ink">
              <IconSpark className="w-4 h-4 text-mint" /> {me.done.length} уроков пройдено
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 md:justify-end">
          <Ring value={overall} size={92} stroke={9} color="var(--color-mint)" label={<span className="font-display text-[15px] text-ink">{Math.round(overall * 100)}%</span>} />
          <div className="text-[12.5px] text-inksoft leading-relaxed">
            <p className="font-bold text-ink text-[13.5px]">общий прогресс</p>
            по доступным курсам
            <br />
            {doneOwned} из {totalLessons} уроков
          </div>
        </div>
      </section>

      {trial.active && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-mint/30 bg-mint/10 px-4 py-3">
          <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-mint" />
          <p className="text-[13.5px] text-ink font-semibold">
            Демо-доступ: ещё {trial.daysLeft} {trial.daysLeft === 1 ? 'день' : 'дня'} — все курсы открыты бесплатно.
          </p>
          <p className="text-[12.5px] text-inksoft">После окончания доступ останется у купленных курсов.</p>
        </div>
      )}
      {!trial.active && ownedCourses.length === 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-coral/30 bg-coral/8 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-coral" />
          <p className="text-[13.5px] text-ink font-semibold">Демо-период завершён.</p>
          <p className="text-[12.5px] text-inksoft">Выберите курс — после оплаты уроки откроются сразу.</p>
        </div>
      )}

      <TabBar tab={tab} setTab={setTab} counts={counts} ownedCounts={ownedCounts} />

      <div key={tab} className="pt-5 pb-1">
        <p className="text-[13.5px] text-inksoft">
          <span className="font-display font-700 text-[12px] tracking-[0.16em]" style={{ color: dirById(tab).color }}>
            {dirById(tab).label} —&nbsp;
          </span>
          {dirById(tab).tagline}
        </p>
      </div>

      <section key={`grid-${tab}`} className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {tabCourses.map((c, i) => (
          <CourseCard
            key={c.id}
            course={c}
            index={i}
            owned={canAccess(c)}
            until={hasAccess(me, c.id) ? me.accessUntil[c.id] ?? null : null}
            isTrial={trial.active && !hasAccess(me, c.id)}
            progress={courseProgress(c, me.done)}
            onOpen={() => setCourseId(c.id)}
            onBuy={() => buyCourse(c)}
          />
        ))}
      </section>

      {tabCourses.length === 0 && (
        <div key={`empty-${tab}`} className="card-rise mt-6 flex flex-col items-center rounded-xl border-2 border-dashed border-ink/15 bg-card/60 px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl" style={{ background: dirById(tab).soft, color: dirById(tab).color }}>
            <IconBook className="w-7 h-7" />
          </span>
          <p className="font-display font-700 text-[16px] text-ink mt-4">«{dirById(tab).label}» — направление в разработке</p>
          <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-inksoft">
            Курсы появятся здесь, как только администратор опубликует их на витрине. Пока можно тренироваться в других разделах — прогресс и очки копятся на общем счёте.
          </p>
          <button
            onClick={() => setTab('count')}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-pine-900 px-5 py-2.5 text-[13px] font-bold text-paper transition-all hover:bg-pine-700 hover:gap-3"
          >
            Перейти к курсам СЧЁТА
            <IconArrowR className="w-4 h-4" />
          </button>
        </div>
      )}

      {course && !purchaseCourse && (
        <CourseModal course={course} onClose={() => setCourseId(null)} onBuy={() => buyCourse(course)} onLesson={(l) => setLesson({ course, lesson: l })} />
      )}

      {purchaseCourse && (
        <PurchaseModal
          course={purchaseCourse}
          onClose={() => setPurchaseId(null)}
          onDone={() => {
            setPurchaseId(null);
            setCourseId(purchaseCourse.id);
          }}
        />
      )}

      {lesson && <LessonModal course={lesson.course} lesson={lesson.lesson} onClose={() => setLesson(null)} />}
    </div>
  );
}
