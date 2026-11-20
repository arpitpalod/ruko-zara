import { router } from 'expo-router';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import { rememberSource, sendSourceOnce } from './source';
import type { User } from './types';

const Ctx = createContext<{ user: User; setUser: (u: User) => void } | null>(null);

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession outside SessionProvider');
  return s;
}

export function useUser(): User {
  return useSession().user;
}

/** Voting, posting and commenting need a verified email. Returns false (and opens login) if missing. */
export function requireLogin(user: User): boolean {
  if (user.email) return true;
  router.push('/login');
  return false;
}

/** Stand-in until sign-in finishes: no id, no email. Never matches anyone's arzi. */
export const SIGNING_IN: User = { id: '', handle: '', email: null, isAdmin: false };

/**
 * Shows the app straight away. Sign-in (a guest account and the bot check on a new phone) runs in
 * the background; reading works without it, and actions that need an account wait for it.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(SIGNING_IN);

  useEffect(() => {
    const remembered = rememberSource(); // ?src=… on the link they opened
    const signedIn = (u: User) => {
      setUser(u);
      remembered.then(() => sendSourceOnce((src) => api.setSource(src)));
    };
    const off = api.onSignedIn(signedIn);
    api.init().then(signedIn, () => {}); // if it fails, the first vote or post tries again
    return off;
  }, []);

  return <Ctx.Provider value={{ user, setUser }}>{children}</Ctx.Provider>;
}
