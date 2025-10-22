import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthDiagnostics {
  timestamp: string;
  isAuthenticated: boolean;
  hasUser: boolean;
  hasSession: boolean;
  hasProfile: boolean;
  userId: string | null;
  profileId: string | null;
  jwtRole: string | null;
  profileRole: string | null;
  rolesMatch: boolean;
  userIdsMatch: boolean;
  errors: string[];
  warnings: string[];
}

export async function performAuthDiagnostics(): Promise<AuthDiagnostics> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    errors.push(`Session error: ${sessionError.message}`);
  }

  const user = session?.user ?? null;
  const userId = user?.id ?? null;
  const jwtRole = user?.app_metadata?.role ?? null;

  let profileId: string | null = null;
  let profileRole: string | null = null;

  if (userId) {
    const { data: profile, error: profileError } = await supabase
      .from('users_profile')
      .select('id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      errors.push(`Profile query error: ${profileError.message}`);
    } else if (!profile) {
      errors.push('No profile found for authenticated user');
    } else {
      profileId = profile.id;
      profileRole = profile.role;
    }
  }

  const hasUser = !!user;
  const hasSession = !!session;
  const hasProfile = !!profileId;
  const rolesMatch = jwtRole === profileRole;
  const userIdsMatch = true;

  if (!hasUser) {
    errors.push('No authenticated user');
  }

  if (!hasSession) {
    errors.push('No active session');
  }

  if (!hasProfile && hasUser) {
    errors.push('User is authenticated but has no profile in database');
  }

  if (!jwtRole && hasUser) {
    warnings.push('JWT token does not contain role information');
  }

  if (jwtRole && profileRole && !rolesMatch) {
    warnings.push(`Role mismatch: JWT="${jwtRole}", Profile="${profileRole}"`);
  }

  return {
    timestamp: new Date().toISOString(),
    isAuthenticated: hasUser && hasSession && hasProfile,
    hasUser,
    hasSession,
    hasProfile,
    userId,
    profileId,
    jwtRole,
    profileRole,
    rolesMatch,
    userIdsMatch,
    errors,
    warnings,
  };
}

export function logAuthDiagnostics(diagnostics: AuthDiagnostics): void {
  console.group('🔍 Authentication Diagnostics');
  console.log('Timestamp:', diagnostics.timestamp);
  console.log('');

  console.group('Status');
  console.log('Is Authenticated:', diagnostics.isAuthenticated ? '✅ YES' : '❌ NO');
  console.log('Has User:', diagnostics.hasUser ? '✓' : '✗');
  console.log('Has Session:', diagnostics.hasSession ? '✓' : '✗');
  console.log('Has Profile:', diagnostics.hasProfile ? '✓' : '✗');
  console.groupEnd();

  console.group('Identity');
  console.log('User ID:', diagnostics.userId ?? '[NONE]');
  console.log('Profile ID:', diagnostics.profileId ?? '[NONE]');
  console.groupEnd();

  console.group('Roles');
  console.log('JWT Role:', diagnostics.jwtRole ?? '[NONE]');
  console.log('Profile Role:', diagnostics.profileRole ?? '[NONE]');
  console.log('Roles Match:', diagnostics.rolesMatch ? '✅ YES' : '❌ NO');
  console.groupEnd();

  if (diagnostics.errors.length > 0) {
    console.group('❌ Errors');
    diagnostics.errors.forEach((error, index) => {
      console.error(`${index + 1}. ${error}`);
    });
    console.groupEnd();
  }

  if (diagnostics.warnings.length > 0) {
    console.group('⚠️ Warnings');
    diagnostics.warnings.forEach((warning, index) => {
      console.warn(`${index + 1}. ${warning}`);
    });
    console.groupEnd();
  }

  console.groupEnd();
}

export async function validateRLSRequirements(requiredRole?: string[]): Promise<{ isValid: boolean; message: string }> {
  const diagnostics = await performAuthDiagnostics();

  if (!diagnostics.isAuthenticated) {
    return {
      isValid: false,
      message: 'User is not authenticated. Errors: ' + diagnostics.errors.join(', '),
    };
  }

  if (!diagnostics.rolesMatch) {
    return {
      isValid: false,
      message: `Role mismatch detected. JWT has "${diagnostics.jwtRole}" but profile has "${diagnostics.profileRole}". Try refreshing your session.`,
    };
  }

  if (requiredRole && diagnostics.jwtRole && !requiredRole.includes(diagnostics.jwtRole)) {
    return {
      isValid: false,
      message: `Insufficient permissions. Required: ${requiredRole.join(' or ')}. You have: ${diagnostics.jwtRole}`,
    };
  }

  return {
    isValid: true,
    message: 'Authentication is valid and meets RLS requirements',
  };
}

export function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

export async function checkProfileIntegrity(): Promise<{
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    issues.push('No active session');
    recommendations.push('Log in to your account');
    return { isValid: false, issues, recommendations };
  }

  const userId = session.user.id;
  const jwtRole = session.user.app_metadata?.role;

  const { data: profile, error: profileError } = await supabase
    .from('users_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    issues.push(`Database error: ${profileError.message}`);
    recommendations.push('Contact system administrator');
    return { isValid: false, issues, recommendations };
  }

  if (!profile) {
    issues.push('User profile does not exist in database');
    recommendations.push('Contact system administrator to create your profile');
    return { isValid: false, issues, recommendations };
  }

  if (!profile.id) {
    issues.push('Profile is missing ID field');
    recommendations.push('Profile data is corrupted, contact administrator');
  }

  if (!profile.user_id) {
    issues.push('Profile is missing user_id field');
    recommendations.push('Profile data is corrupted, contact administrator');
  }

  if (profile.user_id !== userId) {
    issues.push(`Profile user_id (${profile.user_id}) does not match auth user id (${userId})`);
    recommendations.push('Profile data is corrupted, contact administrator');
  }

  if (!jwtRole) {
    issues.push('JWT token is missing role information');
    recommendations.push('Log out and log back in to refresh your session');
  }

  if (jwtRole && profile.role && jwtRole !== profile.role) {
    issues.push(`Role mismatch: JWT has "${jwtRole}" but profile has "${profile.role}"`);
    recommendations.push('Log out and log back in to refresh your session');
  }

  if (!profile.is_active) {
    issues.push('User account is not active');
    recommendations.push('Contact administrator to activate your account');
  }

  return {
    isValid: issues.length === 0,
    issues,
    recommendations,
  };
}

export async function attemptAutoFix(): Promise<{ success: boolean; message: string }> {
  console.log('🔧 Attempting automatic authentication fix...');

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return {
      success: false,
      message: 'No active session to fix. Please log in again.',
    };
  }

  console.log('Refreshing session...');
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

  if (refreshError) {
    return {
      success: false,
      message: `Failed to refresh session: ${refreshError.message}`,
    };
  }

  console.log('Session refreshed. Verifying fix...');

  const diagnostics = await performAuthDiagnostics();

  if (diagnostics.isAuthenticated && diagnostics.rolesMatch) {
    return {
      success: true,
      message: 'Authentication issues resolved. JWT role now matches profile role.',
    };
  }

  return {
    success: false,
    message: 'Session refreshed but issues remain. Manual intervention required.',
  };
}

window.authDebug = {
  diagnose: async () => {
    const diagnostics = await performAuthDiagnostics();
    logAuthDiagnostics(diagnostics);
    return diagnostics;
  },
  validate: validateRLSRequirements,
  checkIntegrity: checkProfileIntegrity,
  autoFix: attemptAutoFix,
  decodeToken: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.error('No access token available');
      return null;
    }
    const decoded = decodeJWT(session.access_token);
    console.log('Decoded JWT:', decoded);
    return decoded;
  },
};

declare global {
  interface Window {
    authDebug: {
      diagnose: () => Promise<AuthDiagnostics>;
      validate: (requiredRole?: string[]) => Promise<{ isValid: boolean; message: string }>;
      checkIntegrity: () => Promise<{
        isValid: boolean;
        issues: string[];
        recommendations: string[];
      }>;
      autoFix: () => Promise<{ success: boolean; message: string }>;
      decodeToken: () => Promise<Record<string, unknown> | null>;
    };
  }
}

console.log('🛠️ Auth Debug utilities loaded. Use window.authDebug in console.');
console.log('Available commands:');
console.log('  - await window.authDebug.diagnose()       // Full diagnostic report');
console.log('  - await window.authDebug.validate()       // Check RLS requirements');
console.log('  - await window.authDebug.checkIntegrity() // Verify profile integrity');
console.log('  - await window.authDebug.autoFix()        // Attempt automatic fix');
console.log('  - await window.authDebug.decodeToken()    // Decode JWT token');
