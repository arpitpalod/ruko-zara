import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { RequestCard } from '../../components/RequestCard';
import { friendly } from '../../lib/errors';
import { api, isDemo } from '../../lib/api';
import { applyVote } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { requireLogin, useUser } from '../../lib/session';
import { C } from '../../lib/theme';
import type { FeedItem, Verdict } from '../../lib/types';

/** Chaupal — the public square where strangers vote on purchases. */
export default function Feed() {
  const user = useUser();
  const { t } = useT();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setErr(null);
      setItems(await api.feed());
    } catch (e: any) {
      setErr(friendly(e, t));
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
    if (!requireLogin(user)) return;
    setItems((xs) => xs.map((x) => (x.id === id ? applyVote(x, v) : x)));
    try {
      await api.vote(id, v);
    } catch (e: any) {
      setErr(friendly(e, t));
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
          <Text style={s.tag}>{t('feed.tagline')}</Text>
          {isDemo ? <Text style={s.demo}>{t('feed.demo')}</Text> : null}
          {err ? <Text style={s.err}>{err}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        loading ? undefined : <Text style={s.empty}>{t('feed.empty')}</Text>
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
