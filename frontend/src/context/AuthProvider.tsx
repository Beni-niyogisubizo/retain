import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, apiRequest } from '../api/client';
import { AuthContext } from './AuthContext';
import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  User,
} from '../types/auth';

const TOKEN_KEY = 'retain_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const savedToken = localStorage.getItem(TOKEN_KEY);

    async function restoreSession() {
      try {
        if (savedToken) {
          const response = await apiRequest<{ user: User }>(
            '/auth/me',
            { signal: controller.signal },
            savedToken,
          );

          if (!controller.signal.aborted) {
            setUser(response.user);
          }
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        } else {
          setSessionError(
            'Unable to check your session. Check the connection and refresh.',
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void restoreSession();

    return () => controller.abort();
  }, []);

  function saveSession(response: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, response.token);
    setToken(response.token);
    setUser(response.user);
    setSessionError(null);
  }

  async function signIn(input: LoginInput) {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    saveSession(response);
  }

  async function signUp(input: RegisterInput) {
    const response = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    saveSession(response);
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setSessionError(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        sessionError,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
