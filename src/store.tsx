/**
 * Глобальное состояние: useReducer + Context + localStorage-persist.
 */

import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { Course, Payment, Role, Settings, Student } from './data';
import { SEED_COURSES, SEED_PAYMENTS, SEED_SETTINGS, SEED_STUDENTS } from './data';

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
  session: { userId: string; role: Role } | null;
  toasts: Toast[];
}

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
  | { type: 'TOGGLE_PUBLISHED'; courseId: string }
  | { type: 'EXTEND_ACCESS'; studentId: string; courseId: string; months: number }
  | { type: 'DELETE_STUDENT'; studentId: string }
  | { type: 'SET_PASSWORD'; studentId: string; password: string }
  | { type: 'TOAST'; text: string; tone?: Toast['tone'] }
  | { type: 'DISMISS_TOAST'; id: number }
  | { type: 'RESET' };

const STORAGE_KEY = 'kognitiv-pro-v7';
const MONTH_MS = 30 * 86_400_000;
let toastSeq = 1;

const withToast = (state: State, text: string, tone: Toast['tone'] = 'ok'): State => ({
  ...state,
  toasts: [...state.toasts.slice(-3), { id: toastSeq++, text, tone }],
});

function freshSeed(): Pick<State, 'students' | 'courses' | 'payments' | 'settings'> {
  return {
    students: SEED_STUDENTS,
    courses: SEED_COURSES,
    payments: SEED_PAYMENTS,
    settings: { ...SEED_SETTINGS },
  };
}

function init(): State {
  let base = freshSeed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as typeof base;
      if (parsed && Array.isArray(parsed.students) && Array.isArray(parsed.courses)) {
        base = {
          students: parsed.students,
          courses: parsed.courses,
          payments: Array.isArray(parsed.payments) ? parsed.payments : SEED_PAYMENTS,
          settings:
            parsed.settings && typeof parsed.settings.trialDays === 'number'
              ? { trialDays: parsed.settings.trialDays }
              : { ...SEED_SETTINGS },
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
      const nowTs = Date.now();
      const students = state.students.map((s) => {
        if (s.id !== action.studentId) return s;
        const base = Math.max(nowTs, s.accessUntil[action.courseId] ?? 0);
        return { ...s, accessUntil: { ...s.accessUntil, [action.courseId]: base + action.months * MONTH_MS } };
      });
      return withToast({ ...state, students }, `Доступ продлён на ${action.months} мес.`, 'ok');
    }
    case 'DELETE_STUDENT': {
      const student = state.students.find((s) => s.id === action.studentId);
      const students = state.students.filter((s) => s.id !== action.studentId);
      const session = state.session?.userId === action.studentId ? null : state.session;
      return withToast({ ...state, students, session }, `Пользователь «${student?.name ?? ''}» удалён`, 'warn');
    }
    case 'SET_PASSWORD': {
      const students = state.students.map((s) => (s.id === action.studentId ? { ...s, password: action.password } : s));
      return withToast({ ...state, students }, 'Пароль изменён', 'ok');
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
        }),
      );
    } catch {
      /* noop */
    }
  }, [state.students, state.courses, state.payments, state.settings]);

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
