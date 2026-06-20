import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  documentoIdentidad: string;
  pais: string;
  role: string;
  isPremium: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const token = localStorage.getItem('token');
  return {
    user: null,
    token: token,
    isAuthenticated: false, // Se establecerá en true una vez que el perfil de usuario se cargue con éxito
    login: (user, token) => {
      localStorage.setItem('token', token);
      set({ user, token, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false });
    },
  };
});
