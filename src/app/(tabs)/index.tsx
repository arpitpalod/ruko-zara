import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { RequestCard } from '../../components/RequestCard';
import { api, isDemo } from '../../lib/api';
import { applyVote } from '../../lib/format';
import { useUser } from '../../lib/session';
import { C } from '../../lib/theme';
import type { FeedItem, Verdict } from '../../lib/types';

/** Chaupal — the public square where strangers vote on purchases. */
export default function Feed() {
  const user = useUser();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setErr(null);
      setItems(await api.feed());
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

  const onVote = async (id: string, v: Verdict) => {
    setItems((xs) => xs.map((x) => (x.id === id ? applyVote(x, v) : x)));
    try {
      await api.vote(id, v);
    } catch (e: any) {
      setErr(e.message);
      load();
    }
  };

  return (
    <FlatList
      data={items}
      keyExtractor={(x) => x.id}
      contentContainerStyle={s.list}
      refreshing={loading}
      onRefresh={load}
      ListHeaderComponent={
        <View style={{ gap: 6, marginBottom: 4 }}>
          <Text style={s.tag}>Kharidne se pehle, janta se poocho.</Text>
          {isDemo ? <Text style={s.demo}>Demo mode · data sirf is device pe hai</Text> : null}
          {err ? <Text style={s.err}>{err}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        loading ? undefined : <Text style={s.empty}>Abhi koi arzi nahi. Pehli arzi tum daalo! ✍️</Text>
      }
      renderItem={({ item }) => (
        <RequestCard r={item} meId={user.id} onVote={onVote} onPress={() => router.push(`/request/${item.id}`)} />
      )}
    />
  );
}

const s = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  tag: { fontSize: 15, color: C.sub },
  demo: { fontSize: 12, color: C.brand, backgroundColor: C.brandSoft, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  err: { color: C.no },
  empty: { textAlign: 'center', color: C.sub, marginTop: 40 },
});
