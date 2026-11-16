import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
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

  return <Ctx.Provider value={user}>{children}</Ctx.Provider>;
}
