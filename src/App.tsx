/**
 * Корень приложения: провайдер состояния + маршрутизация по ролям.
 * Логика экранов — в features/, оболочка — в layouts/AppShell.
 */

import { StoreProvider, useStore } from './store';
import { Toasts } from './components';
import AppShell from './layouts/AppShell';
import AuthView from './features/AuthView';
import StudentView from './features/StudentView';
import TeacherView from './features/TeacherView';
import AdminView from './features/AdminView';

function Shell() {
  const { state } = useStore();
  const session = state.session;

  if (!session) return <AuthView />;

  return (
    <AppShell>
      {session.role === 'student' && <StudentView />}
      {session.role === 'teacher' && <TeacherView />}
      {session.role === 'admin' && <AdminView />}
      <Toasts />
      <div className="noise-layer" />
    </AppShell>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
