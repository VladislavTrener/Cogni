/**
 * Экран входа: слева «классная доска» с живым заголовком,
 * справа — выбор демо-роли (ученики с их статусом, преподаватель, администратор).
 */

import { useMemo } from 'react';
import { DIRECTIONS, SEED_COURSES, TEACHER_NAME, canUse, trialInfo } from '../data';
import { useStore } from '../store';
import {
  Glyphs,
  IconArrowR,
  IconChalk,
  IconRefresh,
  IconShield,
  IconUser,
  Logo,
  Scramble,
  Toasts,
  useReducedMotion,
} from '../components';

export default function AuthView() {
  const { state, dispatch } = useStore();
  const reduced = useReducedMotion();

  const words = useMemo(() => DIRECTIONS.map((d) => d.label), []);
  const lessonCount = SEED_COURSES.reduce((s, c) => s + c.lessons.length, 0);

  const login = (userId: string, role: 'student' | 'teacher' | 'admin') => dispatch({ type: 'LOGIN', userId, role });

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.2fr_1fr]">
      {/* ---- левая часть: доска ---- */}
      <div className="relative overflow-hidden bg-pine-950 chalk-grid flex flex-col justify-between px-7 sm:px-12 py-8 lg:min-h-screen">
        <Glyphs />
        <div className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-mint/8 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full bg-orange/8 blur-3xl" />

        <div className="relative z-10">
          <Logo />
        </div>

        <div className="relative z-10 py-10 lg:py-0">
          <p className="font-display text-[11px] tracking-[0.34em] text-pine-100/60 mb-5">ПЛАТФОРМА КОГНИТИВНОГО РАЗВИТИЯ</p>
          <h1 className="font-display font-900 text-paper leading-[1.04] text-3xl sm:text-5xl xl:text-[3.6rem]">
            Тренируем
            <br />
            <span className="text-mint">
              <Scramble words={words} className="text-mint" />
            </span>
            <span className="text-paper/30">&nbsp;_</span>
          </h1>
          <p className="mt-6 max-w-md text-pine-100/75 text-[15px] leading-relaxed">
            Курсы по четырём направлениям — от интервальных тренажёров счёта до рабочей памяти.
            Новички получают {state.settings.trialDays} дня демо-доступа, дальше — оплата на самозанятого.
            Учитель ведёт прогресс, администратор управляет витриной и доступом.
          </p>

          <div className="mt-8 inline-flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-pine-700/70 bg-pine-900/70 px-4 py-3">
            <span className="flex items-center gap-2 text-[13px] text-paper/90">
              <span className="pulse-dot h-2 w-2 rounded-full bg-mint" />
              Прямо сейчас <b className="font-display text-mint">217</b> учеников решают задачи
            </span>
            <span className="hidden sm:block h-4 w-px bg-pine-700" />
            <span className="text-[13px] text-pine-100/60">
              {SEED_COURSES.length} курсов · {lessonCount} уроков · 9 тренажёров · метод Лейтнера
            </span>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-pine-100/45">
          <span>Интерактивный прототип — платежи не настоящие</span>
          <span className="hidden sm:inline">·</span>
          <span>данные хранятся локально в браузере</span>
        </div>
      </div>

      {/* ---- правая часть: вход ---- */}
      <div className="paper-grid flex items-center justify-center px-5 py-12 lg:py-8">
        <div className="w-full max-w-md">
          <div className="mb-7">
            <p className="font-display text-[11px] tracking-[0.3em] text-inksoft mb-2">ВХОД В КАБИНЕТ</p>
            <h2 className="font-display font-700 text-2xl text-ink">Кто сегодня занимается?</h2>
          </div>

          <div className="space-y-2.5">
            {state.students.map((student, i) => {
              const trial = trialInfo(student, state.settings.trialDays);
              const activeCourses = state.courses.filter((c) => canUse(student, c.id, state.settings.trialDays)).length;
              return (
                <button
                  key={student.id}
                  onClick={() => login(student.id, 'student')}
                  className="card-rise group w-full flex items-center gap-4 rounded-xl border border-line bg-card px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-ink/25"
                  style={{ ['--d' as string]: `${i * 70}ms` }}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg font-display font-700 text-paper text-sm" style={{ background: student.color }}>
                    {student.name.split(' ').map((w) => w[0]).join('')}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-ink">{student.name}</span>
                      <span className="rounded-full bg-ink/6 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-inksoft uppercase">
                        ученик · гр. {student.group}
                      </span>
                      {trial.active && (
                        <span className="rounded-full bg-mint/14 px-2 py-0.5 text-[10px] font-bold tracking-wide text-mint uppercase">
                          демо · ещё {trial.daysLeft} дн.
                        </span>
                      )}
                    </span>
                    <span className="block text-[12.5px] text-inksoft truncate">
                      {activeCourses > 0
                        ? `доступно курсов: ${activeCourses} · есть прогресс`
                        : trial.active
                          ? 'демо-доступ: все курсы открыты бесплатно'
                          : 'демо-период завершён · курсы по оплате'}
                    </span>
                  </span>
                  <span className="text-inkmut transition-all group-hover:text-ink group-hover:translate-x-1">
                    <IconArrowR className="w-5 h-5" />
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => login('teacher', 'teacher')}
              className="card-rise group w-full flex items-center gap-4 rounded-xl border border-line bg-card px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-ink/25"
              style={{ ['--d' as string]: '420ms' }}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-pine-800 text-pine-100">
                <IconChalk className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-bold text-ink">{TEACHER_NAME}</span>
                  <span className="rounded-full bg-mint/12 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-mint uppercase">преподаватель</span>
                </span>
                <span className="block text-[12.5px] text-inksoft">прогресс · статусы курсов · ученики и оплаты</span>
              </span>
              <span className="text-inkmut transition-all group-hover:text-ink group-hover:translate-x-1">
                <IconArrowR className="w-5 h-5" />
              </span>
            </button>

            <button
              onClick={() => login('admin', 'admin')}
              className="card-rise group w-full flex items-center gap-4 rounded-xl border border-line bg-card px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-ink/25"
              style={{ ['--d' as string]: '490ms' }}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-paper">
                <IconShield className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-bold text-ink">Алексей Ким</span>
                  <span className="rounded-full bg-coral/12 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-coral uppercase">администратор</span>
                </span>
                <span className="block text-[12.5px] text-inksoft">цены · сроки доступа · платежи · пользователи</span>
              </span>
              <span className="text-inkmut transition-all group-hover:text-ink group-hover:translate-x-1">
                <IconArrowR className="w-5 h-5" />
              </span>
            </button>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-lg border border-dashed border-ink/20 px-4 py-3">
            <p className="text-[12.5px] text-inksoft leading-snug max-w-[240px]">
              Это демо: роли переключаются без пароля, прогресс сохраняется в браузере.
            </p>
            <button
              onClick={() => {
                dispatch({ type: 'RESET' });
                dispatch({ type: 'TOAST', text: 'Демо-данные сброшены к исходным', tone: 'info' });
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-ink/15 px-3 py-1.5 text-[12px] font-semibold text-inksoft hover:text-ink hover:border-ink/35 transition-colors"
            >
              <IconRefresh className="w-3.5 h-3.5" />
              Сбросить
            </button>
          </div>

          <div className="mt-7 flex items-center gap-2 text-[11px] text-inkmut">
            <IconUser className="w-3.5 h-3.5" />
            демо-доступ {state.settings.trialDays} дня для новичков · оплата на {state.settings.trialDays > 0 ? 'самозанятого' : ''} · {reduced ? 'анимации отключены' : 'живой прототип'}
          </div>
        </div>
      </div>

      <Toasts />
      <div className="noise-layer" />
    </div>
  );
}
