import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { AuthPage } from './pages/AuthPage';

function DashboardPage() {
  const { user, signOut } = useAuth();

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <span className="brand">Retain</span>
        <button onClick={signOut}>Sign out</button>
      </header>

      <h1>Welcome, {user?.name}</h1>
      <p>Your account is ready. Expense and budget features are coming next.</p>

      {user?.role === 'admin' && <Link to="/admin">Open admin dashboard</Link>}
    </main>
  );
}

function AdminPage() {
  return (
    <main className="dashboard">
      <h1>Admin dashboard</h1>
      <p>Category management and platform insights are coming next.</p>
      <Link to="/dashboard">Back to your dashboard</Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage register />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      <Route element={<ProtectedRoute adminOnly />}>
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      <Route
        path="*"
        element={
          <main className="status-page">
            <h1>Page not found</h1>
            <Link to="/">Return home</Link>
          </main>
        }
      />
    </Routes>
  );
}
