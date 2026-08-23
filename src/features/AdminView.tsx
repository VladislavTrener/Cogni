/**
 * Панель администратора: управление доступом (цены, сроки, демо-период),
 * финансы (KPI + платежи) и пользователи (удаление, смена пароля, продление).
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Course,
  DIRECTIONS,
  Promotion,
  SEED_STUDENTS,
  canUse,
  dirById,
  fmtDate,
  fmtRub,
  hasAccess,
  initials,
  promotionCourses,
  promotionPrice,
  trialInfo,
} from '../data';
import { useStore } from '../store';
import { CountUp, IconClose, IconKey, IconQr, IconRefresh, IconSpark, IconTrash, Modal, Reveal, Spark } from '../components';

type AdminTab = 'access' | 'money' | 'promo' | 'users';
type UserSort = { key: 'name' | 'sum' | 'count'; dir: 1 | -1 };

function Kpi({ label, value, format, spark, color, hint, delay }: { label: string; value: number; format?: (n: number) => string; spark: number[]; color: string; hint: string; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div className="group rounded-xl border border-line bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(8,23,17,0.35)]">
        <div className="flex items-start justify-between">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-inksoft">{label}</p>
          <Spark data={spark} color={color} className="w-20 h-7 opacity-70 group-hover:opacity-100 transition-opacity" />
        </div>
        <CountUp value={value} format={format} className="font-display font-900 text-[26px] text-ink mt-2 block" />
        <p className="text-[11.5px] text-inkmut mt-1.5">{hint}</p>
      </div>
    </Reveal>
  );
}

function NumInput({ value, suffix, onCommit, label, min = 0 }: { value: number; suffix: string; onCommit: (n: number) => void; label: string; min?: number }) {
  const [val, setVal] = useState(String(value));
  useEffect(() => setVal(String(value)), [value]);
  const commit = () => {
    const n = Math.max(min, Number(val.replace(/\D/g, '')) || 0);
    if (n !== value) onCommit(n);
    else setVal(String(value));
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        inputMode="numeric"
        aria-label={label}
        className="w-20 rounded-md border border-line bg-paper px-2.5 py-1.5 text-right font-display text-[13px] font-700 text-ink outline-none focus:border-pine-700 transition-colors"
      />
      <span className="text-[12px] font-bold text-inksoft">{suffix}</span>
    </span>
  );
}

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`relative h-6 w-11 rounded-full transition-colors duration-300 ${on ? 'bg-mint' : 'bg-ink/20'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all duration-300 ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

/** Редактор акции: состав (курсы или направление) + скидка (фикс. цена или %) */
function PromotionEditor({
  initial,
  courses,
  onSave,
  onClose,
}: {
  initial: Promotion | null;
  courses: Course[];
  onSave: (p: Promotion) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [mode, setMode] = useState<'courses' | 'direction'>(initial && initial.courseIds.length === 0 && initial.directionId ? 'direction' : 'courses');
  const [courseIds, setCourseIds] = useState<string[]>(initial?.courseIds ?? []);
  const [directionId, setDirectionId] = useState<string>(initial?.directionId ?? 'count');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>(initial?.discountType ?? 'percent');
  const [discountValue, setDiscountValue] = useState(String(initial?.discountValue ?? 20));

  const draft: Promotion = {
    id: initial?.id ?? `promo-${Date.now()}`,
    title: title.trim(),
    active: initial?.active ?? true,
    courseIds: mode === 'courses' ? courseIds : [],
    directionId: mode === 'direction' ? (directionId as Promotion['directionId']) : undefined,
    discountType,
    discountValue: Math.max(0, Number(discountValue.replace(/\D/g, '')) || 0),
  };

  const previewCourses = promotionCourses(draft, courses);
  const previewTotal = previewCourses.reduce((s, c) => s + c.price, 0);
  const previewPrice = promotionPrice(draft, courses);

  const toggleCourse = (id: string) =>
    setCourseIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const valid = draft.title.length > 0 && previewCourses.length > 0 && draft.discountValue > 0;

  return (
    <Modal onClose={onClose} width="max-w-2xl" labelledBy="promo-title">
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between">
          <h3 id="promo-title" className="font-display font-900 text-xl text-ink">
            {initial ? 'Редактировать акцию' : 'Новая акция'}
          </h3>
          <button onClick={onClose} className="rounded-md p-2 text-inkmut hover:bg-ink/6 hover:text-ink transition-colors" aria-label="Закрыть">
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-inksoft">Название акции</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Умножение + Сложение"
            className="mt-1.5 w-full rounded-lg border border-line bg-card px-4 py-2.5 text-[14px] text-ink outline-none placeholder:text-inkmut/50 focus:border-pine-700 transition-colors"
          />
        </label>

        {/* состав */}
        <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.14em] text-inksoft">Что входит в акцию</p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setMode('courses')}
            className={`rounded-md border px-3.5 py-2 text-[12.5px] font-bold transition-colors ${
              mode === 'courses' ? 'border-pine-700 bg-pine-900 text-paper' : 'border-line bg-card text-inksoft hover:border-ink/30'
            }`}
          >
            Выбрать курсы вручную
          </button>
          <button
            onClick={() => setMode('direction')}
            className={`rounded-md border px-3.5 py-2 text-[12.5px] font-bold transition-colors ${
              mode === 'direction' ? 'border-pine-700 bg-pine-900 text-paper' : 'border-line bg-card text-inksoft hover:border-ink/30'
            }`}
          >
            Всё направление
          </button>
        </div>

        {mode === 'courses' ? (
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {courses
              .filter((c) => c.published)
              .map((c) => {
                const on = courseIds.includes(c.id);
                const d = dirById(c.directionId);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCourse(c.id)}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[12.5px] transition-colors ${
                      on ? 'border-pine-700 bg-pine-900/5 text-ink' : 'border-line bg-card text-inksoft hover:border-ink/30'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        on ? 'border-pine-700 bg-pine-700 text-paper' : 'border-ink/25'
                      }`}
                    >
                      {on && <span className="text-[9px] leading-none">✓</span>}
                    </span>
                    <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: d.color }} />
                    <span className="flex-1 truncate font-semibold">{c.title}</span>
                    <span className="text-inkmut">{fmtRub(c.price)}</span>
                  </button>
                );
              })}
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {DIRECTIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDirectionId(d.id)}
                className={`rounded-md border px-3.5 py-2 text-[12.5px] font-bold transition-colors ${
                  directionId === d.id ? 'border-pine-700 bg-pine-900 text-paper' : 'border-line bg-card text-inksoft hover:border-ink/30'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}

        {/* скидка */}
        <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.14em] text-inksoft">Выгода</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setDiscountType('percent')}
              className={`rounded-md border px-3.5 py-2 text-[12.5px] font-bold transition-colors ${
                discountType === 'percent' ? 'border-pine-700 bg-pine-900 text-paper' : 'border-line bg-card text-inksoft hover:border-ink/30'
              }`}
            >
              Скидка, %
            </button>
            <button
              onClick={() => setDiscountType('fixed')}
              className={`rounded-md border px-3.5 py-2 text-[12.5px] font-bold transition-colors ${
                discountType === 'fixed' ? 'border-pine-700 bg-pine-900 text-paper' : 'border-line bg-card text-inksoft hover:border-ink/30'
              }`}
            >
              Фикс. цена, ₽
            </button>
          </div>
          <input
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            aria-label="Значение скидки"
            className="w-24 rounded-lg border border-line bg-card px-3 py-2 text-right font-display text-[14px] font-700 text-ink outline-none focus:border-pine-700 transition-colors"
          />
          <span className="text-[13px] font-bold text-inksoft">{discountType === 'percent' ? '%' : '₽ за весь набор'}</span>
        </div>

        {/* предпросмотр */}
        <div className="mt-5 rounded-xl border border-dashed border-ink/20 bg-paper px-4 py-3.5">
          <p className="text-[12px] text-inksoft">
            В акции <b className="text-ink">{previewCourses.length}</b> курс(ов) на сумму{' '}
            <b className="text-ink">{fmtRub(previewTotal)}</b>
          </p>
          <p className="mt-1 text-[14px]">
            Цена для ученика:{' '}
            <b className="font-display text-[18px]" style={{ color: '#1fa97a' }}>
              {fmtRub(previewPrice)}
            </b>
            {previewTotal > 0 && previewPrice < previewTotal && (
              <span className="ml-2 rounded-full bg-mint/12 px-2 py-0.5 text-[11px] font-bold text-mint">
                выгода {fmtRub(previewTotal - previewPrice)}
              </span>
            )}
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-ink/15 px-5 py-2.5 text-[13.5px] font-bold text-ink hover:border-ink/40 transition-colors">
            Отмена
          </button>
          <button
            onClick={() => onSave(draft)}
            disabled={!valid}
            className="rounded-lg bg-pine-900 px-5 py-2.5 text-[13.5px] font-bold text-paper transition-colors hover:bg-pine-700 disabled:opacity-40"
          >
            Сохранить акцию
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminView() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState<AdminTab>('access');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [passId, setPassId] = useState<string | null>(null);
  const [newPass, setNewPass] = useState('');
  const [extendId, setExtendId] = useState<string | null>(null);
  const [userSort, setUserSort] = useState<UserSort>({ key: 'name', dir: 1 });
  /** null — редактор закрыт; 'new' — новая акция; id — редактирование */
  const [promoEdit, setPromoEdit] = useState<string | null>(null);

  const revenue = useMemo(() => state.payments.reduce((s, p) => s + p.amount, 0), [state.payments]);
  const trialDays = state.settings.trialDays;

  /** сумма платежей и число оплаченных курсов по каждому ученику */
  const payStats = useMemo(() => {
    const map: Record<string, { sum: number; count: number }> = {};
    state.students.forEach((s) => {
      map[s.id] = {
        sum: state.payments.filter((p) => p.studentId === s.id).reduce((a, p) => a + p.amount, 0),
        count: state.courses.filter((c) => hasAccess(s, c.id)).length,
      };
    });
    return map;
  }, [state.students, state.payments, state.courses]);

  const sortedStudents = useMemo(() => {
    const list = [...state.students];
    list.sort((a, b) => {
      const pa = payStats[a.id] ?? { sum: 0, count: 0 };
      const pb = payStats[b.id] ?? { sum: 0, count: 0 };
      if (userSort.key === 'name') return a.name.localeCompare(b.name, 'ru') * userSort.dir;
      if (userSort.key === 'sum') return (pa.sum - pb.sum) * userSort.dir;
      return (pa.count - pb.count) * userSort.dir;
    });
    return list;
  }, [state.students, payStats, userSort]);

  const toggleSort = (key: UserSort['key']) =>
    setUserSort((prev) => (prev.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: key === 'name' ? 1 : -1 }));

  const avgProgress = useMemo(() => {
    const published = state.courses.filter((c) => c.published);
    const vals = state.students.map((s) => {
      const owned = published.filter((c) => canUse(s, c.id, trialDays));
      const total = owned.reduce((sum, c) => sum + c.lessons.length, 0);
      if (total === 0) return 0;
      return owned.reduce((sum, c) => sum + c.lessons.filter((l) => s.done.includes(l.id)).length, 0) / total;
    });
    return vals.length === 0 ? 0 : vals.reduce((s, v) => s + v, 0) / vals.length;
  }, [state.students, state.courses, trialDays]);

  const studentById = (id: string) => state.students.find((s) => s.id === id);
  const deleteStudent = deleteId ? studentById(deleteId) : null;
  // passId хранит id аккаунта (подходит и для учеников, и для персонала)
  const passAccount = passId ? state.accounts.find((a) => a.id === passId) ?? null : null;
  const extendStudent = extendId ? studentById(extendId) : null;

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'access', label: 'Доступ и витрина' },
    { id: 'money', label: 'Финансы' },
    { id: 'promo', label: 'Акции' },
    { id: 'users', label: 'Пользователи' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
      <section className="pt-8 sm:pt-10 pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-[11px] tracking-[0.3em] text-inksoft">ПАНЕЛЬ АДМИНИСТРАТОРА</p>
          <h1 className="font-display font-900 text-[26px] sm:text-3xl text-ink mt-1.5">Доступ, финансы, люди</h1>
          <p className="text-[13.5px] text-inksoft mt-2">
            Изменения мгновенно видны ученикам и преподавателю: цена, срок доступа, демо-период.
          </p>
        </div>
        <button
          onClick={() => {
            dispatch({ type: 'RESET' });
            dispatch({ type: 'TOAST', text: 'Демо-данные сброшены к исходным', tone: 'info' });
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-ink/15 px-4 py-2.5 text-[13px] font-bold text-inksoft transition-colors hover:text-coral hover:border-coral/50"
        >
          <IconRefresh className="w-4 h-4" /> Сбросить демо
        </button>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Выручка · февраль" value={revenue} format={(n) => `${Math.round(n).toLocaleString('ru-RU')} ₽`} spark={[1.7, 1.9, 2.3, 2.1, 4.3, revenue / 1000]} color="#1fa97a" hint="живая сумма: платежи учеников добавляются сюда" delay={0} />
        <Kpi label="Учеников" value={state.students.length} spark={[3, 3, 4, 4, 5, state.students.length]} color="#2fa8dc" hint="активных аккаунтов на платформе" delay={70} />
        <Kpi label="Покупок" value={state.payments.length} spark={[1, 2, 2, 3, 4, state.payments.length]} color="#ff8a3d" hint={`включая ${state.payments.filter((p) => p.fresh).length} новых за сессию`} delay={140} />
        <Kpi label="Средний прогресс" value={Math.round(avgProgress * 100)} format={(n) => `${Math.round(n)}%`} spark={[18, 22, 27, 31, 34, Math.max(5, Math.round(avgProgress * 100))]} color="#e8a912" hint="по доступным курсам всех учеников" delay={210} />
      </div>

      <div className="mt-9 flex gap-1 border-b border-line overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative whitespace-nowrap px-4 sm:px-5 py-3 font-display text-[12.5px] tracking-[0.1em] transition-colors ${tab === t.id ? 'text-ink' : 'text-inkmut hover:text-inksoft'}`}
          >
            {t.label.toUpperCase()}
            {tab === t.id && <span className="absolute bottom-0 inset-x-3 h-[3px] rounded-t-full bg-pine-800" />}
          </button>
        ))}
      </div>

      {tab === 'access' && (
        <Reveal key="access" className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-5 rounded-xl border border-line bg-card px-5 py-4">
            <div>
              <p className="font-display text-[10.5px] tracking-[0.22em] text-inksoft">ДЕМО-ПЕРИОД ДЛЯ НОВИЧКОВ</p>
              <p className="text-[12.5px] text-inksoft mt-1">Каждый зарегистрированный впервые получает все курсы бесплатно на этот срок</p>
            </div>
            <div className="ml-auto">
              <NumInput value={trialDays} suffix="дн." min={0} label="Длительность демо-периода" onCommit={(n) => dispatch({ type: 'SET_TRIAL_DAYS', days: n })} />
            </div>
          </div>

          {/* оплата: QR-код, который видят ученики */}
          <div className="rounded-xl border border-line bg-card px-5 py-4">
            <div className="flex flex-wrap items-center gap-5">
              <div className="min-w-[220px] flex-1">
                <p className="font-display text-[10.5px] tracking-[0.22em] text-inksoft">ОПЛАТА · QR-КОД ДЛЯ УЧЕНИКОВ</p>
                <p className="text-[12.5px] text-inksoft mt-1 leading-relaxed">
                  Этот QR показывается ученикам при выборе способа «СБП». Назначение платежа подставляется автоматически:{' '}
                  <b className="text-ink">Когнитив.ПРО курс «название курса»</b>.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-pine-900 px-4 py-2 text-[12.5px] font-bold text-paper transition-colors hover:bg-pine-700">
                    <IconQr className="w-4 h-4" />
                    {state.settings.qr ? 'Заменить QR' : 'Загрузить QR (PNG/JPG)'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith('image/')) {
                          dispatch({ type: 'TOAST', text: 'Нужен файл изображения (PNG или JPG)', tone: 'warn' });
                          return;
                        }
                        if (file.size > 1_500_000) {
                          dispatch({ type: 'TOAST', text: 'Файл больше 1,5 МБ — возьмите QR поменьше', tone: 'warn' });
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => dispatch({ type: 'SET_PAYMENT_QR', dataUrl: String(reader.result) });
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {state.settings.qr && (
                    <button
                      onClick={() => dispatch({ type: 'SET_PAYMENT_QR', dataUrl: null })}
                      className="rounded-lg border border-ink/15 px-4 py-2 text-[12.5px] font-bold text-inksoft transition-colors hover:border-coral hover:text-coral"
                    >
                      Убрать QR
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                {state.settings.qr ? (
                  <img
                    src={state.settings.qr}
                    alt="Текущий QR-код для оплаты"
                    className="h-36 w-36 rounded-lg border border-line bg-white object-contain p-1.5"
                  />
                ) : (
                  <span className="flex h-36 w-36 items-center justify-center rounded-lg border-2 border-dashed border-ink/20 text-center text-[11px] leading-snug text-inkmut">
                    QR не загружен —<br />ученики видят заглушку
                  </span>
                )}
                <span className="text-[10.5px] text-inkmut">так видят ученики</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-card">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.14em] text-inkmut">
                  <th className="px-5 py-3.5 font-bold">Курс</th>
                  <th className="px-5 py-3.5 font-bold">Учеников</th>
                  <th className="px-5 py-3.5 font-bold w-[170px]">Средний прогресс</th>
                  <th className="px-5 py-3.5 font-bold">Цена</th>
                  <th className="px-5 py-3.5 font-bold">Срок</th>
                  <th className="px-5 py-3.5 font-bold">Витрина</th>
                </tr>
              </thead>
              <tbody>
                {state.courses.map((c: Course) => {
                  const d = dirById(c.directionId);
                  const holders = state.students.filter((s) => canUse(s, c.id, trialDays));
                  const avg =
                    holders.length === 0
                      ? 0
                      : holders.reduce((sum, s) => sum + c.lessons.filter((l) => s.done.includes(l.id)).length / c.lessons.length, 0) / holders.length;
                  return (
                    <tr key={c.id} className="border-b border-line/60 last:border-0 text-[13.5px] hover:bg-ink/3">
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-2.5">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-[3px] rotate-45" style={{ background: d.color }} />
                          <span>
                            <span className={`block font-bold ${c.published ? 'text-ink' : 'text-inkmut line-through'}`}>{c.title}</span>
                            <span className="text-[11.5px] text-inkmut">{d.label} · {c.lessons.length} урока · {c.age}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-display font-700 text-ink">{holders.length}</td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-2.5">
                          <span className="block flex-1 h-2 overflow-hidden rounded-full bg-ink/8">
                            <span className="block h-full rounded-full" style={{ width: `${avg * 100}%`, background: d.color, transition: 'width 0.6s ease' }} />
                          </span>
                          <span className="text-[12px] font-bold text-inksoft w-9 text-right">{Math.round(avg * 100)}%</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <NumInput value={c.price} suffix="₽" label={`Цена курса ${c.title}`} onCommit={(n) => dispatch({ type: 'SET_PRICE', courseId: c.id, price: n })} />
                      </td>
                      <td className="px-5 py-3.5">
                        <NumInput value={c.validityMonths} suffix="мес." min={1} label={`Срок доступа курса ${c.title}`} onCommit={(n) => dispatch({ type: 'SET_VALIDITY', courseId: c.id, months: n })} />
                      </td>
                      <td className="px-5 py-3.5">
                        <Switch on={c.published} onToggle={() => dispatch({ type: 'TOGGLE_PUBLISHED', courseId: c.id })} label={`Публикация курса ${c.title}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-inkmut px-1">
            Оплата зачисляется самозанятому; назначение платежа формируется автоматически: «Курс „…“ — Когнитив.Про».
          </p>
        </Reveal>
      )}

      {tab === 'money' && (
        <Reveal key="money" className="mt-6">
          <div className="overflow-x-auto rounded-xl border border-line bg-card">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.14em] text-inkmut">
                  <th className="px-5 py-3.5 font-bold">Дата</th>
                  <th className="px-5 py-3.5 font-bold">Ученик</th>
                  <th className="px-5 py-3.5 font-bold">Назначение</th>
                  <th className="px-5 py-3.5 font-bold">Способ</th>
                  <th className="px-5 py-3.5 font-bold text-right">Сумма</th>
                  <th className="px-5 py-3.5 font-bold">Статус</th>
                </tr>
              </thead>
              <tbody>
                {state.payments.map((p) => (
                  <tr key={p.id} className={`border-b border-line/60 last:border-0 text-[13.5px] hover:bg-ink/3 ${p.fresh ? 'row-new' : ''}`}>
                    <td className="px-5 py-3.5 text-inksoft whitespace-nowrap">{p.date}</td>
                    <td className="px-5 py-3.5 font-bold text-ink whitespace-nowrap">{p.studentName ?? studentById(p.studentId)?.name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-ink max-w-[300px]">{p.purpose}</td>
                    <td className="px-5 py-3.5 text-inksoft">{p.method}</td>
                    <td className="px-5 py-3.5 text-right font-display font-700 text-ink whitespace-nowrap">{fmtRub(p.amount)}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/12 px-2.5 py-1 text-[11px] font-bold text-mint">
                        <span className="h-1.5 w-1.5 rounded-full bg-mint" /> {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {state.payments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-inksoft">Платежей пока нет — совершите покупку в кабинете ученика.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}

      {tab === 'promo' && (
        <Reveal key="promo" className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-inksoft max-w-xl">
              Акции видны ученикам при покупке: можно выбрать акцию или купить один курс. Скидка — вручную (₽) или в процентах, без дат.
            </p>
            <button
              onClick={() => setPromoEdit('new')}
              className="inline-flex items-center gap-2 rounded-lg bg-pine-900 px-4 py-2.5 text-[13px] font-bold text-paper transition-all hover:bg-pine-700 hover:-translate-y-0.5"
            >
              <IconSpark className="w-4 h-4" /> Новая акция
            </button>
          </div>

          {state.promotions.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-ink/15 bg-card/60 px-6 py-12 text-center">
              <p className="font-display font-700 text-[16px] text-ink">Акций пока нет</p>
              <p className="mt-1.5 text-[13.5px] text-inksoft">Создайте первую — она сразу появится у учеников при покупке.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {state.promotions.map((p) => {
                const set = promotionCourses(p, state.courses);
                const total = set.reduce((s, c) => s + c.price, 0);
                const price = promotionPrice(p, state.courses);
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border bg-card p-5 transition-all ${p.active ? 'border-line' : 'border-line opacity-60'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display font-700 text-[15px] text-ink">{p.title}</p>
                        <p className="mt-1 text-[12px] text-inkmut">
                          {p.courseIds.length > 0
                            ? `${set.length} курс(а) вручную`
                            : `Всё направление «${p.directionId ? dirById(p.directionId).label : ''}»`}
                        </p>
                      </div>
                      <Switch on={p.active} onToggle={() => dispatch({ type: 'TOGGLE_PROMOTION', promotionId: p.id })} label={`Акция ${p.title}`} />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded-full bg-mint/12 px-2.5 py-1 text-[12px] font-bold text-mint">
                        {p.discountType === 'percent' ? `−${p.discountValue}%` : `за ${fmtRub(p.discountValue)}`}
                      </span>
                      <span className="text-[12px] text-inksoft line-through">{fmtRub(total)}</span>
                      <span className="font-display font-900 text-[16px]" style={{ color: '#1fa97a' }}>
                        {fmtRub(price)}
                      </span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => setPromoEdit(p.id)}
                        className="rounded-md border border-line bg-paper px-3 py-1.5 text-[12px] font-bold text-inksoft transition-colors hover:border-sky hover:text-sky"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => dispatch({ type: 'DELETE_PROMOTION', promotionId: p.id })}
                        className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-3 py-1.5 text-[12px] font-bold text-inksoft transition-colors hover:border-coral hover:text-coral"
                      >
                        <IconTrash className="w-3.5 h-3.5" /> Удалить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Reveal>
      )}

      {tab === 'users' && (
        <Reveal key="users" className="mt-6 space-y-5">
          {/* персонал: администраторы и преподаватель */}
          <div className="overflow-x-auto rounded-xl border border-line bg-card">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.14em] text-inkmut">
                  <th className="px-5 py-3.5 font-bold">Персонал</th>
                  <th className="px-5 py-3.5 font-bold">Роль</th>
                  <th className="px-5 py-3.5 font-bold">Логин</th>
                  <th className="px-5 py-3.5 font-bold">Пароль</th>
                  <th className="px-5 py-3.5 font-bold text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {state.accounts
                  .filter((a) => a.role !== 'student')
                  .map((a) => (
                    <tr key={a.id} className="border-b border-line/60 last:border-0 text-[13.5px] hover:bg-ink/3">
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-3">
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-lg font-display text-[12px] font-700 text-paper"
                            style={{ background: a.role === 'admin' ? '#152420' : '#163326' }}
                          >
                            {initials(a.name)}
                          </span>
                          <span className="font-bold text-ink">{a.name}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            a.role === 'admin' ? 'bg-coral/12 text-coral' : 'bg-mint/12 text-mint'
                          }`}
                        >
                          {a.role === 'admin' ? 'администратор' : 'преподаватель'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-display text-[12.5px] text-ink">{a.login}</td>
                      <td className="px-5 py-3.5 font-display text-[12.5px] text-ink">{a.password}</td>
                      <td className="px-5 py-3.5">
                        <span className="flex justify-end">
                          <button
                            onClick={() => {
                              setPassId(a.id);
                              setNewPass('');
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-2.5 py-1.5 text-[11.5px] font-bold text-inksoft transition-colors hover:border-sky hover:text-sky"
                          >
                            <IconKey className="w-3.5 h-3.5" /> Сменить пароль
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* сортировка */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-inkmut">Сортировать:</span>
            {(
              [
                { key: 'name', label: 'По имени' },
                { key: 'sum', label: 'По оплате (сумма)' },
                { key: 'count', label: 'По оплате (курсы)' },
              ] as { key: UserSort['key']; label: string }[]
            ).map((o) => (
              <button
                key={o.key}
                onClick={() => toggleSort(o.key)}
                className={`rounded-md border px-3 py-1.5 text-[12px] font-bold transition-colors ${
                  userSort.key === o.key
                    ? 'border-pine-700 bg-pine-900 text-paper'
                    : 'border-line bg-card text-inksoft hover:border-ink/30'
                }`}
              >
                {o.label}
                {userSort.key === o.key && <span className="ml-1">{userSort.dir === 1 ? '↑' : '↓'}</span>}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-card">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.14em] text-inkmut">
                  <th className="px-5 py-3.5 font-bold">Ученик</th>
                  <th className="px-5 py-3.5 font-bold">Телефон</th>
                  <th className="px-5 py-3.5 font-bold">Регистрация</th>
                  <th className="px-5 py-3.5 font-bold">Доступ</th>
                  <th className="px-5 py-3.5 font-bold text-right">Оплачено</th>
                  <th className="px-5 py-3.5 font-bold text-right">Очки</th>
                  <th className="px-5 py-3.5 font-bold text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((s) => {
                  const trial = trialInfo(s, trialDays);
                  const ps = payStats[s.id] ?? { sum: 0, count: 0 };
                  const paidCount = ps.count;
                  return (
                    <tr key={s.id} className="border-b border-line/60 last:border-0 text-[13.5px] hover:bg-ink/3">
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg font-display text-[12px] font-700 text-paper" style={{ background: s.color }}>
                            {initials(s.name)}
                          </span>
                          <span>
                            <span className="flex items-center gap-1.5">
                              <span className="font-bold text-ink">{s.name}</span>
                              {s.suspended && (
                                <span className="rounded-full bg-coral/12 px-2 py-0.5 text-[10px] font-bold text-coral">приостановлен</span>
                              )}
                            </span>
                            <span className="text-[11.5px] text-inkmut">{s.age} лет · группа {s.group} · {s.email}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-inksoft whitespace-nowrap">{s.phone}</td>
                      <td className="px-5 py-3.5 text-inksoft">{fmtDate(s.registeredAt)}</td>
                      <td className="px-5 py-3.5">
                        {paidCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/12 px-2.5 py-1 text-[11px] font-bold text-mint">оплачено: {paidCount}</span>
                        ) : trial.active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky/12 px-2.5 py-1 text-[11px] font-bold text-sky">демо · {trial.daysLeft} дн.</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-coral/10 px-2.5 py-1 text-[11px] font-bold text-coral">нет доступа</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="block font-display font-700 text-ink">{fmtRub(ps.sum)}</span>
                        <span className="text-[11px] text-inkmut">{paidCount} курс(а)</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-display font-700 text-ink">{s.points}</td>
                      <td className="px-5 py-3.5">
                        <span className="flex justify-end gap-1.5">
                          <button
                            onClick={() => dispatch({ type: 'TOGGLE_SUSPEND', studentId: s.id })}
                            className={`rounded-md border px-2.5 py-1.5 text-[11.5px] font-bold transition-colors ${
                              s.suspended
                                ? 'border-mint/40 bg-mint/10 text-mint hover:bg-mint/20'
                                : 'border-line bg-paper text-inksoft hover:border-gold hover:text-gold'
                            }`}
                            title={s.suspended ? 'Возобновить доступ' : 'Приостановить — заблокировать вход'}
                          >
                            {s.suspended ? 'Возобновить' : 'Приостановить'}
                          </button>
                          <button
                            onClick={() => dispatch({ type: 'EXTEND_ACCESS', studentId: s.id, days: 30 })}
                            className="rounded-md border border-line bg-paper px-2.5 py-1.5 text-[11.5px] font-bold text-inksoft transition-colors hover:border-mint hover:text-mint"
                            title="Продлить доступ ко всем купленным курсам на 30 дней"
                          >
                            +30 дн.
                          </button>
                          <button
                            onClick={() => {
                              const acc = state.accounts.find((a) => a.studentId === s.id);
                              setPassId(acc?.id ?? s.id);
                              setNewPass('');
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-2.5 py-1.5 text-[11.5px] font-bold text-inksoft transition-colors hover:border-sky hover:text-sky"
                          >
                            <IconKey className="w-3.5 h-3.5" /> Пароль
                          </button>
                          <button
                            onClick={() => setDeleteId(s.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-2.5 py-1.5 text-[11.5px] font-bold text-inksoft transition-colors hover:border-coral hover:text-coral"
                          >
                            <IconTrash className="w-3.5 h-3.5" /> Удалить
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] text-inkmut px-1">
            Пароли в демо хранятся открытым текстом; в боевой версии — хэши на сервере. Удаление закрывает сессию ученика.
          </p>
        </Reveal>
      )}

      {/* удаление */}
      {deleteStudent && (
        <Modal onClose={() => setDeleteId(null)} width="max-w-md" labelledBy="del-title">
          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between">
              <h3 id="del-title" className="font-display font-900 text-xl text-ink">Удалить ученика?</h3>
              <button onClick={() => setDeleteId(null)} className="rounded-md p-2 text-inkmut hover:bg-ink/6 hover:text-ink transition-colors" aria-label="Закрыть">
                <IconClose className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-3 text-[13.5px] text-inksoft leading-relaxed">
              Аккаунт <b className="text-ink">{deleteStudent.name}</b> будет удалён вместе с прогрессом и очками.
              История платежей сохранится для отчётности. Действие необратимо.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="rounded-lg border border-ink/15 px-5 py-2.5 text-[13.5px] font-bold text-ink hover:border-ink/40 transition-colors">
                Отмена
              </button>
              <button
                onClick={() => {
                  dispatch({ type: 'DELETE_STUDENT', studentId: deleteStudent.id });
                  setDeleteId(null);
                }}
                className="rounded-lg bg-coral px-5 py-2.5 text-[13.5px] font-bold text-paper transition-all hover:brightness-110"
              >
                Удалить навсегда
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* смена пароля (вручную администратором) */}
      {passAccount && (
        <Modal onClose={() => setPassId(null)} width="max-w-md" labelledBy="pass-title">
          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between">
              <h3 id="pass-title" className="font-display font-900 text-xl text-ink">Новый пароль</h3>
              <button onClick={() => setPassId(null)} className="rounded-md p-2 text-inkmut hover:bg-ink/6 hover:text-ink transition-colors" aria-label="Закрыть">
                <IconClose className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-2 text-[13px] text-inksoft">
              Пользователь: <b className="text-ink">{passAccount.name}</b> · логин: <b className="text-ink">{passAccount.login}</b>
            </p>
            <p className="mt-1 text-[12px] text-inkmut">
              Текущий пароль: <b className="text-ink">{passAccount.password}</b> — смена также снимает блокировку входа.
            </p>
            <input
              autoFocus
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Минимум 6 символов"
              className="mt-4 w-full rounded-lg border border-line bg-card px-4 py-3 font-display text-[15px] text-ink outline-none placeholder:text-inkmut/50 focus:border-pine-700 transition-colors"
              aria-label="Новый пароль"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setPassId(null)} className="rounded-lg border border-ink/15 px-5 py-2.5 text-[13.5px] font-bold text-ink hover:border-ink/40 transition-colors">
                Отмена
              </button>
              <button
                onClick={() => {
                  dispatch({ type: 'SET_PASSWORD', accountId: passAccount.id, password: newPass.trim() });
                  setPassId(null);
                }}
                disabled={newPass.trim().length < 6}
                className="rounded-lg bg-pine-900 px-5 py-2.5 text-[13.5px] font-bold text-paper transition-colors hover:bg-pine-700 disabled:opacity-40"
              >
                Сохранить
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* продление */}
      {extendStudent && (
        <Modal onClose={() => setExtendId(null)} width="max-w-md" labelledBy="ext-title">
          <div className="p-6 sm:p-7">
            <h3 id="ext-title" className="font-display font-900 text-xl text-ink">Продлить доступ</h3>
            <p className="mt-3 text-[13.5px] text-inksoft">
              {extendStudent.name}: доступ ко всем купленным курсам будет продлён на 30 дней.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setExtendId(null)} className="rounded-lg border border-ink/15 px-5 py-2.5 text-[13.5px] font-bold text-ink hover:border-ink/40 transition-colors">
                Отмена
              </button>
              <button
                onClick={() => {
                  dispatch({ type: 'EXTEND_ACCESS', studentId: extendStudent.id, days: 30 });
                  setExtendId(null);
                }}
                className="rounded-lg bg-mint px-5 py-2.5 text-[13.5px] font-bold text-paper transition-all hover:brightness-110"
              >
                Продлить на 30 дней
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
