import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type UserProfile = 'admin' | 'tech_ti' | 'tech_elect' | 'manager';

interface User {
  name: string;
  email: string;
  avatar: string;
  token?: string;
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
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      // Try regular login first
      let response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      // If regular login fails, try GLPI login
      if (!response.ok) {
        response = await fetch(`${API_URL}/api/auth/glpi-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
      }

      if (!response.ok) {
        setIsLoading(false);
        return false;
      }

      const data = await response.json();
      const token = data.token || data.access_token; // Handle both formats

      const newUser = {
        name: data.user?.name || email.split('@')[0],
        email: data.user?.email || email,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        token: token,
      };

      setUser(newUser);
      setIsAuthenticated(true);
      localStorage.setItem('helpdesk_user', JSON.stringify(newUser));
      localStorage.setItem('authToken', token); // Store token for API calls

      // Define profile based on role from backend or email
      let newProfile: UserProfile = 'admin';
      if (data.user?.role === 'TECH_ELECT' || data.user?.role === 'tech_elect' || email.includes('eletrica')) newProfile = 'tech_elect';
      else if (data.user?.role === 'TECH_TI' || data.user?.role === 'tech_ti' || email.includes('tecnico')) newProfile = 'tech_ti';
      else if (data.user?.role === 'MANAGER' || data.user?.role === 'manager' || email.includes('gestor')) newProfile = 'manager';

      setProfile(newProfile);
      localStorage.setItem('helpdesk_profile', newProfile);
      setIsLoading(false);

      return true;
    } catch (error) {
      console.error('Login error:', error);
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
