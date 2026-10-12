import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, loading, sessionError } = useAuth();

  if (loading) {
    return <main className="status-page">Checking your session...</main>;
  }

  if (sessionError) {
    return (
      <main className="status-page">
        <p role="alert">{sessionError}</p>
        <button onClick={() => window.location.reload()}>Try again</button>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
