import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function AuthPage({ register = false }: { register?: boolean }) {
  const { user, loading, signIn, signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (register) {
        await signUp({ name, email, password });
      } else {
        await signIn({ email, password });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to complete the request',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="status-page">Checking your session...</main>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand" to="/">Retain</Link>
        <h1>{register ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">Take control of your expenses and monthly budget.</p>

        <form onSubmit={handleSubmit}>
          {register && (
            <label>
              Full name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                maxLength={100}
                required
                disabled={submitting}
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={254}
              required
              disabled={submitting}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={register ? 'new-password' : 'current-password'}
              minLength={8}
              required
              disabled={submitting}
            />
          </label>

          {register && <p className="muted">Use at least 8 characters.</p>}
          {error && <p className="error" role="alert">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Please wait...' : register ? 'Sign up' : 'Sign in'}
          </button>
        </form>

        <p>
          {register ? 'Already have an account? ' : 'New to Retain? '}
          <Link to={register ? '/login' : '/register'}>
            {register ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </section>
    </main>
  );
}
