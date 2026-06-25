'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';

type AuthUser = {
  id: string;
  email: string;
  name: string;
  profilePhoto: string;
  createdAt?: string;
};

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

// Permanent guest user configuration mapped to Supabase 'Guest User' ID
const GUEST_USER: AuthUser = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'guest@write2rank.com',
  name: 'Guest User',
  profilePhoto: '',
  createdAt: new Date('2026-01-01').toISOString(),
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session] = useState<Session | null>(null);
  const [user] = useState<AuthUser | null>(GUEST_USER);
  const [isLoading] = useState(false);

  // Authentication is disabled - no active OAuth logic
  const signInWithGoogle = async () => {
    console.log('Google Auth is disabled in Guest mode.');
  };
  
  const signOut = async () => {
    console.log('Sign Out is disabled in Guest mode.');
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

