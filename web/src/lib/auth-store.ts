import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Nota: zustand está incluído via dependência do next-auth
// Se não estiver instalado, instalar: npm i zustand

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  forcePasswordChange?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem('heimdall_token', token);
        set({ token, user });
      },
      logout: () => {
        localStorage.removeItem('heimdall_token');
        localStorage.removeItem('heimdall_user');
        set({ token: null, user: null });
        window.location.href = '/login';
      },
      isAuthenticated: () => !!get().token,
    }),
    { name: 'heimdall_user' },
  ),
);
