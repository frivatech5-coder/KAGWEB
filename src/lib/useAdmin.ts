import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  adminSignIn,
  adminSignOut,
  checkRedirectSignIn,
  isAdminUser,
  watchAuth,
} from './firebase';

function formatAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google sign-in was closed before finishing. Tap "Sign in with Google" to try again.';
  }
  if (code === 'auth/network-request-failed') {
    return 'No internet connection or network timed out. Please check your connection and try again.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This web address is not yet added to Firebase Authorized Domains. Ask the church tech lead to add it in Firebase Console.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Google sign-in is not turned on in Firebase Authentication yet.';
  }
  return error instanceof Error ? error.message : 'Could not sign in right now. Please try again.';
}

export function useAdmin() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    checkRedirectSignIn().catch((err) => {
      if (active) setError(formatAuthError(err));
    });

    const unsub = watchAuth(async (nextUser) => {
      if (!active) return;
      if (!nextUser) {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setUser(nextUser);
      try {
        const allowed = await isAdminUser(nextUser);
        if (active) setIsAdmin(allowed);
      } catch {
        if (active) setIsAdmin(false);
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await adminSignIn();
    } catch (err) {
      setError(formatAuthError(err));
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await adminSignOut();
    } catch (err) {
      setError(formatAuthError(err));
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    user,
    isAdmin,
    loading,
    signIn,
    signOut,
    error,
    clearError,
  };
}
