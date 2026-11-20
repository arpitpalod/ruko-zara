import { IconText, Vote } from '../../components/Icon';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { Chip, Segmented } from '../../components/ui';
import { InstallHint } from '../../components/InstallHint';
import { RequestCard } from '../../components/RequestCard';
import { DecideCard, EMPTY_DRAFT, PostNudge, type PostDraft } from '../../components/FeedNudges';
import { SavingsHeader, trackScroll } from '../../components/SavingsHeader';
import { SkeletonList } from '../../components/SkeletonCard';
import { UpdateBanner } from '../../components/UpdateBanner';
import { api, isDemo } from '../../lib/api';
import { friendly, isGuestLimit } from '../../lib/errors';
import { applyVote, catLabel } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { useUser } from '../../lib/session';
import { M, R, T } from '../../lib/theme';
import { InterestsIntro } from '../../components/InterestsIntro';
import { splitByInterest, useInterests } from '../../lib/interests';
import { byScore, trendScore } from '../../lib/rank';
import { dismissPostNudge, loadNudgeState, markAsked, noteNewVote, shouldShowPostNudge, type NudgeState } from '../../lib/nudges';
import { refreshMine, useMine } from '../../lib/savings';
import type { VoteReason } from '../../lib/reasons';
import { CATEGORIES, type FeedItem, type Outcome, type Verdict } from '../../lib/types';

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
  const scrollY = useRef(new Animated.Value(0)).current; // shrinks the savings header
  const { picked, auto, asked, toggle, clear, learn, finishIntro } = useInterests();
  const [score, setScore] = useState<Map<string, number>>(new Map());
  const [lastVoted, setLastVoted] = useState<string | null>(null);
  const nudgeAnchor = useRef<string | null>(null);
  const [draft, setDraft] = useState<PostDraft>(EMPTY_DRAFT); // what they typed in the "post yours" card
  // One nudge at a time on the Vote tab: "Did you buy it?" first, then "Now post yours".
  const mine = useMine();
  const [nudge, setNudge] = useState<NudgeState | null>(null);
  useFocusEffect(
    useCallback(() => {
      loadNudgeState().then(setNudge, () => {});
    }, []),
  );

  // The list refreshes quietly (no spinner) once it has something to show, e.g. when sign-in finishes.
  const shown = useRef(false);
  const load = useCallback(
    async (which: Tab = tab) => {
      if (!shown.current) setLoading(true);
      try {
        setErr(null);
        if (user.email) setLeft(null);
        else api.guestVotesLeft().then(setLeft, () => setLeft(null));
        const [all, bannedIds] = await Promise.all([
          api.feed(which),
          user.isAdmin ? api.adminBannedIds().catch(() => [] as string[]) : Promise.resolve([] as string[]),
        ]);
        const bannedSet = new Set(bannedIds);
        setBanned(bannedSet);
        // Admins: hidden arzi and banned people's arzi live on their own page, not in the feed.
        const rows = user.isAdmin ? all.filter((r) => !r.hidden && !bannedSet.has(r.user_id)) : all;
        // Vote tab: not-yet-voted first, then the ones you voted on (your own arzi live in Meri Arzi).
        setItems(which === 'open' ? rows.filter((r) => !user.id || r.user_id !== user.id) : rows);
        shown.current = rows.length > 0;
        setVotedAtLoad(new Set(rows.filter((r) => r.my_vote).map((r) => r.id)));
        // Until someone picks "Show first" themselves, their votes pick it. Only from the Vote tab: the
        // Results tab holds a different set, and learning from both made the picks flip between tabs.
        if (which === 'open') learn(rows);
        // A fresh list: the "post yours" card finds its place again.
        nudgeAnchor.current = null;
        setLastVoted(null);
        // Trending order, fixed at load so cards don't jump while someone votes.
        const now = Date.now();
        setScore(new Map(rows.map((r) => [r.id, trendScore(r, now)])));
      } catch (e: any) {
        setErr(friendly(e, t));
      } finally {
        setLoading(false);
      }
    },
    [tab, user.id, user.email, user.isAdmin, t, learn],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const switchTab = (next: Tab) => {
    if (next === tab) return;
    shown.current = false;
    setItems([]);
    setTab(next);
  };

  const onVote = async (id: string, v: Verdict, reason: VoteReason) => {
    const item = items.find((x) => x.id === id);
    const isNew = !item?.my_vote;
    if (isNew && left === 0) return router.push('/login');
    // A preview has no split to update yet: mark the vote, then load the real numbers.
    setItems((xs) => xs.map((x) => (x.id === id ? (x.preview ? { ...x, my_vote: v } : applyVote(x, v)) : x)));
    try {
      await api.vote(id, v, reason);
      if (isNew) {
        setLeft((n) => (n === null ? n : Math.max(0, n - 1)));
        const votes = await noteNewVote();
        setNudge((x) => (x ? { ...x, votes } : x));
        setLastVoted(id); // the "post yours" card sits right under the card you just voted on
      }
      if (item?.preview) load();
    } catch (e: any) {
      setErr(friendly(e, t));
      if (isGuestLimit(e)) {
        setLeft(0);
        router.push('/login');
      }
      load();
    }
  };

  const answerDecide = async (r: FeedItem, o: Outcome | null) => {
    const asked = await markAsked(r.id);
    setNudge((x) => (x ? { ...x, asked } : x));
    if (!o) return;
    try {
      await api.setOutcome(r.id, o);
      refreshMine().catch(() => {});
    } catch (e: any) {
      setErr(friendly(e, t));
    }
  };
  const toDecide = nudge && user.id ? mine.toDecide.find((r) => !nudge.asked.includes(r.id)) : undefined;
  const showPostNudge =
    !!nudge && !!user.id && !toDecide &&
    shouldShowPostNudge({ votes: nudge.votes, dismissedAt: nudge.dismissedAt, posted: mine.posted, lastPostedAt: mine.lastPostedAt });

  // Not-yet-voted first (your picked interests on top), then what you already voted on.
  const fresh = tab === 'open' ? byScore(items.filter((x) => !votedAtLoad.has(x.id)), score) : items;
  const [forYou, rest] = splitByInterest(fresh, picked);
  const done = tab === 'open' ? items.filter((x) => votedAtLoad.has(x.id)) : [];
  // "What are you about to buy?" goes in the list, where people are looking: under the card they just
  // voted on, or after the 3rd card when they arrive already past the threshold.
  // The card appears under the card they just voted on (or the 3rd card), then stays there: moving it on
  // every vote made the list jump and threw away what they'd typed. Someone who has voted on everything
  // open still gets it, on top of what they voted on.
  const listed = [...forYou, ...rest];
  const ids = [...listed, ...done].map((x) => x.id);
  if (!(tab === 'open' && showPostNudge)) nudgeAnchor.current = null;
  else if (!nudgeAnchor.current || !ids.includes(nudgeAnchor.current))
    nudgeAnchor.current =
      lastVoted && ids.includes(lastVoted) ? lastVoted : (listed[Math.min(2, listed.length - 1)]?.id ?? done[0]?.id ?? null);
  const nudgeAt = nudgeAnchor.current;
  const sections = [
    { key: 'forYou', data: forYou },
    { key: 'rest', data: rest },
    ...(tab === 'open' ? [{ key: 'done', data: done }] : []),
  ];

  // First time on the feed: "What do you shop for?" (also after a shared link's "All requests").
  if (asked === undefined) return <View style={{ flex: 1, backgroundColor: M.surface }} />;
  if (!asked) return <InterestsIntro onDone={finishIntro} />;

  return (
    <View style={{ flex: 1 }}>
    <SavingsHeader scrollY={scrollY} postButton />
    <SectionList
      onScroll={trackScroll(scrollY)}
      scrollEventThrottle={16}
      sections={sections}
      keyExtractor={(x) => x.id}
      contentContainerStyle={s.list}
      stickySectionHeadersEnabled={false}
      refreshing={loading && items.length > 0}
      ListFooterComponent={loading && items.length === 0 && !err ? <SkeletonList /> : undefined}
      onRefresh={() => {
        setLoading(true);
        load();
      }}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          <UpdateBanner />
          <InstallHint />
          <Segmented
            options={[
              { value: 'open' as Tab, label: t('feed.tabVote') },
              { value: 'closed' as Tab, label: t('feed.tabResults') },
            ]}
            value={tab}
            onChange={switchTab}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            <Text style={s.chipsLabel}>{t('feed.interests')}</Text>
            <Chip label={t('feed.all')} selected={picked.length === 0} onPress={clear} />
            {CATEGORIES.map((c) => (
              <Chip key={c} label={catLabel(c, t)} selected={picked.includes(c)} onPress={() => toggle(c)} />
            ))}
          </ScrollView>
          {auto && picked.length > 0 ? <Text style={s.autoHint}>{t('feed.interestsAuto')}</Text> : null}
          {isDemo ? <Text style={s.demo}>{t('feed.demo')}</Text> : null}
          {left !== null && left <= 5 && tab === 'open' ? (
            <Pressable onPress={() => router.push('/login')} style={s.guest}>
              <IconText icon={Vote} size={18} color={M.onPrimaryContainer} style={s.guestT}>{left > 0 ? t('feed.guestLeft', { n: left }) : t('feed.guestOut')}</IconText>
            </Pressable>
          ) : null}
          {tab === 'open' && toDecide ? <DecideCard r={toDecide} onAnswer={(o) => answerDecide(toDecide, o)} /> : null}
          {err ? <Text style={s.err}>{err}</Text> : null}
        </View>
      }
      renderSectionHeader={({ section }) => {
        if (loading && items.length === 0) return null;
        if (section.key === 'forYou' && forYou.length === 0 && rest.length === 0)
          return <Text style={s.empty}>{tab === 'open' ? t('feed.emptyVote') : t('feed.emptyResults')}</Text>;
        if (section.key === 'rest' && rest.length > 0 && forYou.length > 0) return <Text style={s.sectionH}>{t('feed.otherInterests')}</Text>;
        if (section.key === 'done' && section.data.length > 0)
          return <Text style={s.sectionH}>{t('feed.votedHeader', { n: section.data.length })}</Text>;
        return null;
      }}
      renderItem={({ item }) => (
        <View style={{ marginBottom: 14 }}>
          <RequestCard
            r={item}
            meId={user.id}
            onVote={onVote}
            onPress={() => router.push(`/request/${item.id}`)}
            authorBanned={banned.has(item.user_id)}
          />
          {item.id === nudgeAt && nudge ? (
            <View style={{ marginTop: 14 }}>
              <PostNudge
                draft={draft}
                setDraft={setDraft}
                votes={nudge.votes}
                picked={picked}
                onDismiss={() => {
                  dismissPostNudge(nudge.votes);
                  setNudge({ ...nudge, dismissedAt: nudge.votes });
                }}
              />
            </View>
          ) : null}
        </View>
      )}
    />
    </View>
  );
}

const s = StyleSheet.create({
  list: { padding: 16, paddingTop: 14 },
  sectionH: { ...T.titleSmall, color: M.onSurfaceVariant, marginTop: 8, marginBottom: 10 },
  chips: { gap: 8, alignItems: 'center', paddingRight: 8 },
  chipsLabel: { ...T.labelMedium, color: M.onSurfaceVariant, marginRight: 2 },
  autoHint: { ...T.bodySmall, color: M.onSurfaceVariant, marginTop: -4 },
  demo: { ...T.labelMedium, color: M.onSurfaceVariant, backgroundColor: M.surfaceContainerHigh, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.sm, overflow: 'hidden' },
  err: { ...T.body, color: M.no },
  guest: { backgroundColor: M.primaryContainer, borderRadius: R.lg, paddingHorizontal: 16, paddingVertical: 12 },
  guestT: { ...T.labelLarge, color: M.onPrimaryContainer },
  empty: { ...T.body, textAlign: 'center', color: M.onSurfaceVariant, marginTop: 24, marginBottom: 24 },
});
