import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type UserProfile = 'admin' | 'tech_ti' | 'tech_elect' | 'manager';

interface User {
  name: string;
  email: string;
  avatar: string;
  token?: string;
  permissions?: string[];
}

interface AuthContextType {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>('admin');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Simula verificação de sessão ao carregar
  useEffect(() => {
    const storedUser = localStorage.getItem('helpdesk_user');
    const storedProfile = localStorage.getItem('helpdesk_profile');

    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }

    if (storedProfile) {
      setProfile(storedProfile as UserProfile);
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL ?? '';

      console.log('🔐 Tentando login...', { email, API_URL });

      // Login local simplificado - SEM GLPI
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        console.error('❌ Login falhou:', errorData);
        setIsLoading(false);
        return false;
      }

      const data = await response.json();
      console.log('✅ Login bem-sucedido:', data);

      const token = data.token || data.access_token;

      const newUser: User = {
        name: data.user?.name || email.split('@')[0],
        email: data.user?.email || email,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        token: token,
        permissions: data.user?.permissions || [],
      };

      setUser(newUser);
      setIsAuthenticated(true);
      localStorage.setItem('helpdesk_user', JSON.stringify(newUser));
      localStorage.setItem('authToken', token);

      // Usar perfil do backend se disponível
      const newProfile: UserProfile = data.user?.profile || 'admin';

      setProfile(newProfile);
      localStorage.setItem('helpdesk_profile', newProfile);
      setIsLoading(false);

      console.log('✅ Login completo! Profile:', newProfile);

      return true;
    } catch (error) {
      console.error('❌ Erro de conexão:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('helpdesk_user');
    localStorage.removeItem('helpdesk_profile');
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider value={{
      profile,
      setProfile,
      user,
      isAuthenticated,
      login,
      logout,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
