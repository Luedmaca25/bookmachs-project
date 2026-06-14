const BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:7027/api';

export const apiClient = {
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers = new Headers(options?.headers);
    
    // Obtener token JWT si existe para mandarlo en la cabecera
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const headers = new Headers(options?.headers);
    if (!(body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
};
