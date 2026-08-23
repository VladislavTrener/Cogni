/**
 * Кабинет преподавателя: прогресс учеников (с отметками),
 * статусы курсов (read-only) и список учеников с оплатами и сортировкой.
 */

import { useMemo, useState } from 'react';
import { Course, DIRECTIONS, Student, TEACHER_NAME, canUse, dirById, fmtDate, fmtRub, hasAccess, trialInfo } from '../data';
import { useStore } from '../store';
import { Bar, IconCheck, IconCoin, IconFlame, Reveal, Ring } from '../components';

type TeacherTab = 'progress' | 'courses' | 'payments';

function progressOf(s: Student, courses: Course[], trialDays: number) {
  const owned = courses.filter((c) => canUse(s, c.id, trialDays));
  const total = owned.reduce((sum, c) => sum + c.lessons.length, 0);
  const done = owned.reduce((sum, c) => sum + c.lessons.filter((l) => s.done.includes(l.id)).length, 0);
  return { total, done, value: total === 0 ? 0 : done / total, ownedCount: owned.length };
}

function CoursesStatusTable({ courses, students, trialDays }: { courses: Course[]; students: Student[]; trialDays: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-card">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-[0.14em] text-inkmut">
            <th className="px-5 py-3.5 font-bold">Курс</th>
            <th className="px-5 py-3.5 font-bold">Цена</th>
            <th className="px-5 py-3.5 font-bold">Срок</th>
            <th className="px-5 py-3.5 font-bold">Учеников</th>
            <th className="px-5 py-3.5 font-bold w-[220px]">Средний прогресс</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => {
            const d = dirById(c.directionId);
            const holders = students.filter((s) => canUse(s, c.id, trialDays));
            const avg =
              holders.length === 0
                ? 0
                : holders.reduce((sum, s) => {
                    const done = c.lessons.filter((l) => s.done.includes(l.id)).length;
                    return sum + done / c.lessons.length;
                  }, 0) / holders.length;
            return (
              <tr key={c.id} className="border-b border-line/60 last:border-0 text-[13.5px] hover:bg-ink/3">
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-[3px] rotate-45" style={{ background: d.color }} />
                    <span>
                      <span className="block font-bold text-ink">{c.title}</span>
                      <span className="text-[11.5px] text-inkmut">{d.label} · {c.lessons.length} урока</span>
                    </span>
                  </span>
                </td>
                <td className="px-5 py-3.5 font-display font-700 text-ink">{fmtRub(c.price)}</td>
                <td className="px-5 py-3.5 text-inksoft">{c.validityMonths} мес.</td>
                <td className="px-5 py-3.5 font-display font-700 text-ink">{holders.length}</td>
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-2.5">
                    <Bar value={avg} color={d.color} />
                    <span className="text-[12px] font-bold text-inksoft w-9 text-right">{Math.round(avg * 100)}%</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function TeacherView() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState<TeacherTab>('progress');
  const [selectedId, setSelectedId] = useState(state.students[0]?.id ?? '');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<'name' | 'status'>('name');

  const trialDays = state.settings.trialDays;
  const published = useMemo(() => state.courses.filter((c) => c.published), [state.courses]);

  const student = useMemo(
    () => state.students.find((s) => s.id === selectedId) ?? state.students[0],
    [state.students, selectedId],
  );

  const statusOf = (s: Student): number => {
    const paid = published.some((c) => hasAccess(s, c.id));
    if (paid) return 2;
    return trialInfo(s, trialDays).active ? 1 : 0;
  };

  const sortedStudents = useMemo(() => {
    const list = [...state.students];
    list.sort((a, b) => {
      if (sortBy === 'status') return statusOf(b) - statusOf(a) || a.name.localeCompare(b.name, 'ru');
      return a.name.localeCompare(b.name, 'ru');
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.students, sortBy, published, trialDays]);

  if (!student) return null;

  const selProgress = progressOf(student, published, trialDays);

  const dirProgress = (s: Student, dirId: string) => {
    const owned = published.filter((c) => c.directionId === dirId && canUse(s, c.id, trialDays));
    const total = owned.reduce((sum, c) => sum + c.lessons.length, 0);
    const done = owned.reduce((sum, c) => sum + c.lessons.filter((l) => s.done.includes(l.id)).length, 0);
    return { total, done };
  };

  const tabs: { id: TeacherTab; label: string }[] = [
    { id: 'progress', label: 'Прогресс' },
    { id: 'courses', label: 'Курсы' },
    { id: 'payments', label: 'Ученики и оплаты' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
      <section className="pt-8 sm:pt-10 pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-[11px] tracking-[0.3em] text-inksoft">КАБИНЕТ ПРЕПОДАВАТЕЛЯ</p>
          <h1 className="font-display font-900 text-[26px] sm:text-3xl text-ink mt-1.5">{TEACHER_NAME}</h1>
          <p className="text-[13.5px] text-inksoft mt-2">
            Группы А–В · {state.students.length} учеников · отметки видны ученикам сразу
          </p>
        </div>
      </section>

      <div className="flex gap-1 border-b border-line overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative whitespace-nowrap px-4 sm:px-5 py-3 font-display text-[12.5px] tracking-[0.1em] transition-colors ${
              tab === t.id ? 'text-ink' : 'text-inkmut hover:text-inksoft'
            }`}
          >
            {t.label.toUpperCase()}
            {tab === t.id && <span className="absolute bottom-0 inset-x-3 h-[3px] rounded-t-full bg-pine-800" />}
          </button>
        ))}
      </div>

      {tab === 'progress' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr] items-start">
          <Reveal>
            <div className="rounded-xl border border-line bg-card p-2.5">
              <p className="font-display text-[10.5px] tracking-[0.22em] text-inksoft px-2.5 pt-2 pb-2.5">УЧЕНИКИ</p>
              <div className="space-y-1">
                {state.students.map((s) => {
                  const p = progressOf(s, published, trialDays);
                  const active = s.id === student.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={`w-full rounded-lg px-2.5 py-2.5 text-left transition-all ${active ? 'bg-pine-900 text-paper' : 'hover:bg-ink/5'}`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-display text-[12px] font-700 text-paper" style={{ background: s.color }}>
                          {s.name.split(' ').map((w) => w[0]).join('')}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={`block text-[13.5px] font-bold truncate ${active ? 'text-paper' : 'text-ink'}`}>{s.name}</span>
                          <span className={`text-[11.5px] ${active ? 'text-pine-100/70' : 'text-inkmut'}`}>
                            группа {s.group} · {s.age} лет · {p.ownedCount} курс(а)
                          </span>
                        </span>
                        <span className={`font-display text-[13px] font-700 ${active ? 'text-mint' : 'text-inksoft'}`}>{Math.round(p.value * 100)}%</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Reveal>

          <div className="space-y-5">
            <Reveal delay={60}>
              <div className="rounded-xl border border-line bg-card p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-5">
                  <span className="flex h-16 w-16 items-center justify-center rounded-xl font-display text-lg font-900 text-paper" style={{ background: student.color }}>
                    {student.name.split(' ').map((w) => w[0]).join('')}
                  </span>
                  <div className="flex-1 min-w-[180px]">
                    <h2 className="font-display font-900 text-xl text-ink">{student.name}</h2>
                    <p className="text-[13px] text-inksoft mt-1">
                      {student.age} лет · группа {student.group} · серия {student.streak} дн.
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/12 px-3 py-1 text-[12px] font-bold text-[#8a6606]">
                        <IconCoin className="w-3.5 h-3.5" /> {student.points} очков
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange/12 px-3 py-1 text-[12px] font-bold text-[#b05f1e]">
                        <IconFlame className="w-3.5 h-3.5" /> {selProgress.done}/{selProgress.total} уроков
                      </span>
                      {trialInfo(student, trialDays).active ? (
                        <span className="rounded-full bg-sky/12 px-3 py-1 text-[12px] font-bold text-sky">
                          демо · ещё {trialInfo(student, trialDays).daysLeft} дн.
                        </span>
                      ) : selProgress.ownedCount > 0 ? (
                        <span className="rounded-full bg-mint/12 px-3 py-1 text-[12px] font-bold text-mint">оплачено</span>
                      ) : (
                        <span className="rounded-full bg-coral/12 px-3 py-1 text-[12px] font-bold text-coral">без доступа</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <Ring value={selProgress.value} size={74} stroke={7} color={student.color} label={<span className="font-display text-[13px] text-ink">{Math.round(selProgress.value * 100)}%</span>} />
                    <span className="text-[11px] text-inkmut">общий прогресс</span>
                  </div>
                  <button
                    onClick={() => dispatch({ type: 'TEACHER_AWARD', studentId: student.id, points: 10 })}
                    className="rounded-lg border border-ink/15 px-4 py-2.5 text-[13px] font-bold text-ink transition-all hover:border-mint hover:text-mint hover:bg-mint/8"
                  >
                    +10 очков за старание
                  </button>
                </div>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="rounded-xl border border-line bg-card p-5 sm:p-6">
                <p className="font-display text-[10.5px] tracking-[0.22em] text-inksoft mb-4">ПРОГРЕСС ПО НАПРАВЛЕНИЯМ</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {DIRECTIONS.map((d) => {
                    const p = dirProgress(student, d.id);
                    return (
                      <div key={d.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="inline-flex items-center gap-2 text-[12.5px] font-bold text-ink">
                            <span className="h-2 w-2 rounded-[3px] rotate-45" style={{ background: d.color }} />
                            {d.label}
                          </span>
                          <span className="text-[12px] font-semibold text-inksoft">{p.total === 0 ? 'нет доступа' : `${p.done}/${p.total}`}</span>
                        </div>
                        <Bar value={p.total === 0 ? 0 : p.done / p.total} color={d.color} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reveal>

            <Reveal delay={160}>
              <div className="rounded-xl border border-line bg-card p-5 sm:p-6">
                <p className="font-display text-[10.5px] tracking-[0.22em] text-inksoft mb-4">КУРСЫ И ОТМЕТКИ</p>
                {selProgress.ownedCount === 0 && (
                  <p className="text-[13.5px] text-inksoft">У ученика пока нет доступа к курсам — витрина для него открыта, покупок нет.</p>
                )}
                <div className="space-y-5">
                  {published
                    .filter((c) => canUse(student, c.id, trialDays))
                    .map((c) => {
                      const done = c.lessons.filter((l) => student.done.includes(l.id)).length;
                      return (
                        <div key={c.id}>
                          <div className="flex items-center justify-between mb-2.5">
                            <h3 className="font-display font-700 text-[14.5px] text-ink">{c.title}</h3>
                            <span className="text-[12px] font-bold text-inksoft">{done}/{c.lessons.length}</span>
                          </div>
                          <ul className="space-y-1.5">
                            {c.lessons.map((l) => {
                              const isDone = student.done.includes(l.id);
                              return (
                                <li key={l.id}>
                                  <button
                                    onClick={() => dispatch({ type: 'TEACHER_SET_LESSON', studentId: student.id, lessonId: l.id, done: !isDone })}
                                    className="group flex w-full items-center gap-3 rounded-lg border border-line bg-paper px-3.5 py-2.5 text-left transition-all hover:border-ink/25"
                                  >
                                    <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-2 transition-all ${isDone ? 'border-mint bg-mint text-paper' : 'border-ink/25 bg-card group-hover:border-ink/50'}`}>
                                      {isDone && <IconCheck className="w-3 h-3" />}
                                    </span>
                                    <span className={`flex-1 text-[13.5px] ${isDone ? 'text-inksoft line-through decoration-ink/30' : 'text-ink font-semibold'}`}>{l.title}</span>
                                    <span className="text-[11.5px] text-inkmut">тренажёр</span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                </div>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="rounded-xl border border-dashed border-ink/20 bg-paper p-5">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="font-display text-[10.5px] tracking-[0.22em] text-inksoft">ЗАМЕТКА ПРЕПОДАВАТЕЛЯ · {student.name}</p>
                  <span className="text-[11px] text-inkmut">хранится локально в демо</span>
                </div>
                <textarea
                  value={notes[student.id] ?? ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [student.id]: e.target.value }))}
                  placeholder="Например: быстро считает, но торопится — предложить раунд на время…"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-line bg-card px-4 py-3 text-[13.5px] text-ink outline-none placeholder:text-inkmut/60 focus:border-pine-700 transition-colors"
                />
              </div>
            </Reveal>
          </div>
        </div>
      )}

      {tab === 'courses' && (
        <Reveal key="t-courses" className="mt-6">
          <CoursesStatusTable courses={published} students={state.students} trialDays={trialDays} />
          <p className="mt-3 text-[12px] text-inkmut px-1">
            Цены, сроки доступа и демо-период настраивает администратор — здесь только актуальный статус.
          </p>
        </Reveal>
      )}

      {tab === 'payments' && (
        <Reveal key="t-pay" className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13.5px] text-inksoft">
              Всего учеников: <b className="text-ink">{state.students.length}</b> · оплачено: <b className="text-ink">{state.students.filter((s) => statusOf(s) === 2).length}</b> · в демо: <b className="text-ink">{state.students.filter((s) => statusOf(s) === 1).length}</b>
            </p>
            <div className="flex gap-2">
              {(['name', 'status'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setSortBy(k)}
                  className={`rounded-lg border px-3.5 py-2 text-[12.5px] font-bold transition-colors ${
                    sortBy === k ? 'border-pine-900 bg-pine-900 text-paper' : 'border-line bg-card text-inksoft hover:border-ink/30'
                  }`}
                >
                  По {k === 'name' ? 'имени' : 'оплате'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-card">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.14em] text-inkmut">
                  <th className="px-5 py-3.5 font-bold">Ученик</th>
                  <th className="px-5 py-3.5 font-bold">Группа</th>
                  <th className="px-5 py-3.5 font-bold">Оплаченные курсы</th>
                  <th className="px-5 py-3.5 font-bold">Статус</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((s) => {
                  const paid = published.filter((c) => hasAccess(s, c.id));
                  const trial = trialInfo(s, trialDays);
                  const st = statusOf(s);
                  return (
                    <tr key={s.id} className="border-b border-line/60 last:border-0 text-[13.5px] hover:bg-ink/3">
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg font-display text-[12px] font-700 text-paper" style={{ background: s.color }}>
                            {s.name.split(' ').map((w) => w[0]).join('')}
                          </span>
                          <span className="font-bold text-ink">{s.name}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-inksoft">{s.group} · {s.age} лет</td>
                      <td className="px-5 py-3.5">
                        {paid.length === 0 ? (
                          <span className="text-inkmut">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-[360px]">
                            {paid.map((c) => (
                              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-[11.5px] font-semibold text-ink">
                                {c.title}
                                {s.accessUntil[c.id] && <span className="text-inkmut">· до {fmtDate(s.accessUntil[c.id])}</span>}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {st === 2 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/12 px-2.5 py-1 text-[11px] font-bold text-mint">
                            <span className="h-1.5 w-1.5 rounded-full bg-mint" /> оплачено
                          </span>
                        ) : st === 1 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky/12 px-2.5 py-1 text-[11px] font-bold text-sky">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky" /> демо · {trial.daysLeft} дн.
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-coral/10 px-2.5 py-1 text-[11px] font-bold text-coral">
                            <span className="h-1.5 w-1.5 rounded-full bg-coral" /> нет доступа
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}
    </div>
  );
}
