import { create } from 'zustand';
import { apiClient } from '../../../lib/apiClient';

interface User {
  id: string;
  email: string;
  name: string;
  documentoIdentidad: string;
  pais: string;
  telefono?: string;
  profileImageUrl?: string;
  role: string;
  isPremium: boolean;
  subscriptionPlan?: string;
  subscriptionEndDate?: string;
  isSubscriptionCancelled?: boolean;
  preferences?: string[];
  dailySwipesConsumed?: number;
  dailySwipeLimit?: number;
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
      
      const pendingLikesStr = localStorage.getItem('guest_pending_likes');
      if (pendingLikesStr) {
        try {
          const guestLikes: string[] = JSON.parse(pendingLikesStr);
          if (Array.isArray(guestLikes) && guestLikes.length > 0) {
            apiClient.post('/books/sync-guest-likes', guestLikes).then(() => {
              localStorage.removeItem('guest_pending_likes');
              localStorage.removeItem('guest_swipes_count');
            }).catch((e) => console.error('Error al sincronizar me gusta de invitado al iniciar sesión:', e));
          }
        } catch (e) {
          console.error('Error al parsear guest_pending_likes:', e);
        }
      }

      set({ user, token, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false });
    },
  };
});
