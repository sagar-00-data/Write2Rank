'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs';

type AuthUser = {
  id: string;      // Deterministic UUID for Supabase Database
  clerkId: string; // Original Clerk User ID
  email: string;
  name: string;
  profilePhoto: string;
  createdAt?: string;
};

interface AuthContextType {
  user: AuthUser | null;
  session: any | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

// Deterministic UUID generator based on Clerk ID
function getDeterministicUUID(str: string): string {
  const cleanId = str.replace('user_', '');
  let hex = '';
  for (let i = 0; i < cleanId.length; i++) {
    hex += cleanId.charCodeAt(i).toString(16);
  }
  if (hex.length < 32) {
    hex = hex.padEnd(32, 'f');
  } else if (hex.length > 32) {
    hex = hex.substring(0, 32);
  }
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-4${hex.substring(12, 15)}-8${hex.substring(15, 18)}-${hex.substring(18, 30)}`;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user: clerkUser, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { signOut: clerkSignOut } = useClerkAuth();
  const [user, setUser] = useState<AuthUser | null>(null);

  // Derive loading state: loading until Clerk has resolved the session
  const isLoading = !isUserLoaded;

  useEffect(() => {
    if (!isUserLoaded) return;

    const syncAndSetUser = async () => {
      if (isSignedIn && clerkUser) {
        const email = clerkUser.emailAddresses[0]?.emailAddress || '';
        const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User';
        const profilePhoto = clerkUser.imageUrl || '';
        const deterministicId = getDeterministicUUID(clerkUser.id);

        const mappedUser: AuthUser = {
          id: deterministicId,
          clerkId: clerkUser.id,
          email,
          name,
          profilePhoto,
          createdAt: clerkUser.createdAt?.toISOString(),
        };

        setUser(mappedUser);

        // Perform server-side profile syncing to Supabase database (bypasses RLS)
        try {
          const res = await fetch('/api/auth/sync', { method: 'POST' });
          if (!res.ok) {
            console.error('Failed to sync profile to database:', await res.text());
          } else {
            console.log('✅ User profile successfully synchronized with database.');
          }
        } catch (err) {
          console.error('Error synchronizing user profile:', err);
        }
      } else {
        setUser(null);
      }
    };

    syncAndSetUser();
  }, [clerkUser, isUserLoaded, isSignedIn]);

  // Handle OAuth redirects via Clerk's custom pages
  const signInWithGoogle = async () => {
    // Clerk handles redirection through its prebuilt components
    window.location.href = '/login';
  };

  const signOut = async () => {
    try {
      await clerkSignOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session: null, isLoading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
