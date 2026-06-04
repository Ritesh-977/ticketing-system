/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';

export interface Tenant { id: string; name: string; }

interface AuthContextType {
  token: string | null;
  tenant: Tenant | null;
  login: (token: string, tenant: Tenant) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [tenant, setTenant] = useState<Tenant | null>(() => {
    try {
      const saved = localStorage.getItem('tenant');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const login = (newToken: string, newTenant: Tenant) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('tenant', JSON.stringify(newTenant));
    setToken(newToken);
    setTenant(newTenant);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tenant');
    setToken(null);
    setTenant(null);
  };

  return (
    <AuthContext.Provider value={{ token, tenant, login, logout, isAuthenticated: !!token }}>
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
