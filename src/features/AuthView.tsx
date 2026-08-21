/**
 * Экран входа: слева «классная доска» с живым заголовком,
 * справа — вход по логину/паролю и регистрация нового ученика.
 * Защита: 3 неверные попытки → блокировка входа на 5 минут.
 */

import { useMemo, useState } from 'react';
import type { Account, Role, Student } from '../data';
import { DIRECTIONS, SEED_COURSES } from '../data';
import { LOCK_MS, MAX_ATTEMPTS, useStore } from '../store';
import {
  Glyphs,
  IconArrowR,
  IconLock,
  IconRefresh,
  IconUser,
  Logo,
  Scramble,
  Spinner,
  Toasts,
  useReducedMotion,
} from '../components';

const inputCls =
  'w-full rounded-lg border border-line bg-card px-4 py-3 text-[14px] text-ink outline-none placeholder:text-inkmut/50 focus:border-pine-700 transition-colors';

/**
 * Понятные варианты логинов для персонала (принимаются наравне с основными).
 * Работает независимо от сохранённых данных — помогает войти с первого раза.
 */
const LOGIN_ALIASES: Record<string, string> = {
  администратор: 'admin',
  админ: 'admin',
  administrator: 'admin',
  root: 'admin',
  teacher: 'bichurin',
  бичурин: 'bichurin',
  'бичурин в.а.': 'bichurin',
  преподаватель: 'bichurin',
  учитель: 'bichurin',
};

function AuthPanel() {
  const { state, dispatch } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // ---- вход ----
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // ---- регистрация ----
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regAgree, setRegAgree] = useState(false);
  const [regErr, setRegErr] = useState<string | null>(null);

  const lockLeft = (lg: string) => {
    const until = state.lockedUntil[lg];
    if (!until) return 0;
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  };

  const doLogin = () => {
    const raw = login.trim().toLowerCase();
    // распознаём понятные варианты логинов (teacher → bichurin, администратор → admin и т.п.)
    const lg = LOGIN_ALIASES[raw] ?? raw;
    if (!lg || !password) {
      setLoginErr('Введите логин и пароль');
      return;
    }
    const locked = lockLeft(lg);
    if (locked > 0) {
      setLoginErr(`Вход заблокирован. Подождите ${Math.floor(locked / 60)}:${String(locked % 60).padStart(2, '0')}`);
      return;
    }
    const acc = state.accounts.find((a) => a.login.toLowerCase() === lg);
    if (!acc || acc.password !== password) {
      dispatch({ type: 'ATTEMPT_FAIL', login: lg });
      const fails = (state.attempts[lg] ?? 0) + 1;
      const left = MAX_ATTEMPTS - fails;
      setLoginErr(
        left > 0
          ? `Неверный логин или пароль. Осталось попыток: ${left}`
          : 'Слишком много попыток. Вход заблокирован на 5 минут.',
      );
      return;
    }
    setLoginErr(null);
    setPending(true);
    setTimeout(() => {
      const userId = acc.role === 'student' ? (acc.studentId ?? acc.id) : acc.id;
      dispatch({ type: 'LOGIN', userId, role: acc.role });
    }, 450);
  };

  const doRegister = () => {
    const email = regEmail.trim().toLowerCase();
    if (!regName.trim()) return setRegErr('Укажите имя');
    if (!regPhone.trim()) return setRegErr('Укажите телефон');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setRegErr('Укажите корректный e-mail');
    if (regPass.length < 6) return setRegErr('Пароль должен быть не короче 6 символов');
    if (!regAgree) return setRegErr('Нужно согласиться с офертой');
    if (state.accounts.some((a) => a.login.toLowerCase() === email)) return setRegErr('Этот e-mail уже зарегистрирован');

    setRegErr(null);
    setPending(true);
    setTimeout(() => {
      const id = `st-${Date.now()}`;
      const student: Student = {
        id,
        name: regName.trim(),
        age: 9,
        group: 'А',
        color: ['#ff8a3d', '#2fa8dc', '#1fa97a', '#e8a912', '#f05d50'][Math.floor(Math.random() * 5)],
        purchased: [],
        done: [],
        points: 0,
        streak: 0,
        registeredAt: Date.now(),
        accessUntil: {},
        phone: regPhone.trim(),
        email,
      };
      const account: Account = {
        id: `acc-${id}`,
        role: 'student',
        name: student.name,
        login: email,
        password: regPass,
        studentId: id,
      };
      dispatch({ type: 'REGISTER', account, student });
      dispatch({ type: 'LOGIN', userId: id, role: 'student' });
    }, 450);
  };

  const demo = [
    { label: 'Ученик (демо)', login: 'misha@demo.ru', pass: 'misha2016', hint: 'misha@demo.ru' },
    { label: 'Преподаватель', login: 'bichurin', pass: '1234567890', hint: 'bichurin или «бичурин»' },
    { label: 'Администратор', login: 'admin', pass: '1234567890', hint: 'admin или «администратор»' },
  ];

  return (
    <div className="w-full max-w-md">
      <div className="mb-6">
        <p className="font-display text-[11px] tracking-[0.3em] text-inksoft mb-2">ВХОД В КАБИНЕТ</p>
        <h2 className="font-display font-700 text-2xl text-ink">
          {mode === 'login' ? 'С возвращением!' : 'Регистрация ученика'}
        </h2>
      </div>

      {/* переключатель вход/регистрация */}
      <div className="mb-5 grid grid-cols-2 rounded-lg border border-line bg-card p-1">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setLoginErr(null);
              setRegErr(null);
            }}
            className={`rounded-md py-2 font-display text-[12px] tracking-[0.08em] transition-all ${
              mode === m ? 'bg-pine-900 text-paper' : 'text-inksoft hover:text-ink'
            }`}
          >
            {m === 'login' ? 'ВХОД' : 'РЕГИСТРАЦИЯ'}
          </button>
        ))}
      </div>

      {mode === 'login' ? (
        <div className="space-y-3">
          <input
            className={inputCls}
            placeholder="Логин (e-mail для учеников)"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doLogin()}
            autoComplete="username"
          />
          <input
            className={inputCls}
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doLogin()}
            autoComplete="current-password"
          />
          {loginErr && (
            <p className="flex items-start gap-2 rounded-lg bg-coral/10 px-3.5 py-2.5 text-[13px] font-semibold text-coral">
              <IconLock className="w-4 h-4 mt-0.5 shrink-0" /> {loginErr}
            </p>
          )}
          <button
            onClick={doLogin}
            disabled={pending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-pine-900 py-3 font-display text-[14px] font-700 tracking-wide text-paper transition-all hover:bg-pine-700 disabled:opacity-50"
          >
            {pending ? <Spinner className="w-4 h-4" /> : (
              <>
                ВОЙТИ <IconArrowR className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="rounded-lg border border-dashed border-ink/20 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-inkmut mb-2">Быстрый демо-вход (нажмите — поля заполнятся)</p>
            <div className="flex flex-wrap gap-1.5">
              {demo.map((d) => (
                <button
                  key={d.login}
                  onClick={() => {
                    setLogin(d.login);
                    setPassword(d.pass);
                    setLoginErr(null);
                  }}
                  title={`Логин: ${d.hint} · Пароль: ${d.pass}`}
                  className="rounded-md border border-ink/15 px-2.5 py-1 text-[11.5px] font-semibold text-inksoft transition-colors hover:border-pine-700 hover:text-ink"
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-inkmut">
              Пароль у преподавателя и администратора — <b className="text-ink">1234567890</b>. Логины: <b className="text-ink">bichurin</b> (или «бичурин») и <b className="text-ink">admin</b> (или «администратор»).
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <input className={inputCls} placeholder="Имя и фамилия" value={regName} onChange={(e) => setRegName(e.target.value)} />
          <input className={inputCls} placeholder="Телефон (+7 …)" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} inputMode="tel" />
          <input className={inputCls} placeholder="E-mail" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} inputMode="email" />
          <input className={inputCls} type="password" placeholder="Пароль (мин. 6 символов)" value={regPass} onChange={(e) => setRegPass(e.target.value)} />

          <label className="flex items-start gap-2.5 rounded-lg border border-line bg-card px-3.5 py-3 cursor-pointer">
            <input type="checkbox" checked={regAgree} onChange={(e) => setRegAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#1fa97a]" />
            <span className="text-[12.5px] text-inksoft leading-snug">
              Я согласен(на) с{' '}
              <a href="/oferta.txt" target="_blank" rel="noreferrer" className="font-bold text-pine-700 underline underline-offset-2" onClick={(e) => e.stopPropagation()}>
                офертой
              </a>{' '}
              на оказание образовательных услуг
            </span>
          </label>

          {regErr && (
            <p className="flex items-start gap-2 rounded-lg bg-coral/10 px-3.5 py-2.5 text-[13px] font-semibold text-coral">
              <IconLock className="w-4 h-4 mt-0.5 shrink-0" /> {regErr}
            </p>
          )}
          <button
            onClick={doRegister}
            disabled={pending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-pine-900 py-3 font-display text-[14px] font-700 tracking-wide text-paper transition-all hover:bg-pine-700 disabled:opacity-50"
          >
            {pending ? <Spinner className="w-4 h-4" /> : (
              <>
                СОЗДАТЬ АККАУНТ <IconArrowR className="w-4 h-4" />
              </>
            )}
          </button>
          <p className="text-center text-[11.5px] text-inkmut">
            Новым ученикам — {state.settings.trialDays} дня демо-доступа ко всем курсам
          </p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between rounded-lg border border-dashed border-ink/20 px-4 py-3">
        <p className="text-[12px] text-inksoft leading-snug max-w-[230px]">
          {MAX_ATTEMPTS} неверные попытки — блокировка входа на 5 минут.
        </p>
        <button
          onClick={() => {
            dispatch({ type: 'RESET' });
            dispatch({ type: 'TOAST', text: 'Демо-данные сброшены к исходным', tone: 'info' });
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-ink/15 px-3 py-1.5 text-[12px] font-semibold text-inksoft hover:text-ink hover:border-ink/35 transition-colors"
        >
          <IconRefresh className="w-3.5 h-3.5" /> Сбросить
        </button>
      </div>
    </div>
  );
}

export default function AuthView() {
  const { state } = useStore();
  const reduced = useReducedMotion();

  const words = useMemo(() => DIRECTIONS.map((d) => d.label), []);
  const lessonCount = SEED_COURSES.reduce((s, c) => s + c.lessons.length, 0);

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
              {SEED_COURSES.length} курсов · {lessonCount} уроков · 12 тренажёров · метод Лейтнера
            </span>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-pine-100/45">
          <span>Интерактивный прототип — платежи не настоящие</span>
          <span className="hidden sm:inline">·</span>
          <span>данные хранятся локально в браузере</span>
        </div>
      </div>

      {/* ---- правая часть: вход / регистрация ---- */}
      <div className="paper-grid flex items-center justify-center px-5 py-12 lg:py-8">
        <AuthPanel />
      </div>

      <Toasts />
      <div className="noise-layer" />
    </div>
  );
}
