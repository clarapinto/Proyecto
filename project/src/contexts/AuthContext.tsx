import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../lib/database.types';

interface UserProfile {
  id: string;
  user_id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  area: string | null;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  validateAuth: () => Promise<{ isValid: boolean; errors: string[] }>;
  debugAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('users_profile')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

          const jwtRole = session.user.app_metadata?.role;
          console.log('Current JWT role:', jwtRole);
          console.log('Database role:', profileData?.role);

          if (profileData && jwtRole !== profileData.role) {
            console.log('Role mismatch detected! Forcing session refresh...');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError) {
              console.error('Session refresh failed:', refreshError);
              setSession(session);
              setUser(session.user);
            } else {
              console.log('Session refreshed. New JWT role:', refreshData.session?.user.app_metadata?.role);
              setSession(refreshData.session);
              setUser(refreshData.session?.user ?? null);
            }
          } else {
            setSession(session);
            setUser(session.user);
          }

          setProfile(profileData);
        } else {
          setSession(session);
          setUser(null);
        }

        setLoading(false);
      })();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data } = await supabase
            .from('users_profile')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

          setProfile(data);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const validateAuth = async (): Promise<{ isValid: boolean; errors: string[] }> => {
    const errors: string[] = [];

    if (!user) {
      errors.push('No authenticated user');
      return { isValid: false, errors };
    }

    if (!profile) {
      errors.push('No user profile found');
      return { isValid: false, errors };
    }

    if (!session) {
      errors.push('No active session');
      return { isValid: false, errors };
    }

    const jwtRole = session.user?.app_metadata?.role;
    if (!jwtRole) {
      errors.push('No role found in JWT token');
    }

    if (jwtRole !== profile.role) {
      errors.push(`Role mismatch: JWT has "${jwtRole}" but profile has "${profile.role}"`);

      console.warn('Attempting to fix role mismatch...');
      const { error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        errors.push(`Failed to refresh session: ${refreshError.message}`);
      } else {
        console.log('Session refreshed successfully');
      }
    }

    if (!profile.id) {
      errors.push('Profile has no ID');
    }

    if (!profile.user_id) {
      errors.push('Profile has no user_id');
    }

    if (profile.user_id !== user.id) {
      errors.push(`User ID mismatch: auth.user.id is "${user.id}" but profile.user_id is "${profile.user_id}"`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const debugAuth = () => {
    console.group('🔍 Auth Debug Information');
    console.log('Timestamp:', new Date().toISOString());

    console.group('User Object');
    console.log('User ID:', user?.id);
    console.log('Email:', user?.email);
    console.log('App Metadata:', user?.app_metadata);
    console.log('User Metadata:', user?.user_metadata);
    console.log('Full User Object:', user);
    console.groupEnd();

    console.group('Profile Object');
    console.log('Profile ID:', profile?.id);
    console.log('User ID:', profile?.user_id);
    console.log('Role:', profile?.role);
    console.log('Full Name:', profile?.full_name);
    console.log('Email:', profile?.email);
    console.log('Is Active:', profile?.is_active);
    console.log('Full Profile Object:', profile);
    console.groupEnd();

    console.group('Session Object');
    console.log('Access Token:', session?.access_token ? '[PRESENT]' : '[MISSING]');
    console.log('Refresh Token:', session?.refresh_token ? '[PRESENT]' : '[MISSING]');
    console.log('Expires At:', session?.expires_at);
    console.log('User from Session:', session?.user?.id);
    console.log('Full Session Object:', session);
    console.groupEnd();

    console.group('Validation');
    const jwtRole = session?.user?.app_metadata?.role;
    const profileRole = profile?.role;
    console.log('JWT Role:', jwtRole);
    console.log('Profile Role:', profileRole);
    console.log('Roles Match:', jwtRole === profileRole ? '✓ YES' : '✗ NO');
    console.log('User ID Match:', user?.id === profile?.user_id ? '✓ YES' : '✗ NO');
    console.log('Has Profile ID:', profile?.id ? '✓ YES' : '✗ NO');
    console.log('Is Authenticated:', !!user && !!profile && !!session ? '✓ YES' : '✗ NO');
    console.groupEnd();

    console.groupEnd();
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signIn, signOut, validateAuth, debugAuth }}>
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
