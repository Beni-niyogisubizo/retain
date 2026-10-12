import { createContext } from 'react';
import type { LoginInput, RegisterInput, User } from '../types/auth';

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  sessionError: string | null;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
