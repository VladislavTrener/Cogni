/**
 * Оболочка авторизованной зоны: шапка с переключателем ролей, подвал.
 */

import React from 'react';
import { APP_VERSION } from '../data';
import { useStore } from '../store';
import { IconChalk, IconRefresh, IconShield, IconUser, Logo, Toasts } from '../components';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { state, dispatch } = useStore();
  const session = state.session;

  const account = session ? state.accounts.find((a) => a.id === session.userId || a.studentId === session.userId) ?? null : null;
  const user = session
    ? session.role === 'student'
      ? state.students.find((s) => s.id === session.userId)
      : account
        ? { name: account.name, color: session.role === 'teacher' ? '#163326' : '#152420' }
        : { name: session.role === 'teacher' ? 'Преподаватель' : 'Администратор', color: '#152420' }
    : null;

  return (
    <div className="min-h-screen flex flex-col paper-grid">
      <header className="sticky top-0 z-40 bg-pine-950/97 border-b border-pine-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 min-h-16 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            {account && (
              <span className="rounded-full bg-pine-900 border border-pine-800 px-2.5 py-1 text-[10.5px] font-bold tracking-wide text-pine-100/70 uppercase">
                {account.role === 'student' ? 'Ученик' : account.role === 'teacher' ? 'Учитель' : 'Админ'}
              </span>
            )}
            {user && (
              <span className="inline-flex items-center gap-2.5 rounded-lg border border-pine-800 bg-pine-900 pl-1.5 pr-3 py-1">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-md font-display text-[11px] font-700 text-paper"
                  style={{ background: 'color' in user ? user.color : '#163326' }}
                >
                  {user.name.split(' ').map((w) => w[0]).join('')}
                </span>
                <span className="text-[12.5px] font-semibold text-paper hidden sm:block">{user.name}</span>
              </span>
            )}
            <button
              onClick={() => dispatch({ type: 'LOGOUT' })}
              className="rounded-lg border border-pine-800 px-3 py-2 text-[12px] font-bold text-pine-100/70 transition-colors hover:text-paper hover:border-pine-600"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-auto border-t border-line bg-card/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-inkmut">
            Когнитив.Про · <span className="font-semibold text-inksoft">{APP_VERSION}</span> · роли: ученик — учитель — администратор
          </p>
          <div className="flex items-center gap-4 text-[12px] text-inkmut">
            <span className="inline-flex items-center gap-1.5"><IconUser className="w-3.5 h-3.5" /> {state.accounts.length} аккаунтов</span>
            <span className="inline-flex items-center gap-1.5"><IconChalk className="w-3.5 h-3.5" /> 9 тренажёров</span>
            <span className="inline-flex items-center gap-1.5"><IconShield className="w-3.5 h-3.5" /> оплата на самозанятого</span>
            <button
              onClick={() => {
                dispatch({ type: 'RESET' });
                dispatch({ type: 'TOAST', text: 'Демо-данные сброшены к исходным', tone: 'info' });
              }}
              className="inline-flex items-center gap-1.5 text-inksoft hover:text-ink transition-colors"
            >
              <IconRefresh className="w-3.5 h-3.5" /> Сбросить демо
            </button>
          </div>
        </div>
      </footer>

      <Toasts />
      <div className="noise-layer" />
    </div>
  );
}
