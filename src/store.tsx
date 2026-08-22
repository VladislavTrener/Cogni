/**
 * Глобальное состояние: useReducer + Context + localStorage-persist.
 */

import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { Account, Course, Payment, Role, Settings, Student } from './data';
import { SEED_ACCOUNTS, SEED_COURSES, SEED_PAYMENTS, SEED_SETTINGS, SEED_STUDENTS } from './data';

export interface Toast {
  id: number;
  text: string;
  tone: 'ok' | 'info' | 'warn';
}

export interface State {
  students: Student[];
  courses: Course[];
  payments: Payment[];
  settings: Settings;
  accounts: Account[];
  /** login → количество неудачных попыток входа */
  attempts: Record<string, number>;
  /** login → timestamp, до которого вход заблокирован */
  lockedUntil: Record<string, number>;
  session: { userId: string; role: Role } | null;
  toasts: Toast[];
}

export const MAX_ATTEMPTS = 3;
export const LOCK_MS = 5 * 60_000; // блокировка на 5 минут

export type Action =
  | { type: 'LOGIN'; userId: string; role: Role }
  | { type: 'LOGOUT' }
  | { type: 'SWITCH_ROLE'; role: Role }
  | { type: 'PURCHASE'; studentId: string; courseIds: string[]; amount: number; item: string; purpose: string; method: string }
  | { type: 'COMPLETE_LESSON'; studentId: string; lessonId: string; points: number }
  | { type: 'TEACHER_SET_LESSON'; studentId: string; lessonId: string; done: boolean }
  | { type: 'TEACHER_AWARD'; studentId: string; points: number }
  | { type: 'SET_PRICE'; courseId: string; price: number }
  | { type: 'SET_VALIDITY'; courseId: string; months: number }
  | { type: 'SET_TRIAL_DAYS'; days: number }
  | { type: 'SET_PAYMENT_QR'; dataUrl: string | null }
  | { type: 'TOGGLE_PUBLISHED'; courseId: string }
  | { type: 'EXTEND_ACCESS'; studentId: string; days: number }
  | { type: 'DELETE_STUDENT'; studentId: string }
  | { type: 'SET_PASSWORD'; accountId: string; password: string }
  | { type: 'REGISTER'; account: Account; student: Student }
  | { type: 'ATTEMPT_FAIL'; login: string }
  | { type: 'UNLOCK'; login: string }
  | { type: 'TOAST'; text: string; tone?: Toast['tone'] }
  | { type: 'DISMISS_TOAST'; id: number }
  | { type: 'RESET' };

const STORAGE_KEY = 'kognitiv-pro-v8';
const MONTH_MS = 30 * 86_400_000;
let toastSeq = 1;

const withToast = (state: State, text: string, tone: Toast['tone'] = 'ok'): State => ({
  ...state,
  toasts: [...state.toasts.slice(-3), { id: toastSeq++, text, tone }],
});

function freshSeed(): Pick<State, 'students' | 'courses' | 'payments' | 'settings' | 'accounts' | 'attempts' | 'lockedUntil'> {
  return {
    students: SEED_STUDENTS,
    courses: SEED_COURSES,
    payments: SEED_PAYMENTS,
    settings: { ...SEED_SETTINGS },
    accounts: SEED_ACCOUNTS,
    attempts: {},
    lockedUntil: {},
  };
}

function init(): State {
  let base = freshSeed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as typeof base;
      if (parsed && Array.isArray(parsed.students) && Array.isArray(parsed.courses)) {
        // Список уроков всегда берём из файлов (обновления контента),
        // а правки администратора (цена, публикация, срок доступа) — из хранилища.
        // Так при замене файлов курс перестраивается автоматически.
        const mergedCourses = SEED_COURSES.map((seedCourse) => {
          const saved = parsed.courses.find((c) => c.id === seedCourse.id);
          if (!saved) return seedCourse;
          return {
            ...seedCourse,
            price: typeof saved.price === 'number' ? saved.price : seedCourse.price,
            published: typeof saved.published === 'boolean' ? saved.published : seedCourse.published,
            validityMonths:
              typeof saved.validityMonths === 'number' ? saved.validityMonths : seedCourse.validityMonths,
          };
        });
        base = {
          students: parsed.students,
          courses: mergedCourses,
          payments: Array.isArray(parsed.payments) ? parsed.payments : SEED_PAYMENTS,
          settings:
            parsed.settings && typeof parsed.settings.trialDays === 'number'
              ? { trialDays: parsed.settings.trialDays, qr: typeof parsed.settings.qr === 'string' ? parsed.settings.qr : null }
              : { ...SEED_SETTINGS },
          accounts: Array.isArray(parsed.accounts) && parsed.accounts.length ? parsed.accounts : SEED_ACCOUNTS,
          attempts: parsed.attempts ?? {},
          lockedUntil: parsed.lockedUntil ?? {},
        };
      }
    }
  } catch {
    base = freshSeed();
  }
  return { ...base, session: null, toasts: [] };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, session: { userId: action.userId, role: action.role } };
    case 'LOGOUT':
      return { ...state, session: null };
    case 'SWITCH_ROLE': {
      const userId =
        action.role === 'teacher' ? 'teacher' : action.role === 'admin' ? 'admin' : state.students[0]?.id ?? 'anya';
      return { ...state, session: { userId, role: action.role } };
    }
    case 'PURCHASE': {
      const nowTs = Date.now();
      const students = state.students.map((s) => {
        if (s.id !== action.studentId) return s;
        const accessUntil = { ...s.accessUntil };
        action.courseIds.forEach((courseId) => {
          const course = state.courses.find((c) => c.id === courseId);
          const months = course?.validityMonths ?? 3;
          // повторная покупка продлевает доступ от сегодняшнего дня
          accessUntil[courseId] = nowTs + months * MONTH_MS;
        });
        return { ...s, purchased: Array.from(new Set([...s.purchased, ...action.courseIds])), accessUntil };
      });
      const payer = state.students.find((s) => s.id === action.studentId);
      const today = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const payment: Payment = {
        id: `p-${Date.now()}`,
        date: today,
        studentId: action.studentId,
        studentName: payer?.name,
        item: action.item,
        purpose: action.purpose,
        amount: action.amount,
        method: action.method,
        status: 'оплачен',
        fresh: true,
      };
      const next: State = { ...state, students, payments: [payment, ...state.payments] };
      return withToast(next, action.amount > 0 ? `Оплата прошла: «${action.item}» открыт` : 'Курс открыт', 'ok');
    }
    case 'COMPLETE_LESSON': {
      let already = false;
      const students = state.students.map((s) => {
        if (s.id !== action.studentId) return s;
        if (s.done.includes(action.lessonId)) {
          already = true;
          return s;
        }
        return { ...s, done: [...s.done, action.lessonId], points: s.points + action.points };
      });
      const next: State = { ...state, students };
      return already
        ? withToast(next, 'Урок уже был пройден ранее', 'info')
        : withToast(next, `Урок пройден! +${action.points} очков`, 'ok');
    }
    case 'TEACHER_SET_LESSON': {
      const students = state.students.map((s) => {
        if (s.id !== action.studentId) return s;
        const has = s.done.includes(action.lessonId);
        if (action.done && !has) return { ...s, done: [...s.done, action.lessonId] };
        if (!action.done && has) return { ...s, done: s.done.filter((d) => d !== action.lessonId) };
        return s;
      });
      return { ...state, students };
    }
    case 'TEACHER_AWARD': {
      const students = state.students.map((s) =>
        s.id === action.studentId ? { ...s, points: s.points + action.points } : s,
      );
      return withToast({ ...state, students }, `Начислено +${action.points} очков`, 'ok');
    }
    case 'SET_PRICE': {
      const courses = state.courses.map((c) => (c.id === action.courseId ? { ...c, price: Math.max(0, action.price) } : c));
      return withToast({ ...state, courses }, 'Цена курса обновлена', 'ok');
    }
    case 'SET_VALIDITY': {
      const courses = state.courses.map((c) =>
        c.id === action.courseId ? { ...c, validityMonths: Math.min(36, Math.max(1, action.months)) } : c,
      );
      return withToast({ ...state, courses }, 'Срок доступа обновлён', 'ok');
    }
    case 'SET_TRIAL_DAYS': {
      const settings = { ...state.settings, trialDays: Math.min(30, Math.max(0, action.days)) };
      return withToast({ ...state, settings }, `Демо-доступ: ${settings.trialDays} дн.`, 'ok');
    }
    case 'SET_PAYMENT_QR': {
      const settings = { ...state.settings, qr: action.dataUrl };
      return withToast(
        { ...state, settings },
        action.dataUrl ? 'QR-код оплаты обновлён — ученики уже видят его при оплате' : 'QR-код убран, используется заглушка',
        'ok',
      );
    }
    case 'TOGGLE_PUBLISHED': {
      const courses = state.courses.map((c) => (c.id === action.courseId ? { ...c, published: !c.published } : c));
      const course = courses.find((c) => c.id === action.courseId);
      return withToast(
        { ...state, courses },
        course?.published ? 'Курс опубликован' : 'Курс скрыт из витрины',
        course?.published ? 'ok' : 'warn',
      );
    }
    case 'EXTEND_ACCESS': {
      const DAY_MS = 86_400_000;
      const students = state.students.map((s) => {
        if (s.id !== action.studentId) return s;
        const accessUntil: Record<string, number> = {};
        Object.entries(s.accessUntil).forEach(([courseId, ts]) => {
          accessUntil[courseId] = ts + action.days * DAY_MS;
        });
        return { ...s, accessUntil };
      });
      return withToast({ ...state, students }, `Доступ продлён на ${action.days} дн.`, 'ok');
    }
    case 'DELETE_STUDENT': {
      const student = state.students.find((s) => s.id === action.studentId);
      const students = state.students.filter((s) => s.id !== action.studentId);
      const accounts = state.accounts.filter((a) => a.studentId !== action.studentId);
      const session = state.session?.userId === action.studentId ? null : state.session;
      return withToast({ ...state, students, accounts, session }, `Пользователь «${student?.name ?? ''}» удалён`, 'warn');
    }
    case 'SET_PASSWORD': {
      const accounts = state.accounts.map((a) => (a.id === action.accountId ? { ...a, password: action.password } : a));
      const acc = accounts.find((a) => a.id === action.accountId);
      // смена пароля снимает блокировку входа
      const attempts = { ...state.attempts };
      const lockedUntil = { ...state.lockedUntil };
      if (acc) {
        delete attempts[acc.login];
        delete lockedUntil[acc.login];
      }
      return withToast({ ...state, accounts, attempts, lockedUntil }, `Пароль для «${acc?.name ?? ''}» изменён`, 'ok');
    }
    case 'REGISTER': {
      const exists =
        state.accounts.some((a) => a.login === action.account.login) || state.students.some((s) => s.email === action.student.email);
      if (exists) return withToast(state, 'Пользователь с таким e-mail уже зарегистрирован', 'warn');
      const next: State = {
        ...state,
        accounts: [...state.accounts, action.account],
        students: [...state.students, action.student],
      };
      return withToast(next, `Добро пожаловать, ${action.student.name.split(' ')[0]}! Демо-доступ ${state.settings.trialDays} дня активирован`, 'ok');
    }
    case 'ATTEMPT_FAIL': {
      const count = (state.attempts[action.login] ?? 0) + 1;
      const attempts = { ...state.attempts, [action.login]: count };
      let lockedUntil = state.lockedUntil;
      if (count >= MAX_ATTEMPTS) {
        lockedUntil = { ...state.lockedUntil, [action.login]: Date.now() + LOCK_MS };
        delete attempts[action.login];
      }
      return { ...state, attempts, lockedUntil };
    }
    case 'UNLOCK': {
      const attempts = { ...state.attempts };
      const lockedUntil = { ...state.lockedUntil };
      delete attempts[action.login];
      delete lockedUntil[action.login];
      return { ...state, attempts, lockedUntil };
    }
    case 'TOAST':
      return withToast(state, action.text, action.tone ?? 'info');
    case 'DISMISS_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
    case 'RESET': {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* noop */
      }
      return { ...freshSeed(), session: state.session, toasts: state.toasts };
    }
    default:
      return state;
  }
}

interface Ctx {
  state: State;
  dispatch: React.Dispatch<Action>;
  me: Student | null;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          students: state.students,
          courses: state.courses,
          payments: state.payments,
          settings: state.settings,
          accounts: state.accounts,
          attempts: state.attempts,
          lockedUntil: state.lockedUntil,
        }),
      );
    } catch {
      /* noop */
    }
  }, [state.students, state.courses, state.payments, state.settings, state.accounts, state.attempts, state.lockedUntil]);

  const me = useMemo(() => {
    if (!state.session || state.session.role !== 'student') return null;
    return state.students.find((s) => s.id === state.session?.userId) ?? null;
  }, [state.session, state.students]);

  const value = useMemo(() => ({ state, dispatch, me }), [state, me]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
