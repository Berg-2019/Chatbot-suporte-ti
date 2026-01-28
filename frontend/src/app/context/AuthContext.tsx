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
    
    // Simulação de chamada API ao GLPI
    return new Promise((resolve) => {
      setTimeout(() => {
        // Lógica mockada de login
        // Em produção, isso seria um fetch('/api/auth/login', ...)
        if (password.length > 0) {
          const mockUser = {
            name: email.split('@')[0],
            email: email,
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
            token: 'mock-jwt-token-glpi'
          };
          
          setUser(mockUser);
          setIsAuthenticated(true);
          localStorage.setItem('helpdesk_user', JSON.stringify(mockUser));
          
          // Define perfil baseado no email (para testes)
          let newProfile: UserProfile = 'admin';
          if (email.includes('eletrica')) newProfile = 'tech_elect';
          else if (email.includes('tecnico')) newProfile = 'tech_ti';
          else if (email.includes('gestor')) newProfile = 'manager';
          
          setProfile(newProfile);
          localStorage.setItem('helpdesk_profile', newProfile);
          
          resolve(true);
        } else {
          resolve(false);
        }
        setIsLoading(false);
      }, 1500);
    });
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('helpdesk_user');
    localStorage.removeItem('helpdesk_profile');
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
