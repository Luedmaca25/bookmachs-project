const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export function parseErrorMessage(errorText: string, status: number, statusText: string): string {
  if (!errorText) {
    return `Error ${status}: ${statusText}`;
  }
  try {
    const parsed = JSON.parse(errorText);
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.message === 'string' && parsed.message.trim()) {
        return parsed.message;
      }
      if (typeof parsed.detail === 'string' && parsed.detail.trim()) {
        return parsed.detail;
      }
      if (typeof parsed.title === 'string' && parsed.title.trim()) {
        return parsed.title;
      }
      if (typeof parsed.error === 'string' && parsed.error.trim()) {
        return parsed.error;
      }
      if (parsed.errors && typeof parsed.errors === 'object') {
        const firstKey = Object.keys(parsed.errors)[0];
        const errorList = parsed.errors[firstKey];
        if (Array.isArray(errorList) && errorList.length > 0) {
          return errorList[0];
        }
      }
    }
  } catch {
    // Keep errorText as is if not JSON
  }
  return errorText;
}

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
      throw new Error(parseErrorMessage(errorText, response.status, response.statusText));
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
      throw new Error(parseErrorMessage(errorText, response.status, response.statusText));
    }

    return response.json();
  },

  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const headers = new Headers(options?.headers);
    if (!(body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorMessage(errorText, response.status, response.statusText));
    }

    return response.json();
  },

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers = new Headers(options?.headers);
    
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseErrorMessage(errorText, response.status, response.statusText));
    }

    // Algunos endpoints de DELETE devuelven bool o vacío
    try {
      return await response.json();
    } catch {
      return true as unknown as T;
    }
  }
};
