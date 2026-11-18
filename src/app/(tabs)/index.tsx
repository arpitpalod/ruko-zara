import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { InstallHint } from '../../components/InstallHint';
import { RequestCard } from '../../components/RequestCard';
import { UpdateBanner } from '../../components/UpdateBanner';
import { api, isDemo } from '../../lib/api';
import { friendly, isGuestLimit } from '../../lib/errors';
import { applyVote, catLabel } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { useUser } from '../../lib/session';
import { C } from '../../lib/theme';
import { splitByInterest, useInterests } from '../../lib/interests';
import { CATEGORIES, type FeedItem, type Verdict } from '../../lib/types';

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
  // Guests get 20 free votes; null once the email is verified.
  const [left, setLeft] = useState<number | null>(null);
  const [banned, setBanned] = useState<Set<string>>(new Set()); // admins only
  const { picked, toggle, clear } = useInterests();

  const load = useCallback(
    async (which: Tab = tab) => {
      setLoading(true);
      try {
        setErr(null);
        if (user.email) setLeft(null);
        else api.guestVotesLeft().then(setLeft, () => setLeft(null));
        if (user.isAdmin) api.adminBannedIds().then((ids) => setBanned(new Set(ids)), () => {});
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
    [tab, user.id, user.email, user.isAdmin, t],
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
    const isNew = !items.find((x) => x.id === id)?.my_vote;
    if (isNew && left === 0) return router.push('/login');
    setItems((xs) => xs.map((x) => (x.id === id ? applyVote(x, v) : x)));
    try {
      await api.vote(id, v);
      if (isNew) setLeft((n) => (n === null ? n : Math.max(0, n - 1)));
    } catch (e: any) {
      setErr(friendly(e, t));
      if (isGuestLimit(e)) {
        setLeft(0);
        router.push('/login');
      }
      load();
    }
  };

  // Not-yet-voted first (your picked interests on top), then what you already voted on.
  const fresh = tab === 'open' ? items.filter((x) => !votedAtLoad.has(x.id)) : items;
  const [forYou, rest] = splitByInterest(fresh, picked);
  const done = tab === 'open' ? items.filter((x) => votedAtLoad.has(x.id)) : [];
  const sections = [
    { key: 'forYou', data: forYou },
    { key: 'rest', data: rest },
    ...(tab === 'open' ? [{ key: 'done', data: done }] : []),
  ];

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
          <UpdateBanner />
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            <Text style={s.chipsLabel}>{t('feed.interests')}</Text>
            <Pressable onPress={clear} style={[s.chip, picked.length === 0 && s.chipOn]}>
              <Text style={[s.chipT, picked.length === 0 && s.chipTOn]}>{t('feed.all')}</Text>
            </Pressable>
            {CATEGORIES.map((c) => (
              <Pressable key={c} onPress={() => toggle(c)} style={[s.chip, picked.includes(c) && s.chipOn]}>
                <Text style={[s.chipT, picked.includes(c) && s.chipTOn]}>{catLabel(c, t)}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {isDemo ? <Text style={s.demo}>{t('feed.demo')}</Text> : null}
          {left !== null && left <= 5 && tab === 'open' ? (
            <Pressable onPress={() => router.push('/login')} style={s.guest}>
              <Text style={s.guestT}>{left > 0 ? t('feed.guestLeft', { n: left }) : t('feed.guestOut')}</Text>
            </Pressable>
          ) : null}
          {err ? <Text style={s.err}>{err}</Text> : null}
        </View>
      }
      renderSectionHeader={({ section }) => {
        if (loading && items.length === 0) return null;
        if (section.key === 'forYou' && forYou.length === 0 && rest.length === 0)
          return <Text style={s.empty}>{tab === 'open' ? t('feed.emptyVote') : t('feed.emptyResults')}</Text>;
        if (section.key === 'rest' && rest.length > 0) return <Text style={s.sectionH}>{t('feed.otherInterests')}</Text>;
        if (section.key === 'done' && section.data.length > 0)
          return <Text style={s.sectionH}>{t('feed.votedHeader', { n: section.data.length })}</Text>;
        return null;
      }}
      renderItem={({ item }) => (
        <View style={{ marginBottom: 12 }}>
          <RequestCard
            r={item}
            meId={user.id}
            onVote={onVote}
            onPress={() => router.push(`/request/${item.id}`)}
            authorBanned={banned.has(item.user_id)}
          />
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  list: { padding: 16 },
  sectionH: { fontSize: 13, fontWeight: '700', color: C.sub, marginTop: 8, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  tag: { fontSize: 14, color: C.sub },
  seg: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: C.line, padding: 3, gap: 3 },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segOn: { backgroundColor: C.ink },
  segT: { fontSize: 14, fontWeight: '700', color: C.ink },
  chips: { gap: 6, alignItems: 'center', paddingRight: 8 },
  chipsLabel: { fontSize: 12.5, color: C.sub, marginRight: 2 },
  chip: { borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipT: { fontSize: 13, fontWeight: '600', color: C.ink },
  chipTOn: { color: '#fff' },
  demo: { fontSize: 12, color: C.brand, backgroundColor: C.brandSoft, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  err: { color: C.no },
  guest: { backgroundColor: C.brandSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  guestT: { color: C.brand, fontWeight: '700', fontSize: 14, lineHeight: 20 },
  empty: { textAlign: 'center', color: C.sub, marginTop: 24, marginBottom: 24, lineHeight: 22 },
});
