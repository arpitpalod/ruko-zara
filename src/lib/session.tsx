import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { api } from './api';
import { C } from './theme';
import type { User } from './types';

const Ctx = createContext<User | null>(null);

export function useUser(): User {
  const u = useContext(Ctx);
  if (!u) throw new Error('useUser outside SessionProvider');
  return u;
}

/** Signs the user in anonymously on first launch; shows a loader until ready. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.init().then(setUser).catch((e) => setErr(e?.message ?? String(e)));
  }, []);

  if (!user)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding: 24 }}>
        {err ? (
          <Text style={{ color: C.no, textAlign: 'center' }}>Connect nahi ho paya: {err}</Text>
        ) : (
          <ActivityIndicator color={C.brand} />
        )}
      </View>
    );

  return <Ctx.Provider value={user}>{children}</Ctx.Provider>;
}
