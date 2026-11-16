import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { RequestCard } from '../../components/RequestCard';
import { api } from '../../lib/api';
import { inr } from '../../lib/format';
import { useSession } from '../../lib/session';
import { C } from '../../lib/theme';
import type { FeedItem, Outcome } from '../../lib/types';

/** Meri Arzi — your requests, outcomes and money saved. */
export default function Mine() {
  const { user, setUser } = useSession();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setErr(null);
      setItems(await api.mine());
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const decide = async (id: string, o: Outcome) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, outcome: o } : x)));
    try {
      await api.setOutcome(id, o);
    } catch (e: any) {
      setErr(e.message);
      load();
    }
  };

  const deleteAccount = async () => {
    try {
      setUser(await api.deleteAccount());
      setConfirmDelete(false);
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const saved = items.filter((x) => x.outcome === 'skipped').reduce((a, x) => a + x.price_inr, 0);
  const skipped = items.filter((x) => x.outcome === 'skipped').length;

  return (
    <FlatList
      data={items}
      keyExtractor={(x) => x.id}
      contentContainerStyle={s.list}
      refreshing={loading}
      onRefresh={load}
      ListHeaderComponent={
        <View style={s.hero}>
          <Text style={s.heroLabel}>Ab tak bachaye</Text>
          <Text style={s.heroAmt}>{inr(saved)}</Text>
          <Text style={s.heroSub}>
            {user.handle} · {items.length} arzi · {skipped} baar ruk gaye
          </Text>
          {err ? <Text style={{ color: C.no, marginTop: 6 }}>{err}</Text> : null}
        </View>
      }
      ListFooterComponent={
        <View style={s.account}>
          {user.email ? (
            <Text style={s.accT}>✅ Verified: {user.email}</Text>
          ) : (
            <Pressable style={s.loginBtn} onPress={() => router.push('/login')}>
              <Text style={s.loginT}>Email verify karo (vote aur arzi ke liye)</Text>
            </Pressable>
          )}
          {!confirmDelete ? (
            <Pressable onPress={() => setConfirmDelete(true)}>
              <Text style={s.del}>Account delete karo</Text>
            </Pressable>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={s.accT}>Pakka? Tumhari saari arzi, votes aur comments hamesha ke liye delete ho jayenge.</Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Pressable onPress={deleteAccount}>
                  <Text style={[s.del, { fontWeight: '800' }]}>Haan, delete karo</Text>
                </Pressable>
                <Pressable onPress={() => setConfirmDelete(false)}>
                  <Text style={s.accT}>Rehne do</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      }
      ListEmptyComponent={loading ? undefined : <Text style={s.empty}>Abhi tak koi arzi nahi daali.</Text>}
      renderItem={({ item }) => (
        <View style={{ gap: 8 }}>
          <RequestCard r={item} meId={user.id} onPress={() => router.push(`/request/${item.id}`)} />
          {!item.outcome ? (
            <View style={s.decide}>
              <Text style={s.decideQ}>Aakhir mein kya kiya?</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable style={[s.dBtn, { backgroundColor: C.yesSoft }]} onPress={() => decide(item.id, 'skipped')}>
                  <Text style={[s.dBtnT, { color: C.yes }]}>Nahi kharida 🎉</Text>
                </Pressable>
                <Pressable style={[s.dBtn, { backgroundColor: C.brandSoft }]} onPress={() => decide(item.id, 'bought')}>
                  <Text style={[s.dBtnT, { color: C.brand }]}>Kharid liya 🛍️</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  list: { padding: 16, gap: 14 },
  hero: { backgroundColor: C.ink, borderRadius: 20, padding: 20, marginBottom: 4 },
  heroLabel: { color: '#D6D3D1', fontSize: 13, fontWeight: '600' },
  heroAmt: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 2 },
  heroSub: { color: '#A8A29E', fontSize: 13, marginTop: 4 },
  empty: { textAlign: 'center', color: C.sub, marginTop: 30 },
  decide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, flexWrap: 'wrap', gap: 8 },
  decideQ: { fontSize: 13, color: C.sub, fontWeight: '600' },
  dBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  dBtnT: { fontSize: 13, fontWeight: '700' },
  account: { marginTop: 12, gap: 14, paddingHorizontal: 4, paddingBottom: 24 },
  accT: { fontSize: 13, color: C.sub },
  loginBtn: { backgroundColor: C.brand, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  loginT: { color: '#fff', fontWeight: '800' },
  del: { fontSize: 13, color: C.no },
});
