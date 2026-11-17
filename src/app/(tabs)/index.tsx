import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { RequestCard } from '../../components/RequestCard';
import { api, isDemo } from '../../lib/api';
import { friendly } from '../../lib/errors';
import { applyVote } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { useUser } from '../../lib/session';
import { C } from '../../lib/theme';
import type { FeedItem, Verdict } from '../../lib/types';

type Tab = 'open' | 'closed';

/**
 * Chaupal — the public square.
 * "Vote" tab: open requests you haven't voted on yet (guests can vote).
 * "Results" tab: requests whose 24 hours are over.
 */
export default function Feed() {
  const user = useUser();
  const { t } = useT();
  const [tab, setTab] = useState<Tab>('open');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    async (which: Tab = tab) => {
      setLoading(true);
      try {
        setErr(null);
        const rows = await api.feed(which);
        // Vote tab hides your own requests and ones you've already voted on (until the next refresh).
        setItems(which === 'open' ? rows.filter((r) => r.user_id !== user.id && !r.my_vote) : rows);
      } catch (e: any) {
        setErr(friendly(e, t));
      } finally {
        setLoading(false);
      }
    },
    [tab, user.id, t],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const switchTab = (next: Tab) => {
    if (next === tab) return;
    setItems([]);
    setTab(next);
  };

  const onVote = async (id: string, v: Verdict) => {
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
      onRefresh={() => load()}
      ListHeaderComponent={
        <View style={{ gap: 10, marginBottom: 4 }}>
          <Text style={s.tag}>{t('feed.tagline')}</Text>
          <View style={s.seg}>
            {(['open', 'closed'] as Tab[]).map((k) => (
              <Pressable key={k} onPress={() => switchTab(k)} style={[s.segBtn, tab === k && s.segOn]}>
                <Text style={[s.segT, tab === k && { color: '#fff' }]}>
                  {k === 'open' ? t('feed.tabVote') : t('feed.tabResults')}
                </Text>
              </Pressable>
            ))}
          </View>
          {isDemo ? <Text style={s.demo}>{t('feed.demo')}</Text> : null}
          {err ? <Text style={s.err}>{err}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        loading ? undefined : <Text style={s.empty}>{tab === 'open' ? t('feed.emptyVote') : t('feed.emptyResults')}</Text>
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
  seg: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 4, gap: 4 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segOn: { backgroundColor: C.brand },
  segT: { fontSize: 14, fontWeight: '800', color: C.ink },
  demo: { fontSize: 12, color: C.brand, backgroundColor: C.brandSoft, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  err: { color: C.no },
  empty: { textAlign: 'center', color: C.sub, marginTop: 40, lineHeight: 22 },
});
