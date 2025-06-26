import { apiRequest } from "@/lib/queryClient";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: {
    id: number;
    username: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    permissions: unknown;
  };
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiRequest('POST', '/api/auth/login', credentials);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Errore durante il login');
  }
  
  return await response.json();
}

export async function verifyUser(userId: number) {
  const response = await apiRequest('POST', '/api/auth/verify', { userId });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Errore durante la verifica');
  }
  
  return await response.json();
}

// Storage utilities for authentication state
const AUTH_STORAGE_KEY = 'authenticated_user';

export function saveAuthenticatedUser(user: AuthResponse['user']) {
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function getAuthenticatedUser(): AuthResponse['user'] | null {
  const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearAuthenticatedUser() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}