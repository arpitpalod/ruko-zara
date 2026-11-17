import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { InstallHint } from '../../components/InstallHint';
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
  // Which arzi were already voted on when the list loaded — a fresh vote doesn't jump the card away.
  const [votedAtLoad, setVotedAtLoad] = useState<Set<string>>(new Set());

  const load = useCallback(
    async (which: Tab = tab) => {
      setLoading(true);
      try {
        setErr(null);
        const rows = await api.feed(which);
        // Vote tab: not-yet-voted first, then the ones you voted on (your own arzi live in Meri Arzi).
        setItems(which === 'open' ? rows.filter((r) => r.user_id !== user.id) : rows);
        setVotedAtLoad(new Set(rows.filter((r) => r.my_vote).map((r) => r.id)));
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

  const todo = tab === 'open' ? items.filter((x) => !votedAtLoad.has(x.id)) : items;
  const done = tab === 'open' ? items.filter((x) => votedAtLoad.has(x.id)) : [];
  const sections =
    tab === 'open'
      ? [
          { key: 'todo', data: todo },
          { key: 'done', data: done },
        ]
      : [{ key: 'closed', data: items }];

  return (
    <SectionList
      sections={sections}
      keyExtractor={(x) => x.id}
      contentContainerStyle={s.list}
      stickySectionHeadersEnabled={false}
      refreshing={loading}
      onRefresh={() => load()}
      ListHeaderComponent={
        <View style={{ gap: 10, marginBottom: 4 }}>
          <Text style={s.tag}>{t('feed.tagline')}</Text>
          <InstallHint />
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
      renderSectionHeader={({ section }) => {
        if (loading && items.length === 0) return null;
        if (section.key === 'todo' && section.data.length === 0) return <Text style={s.empty}>{t('feed.emptyVote')}</Text>;
        if (section.key === 'closed' && section.data.length === 0) return <Text style={s.empty}>{t('feed.emptyResults')}</Text>;
        if (section.key === 'done' && section.data.length > 0)
          return <Text style={s.sectionH}>{t('feed.votedHeader', { n: section.data.length })}</Text>;
        return null;
      }}
      renderItem={({ item }) => (
        <View style={{ marginBottom: 12 }}>
          <RequestCard r={item} meId={user.id} onVote={onVote} onPress={() => router.push(`/request/${item.id}`)} />
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  list: { padding: 16 },
  sectionH: { fontSize: 14, fontWeight: '800', color: C.sub, marginTop: 8, marginBottom: 10 },
  tag: { fontSize: 15, color: C.sub },
  seg: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 4, gap: 4 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segOn: { backgroundColor: C.brand },
  segT: { fontSize: 14, fontWeight: '800', color: C.ink },
  demo: { fontSize: 12, color: C.brand, backgroundColor: C.brandSoft, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  err: { color: C.no },
  empty: { textAlign: 'center', color: C.sub, marginTop: 24, marginBottom: 24, lineHeight: 22 },
});
