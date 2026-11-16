import { router } from 'expo-router';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { api } from './api';
import { C } from './theme';
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

/** Signs the user in anonymously on first launch; shows a loader until ready. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const connect = () => {
    setErr(null);
    api.init().then(setUser).catch((e) => setErr(e?.message ?? String(e)));
  };

  useEffect(connect, []);

  if (!user)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding: 24 }}>
        {err ? (
          <View style={{ alignItems: 'center', gap: 16 }}>
            <Text style={{ color: C.no, textAlign: 'center' }}>Connect nahi ho paya: {err}</Text>
            <Pressable onPress={connect} style={{ backgroundColor: C.brand, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Dobara try karo</Text>
            </Pressable>
          </View>
        ) : (
          <ActivityIndicator color={C.brand} />
        )}
      </View>
    );

  return <Ctx.Provider value={{ user, setUser }}>{children}</Ctx.Provider>;
}
