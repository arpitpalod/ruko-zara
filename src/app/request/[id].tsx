import { Ban, Camera, CircleCheck, Eye, EyeOff, IconText, MessageCircle, Send, Share2 } from '../../components/Icon';
import { Button, Card, CheckRow, Field } from '../../components/ui';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RequestCard } from '../../components/RequestCard';
import { NextCard } from '../../components/FeedNudges';
import { AskCard } from '../../components/AskCard';
import { ShareCardModal } from '../../components/ShareCardModal';
import { ShareResult } from '../../components/ShareResult';
import { WhatIsCard } from '../../components/WhatIsCard';
import { canShareResult } from '../../lib/verdict';
import { friendly, isGuestLimit } from '../../lib/errors';
import { api } from '../../lib/api';
import { ago, applyVote, inr, timeLeft } from '../../lib/format';
import { arrivedOn, leftArrival } from '../../lib/entry';
import { requestUrl, shareOnWhatsApp } from '../../lib/share';
import { useT } from '../../lib/i18n';
import { requireLogin, useUser } from '../../lib/session';
import { M, R, T } from '../../lib/theme';
import type { ReasonCount, VoteReason } from '../../lib/reasons';
import type { Comment, FeedItem, Verdict } from '../../lib/types';

/** One arzi: full reason, live votes, and "janta ki raay" (comments). */
export default function RequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useUser();
  const own = (uid: string) => !!user.id && uid === user.id;
  const { t, lang } = useT();
  const [r, setR] = useState<FeedItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());
  // Admin only: who is banned, and which ban is waiting for a second tap.
  const [banned, setBanned] = useState<Set<string>>(new Set());
  const [confirmBan, setConfirmBan] = useState<string | null>(null);
  const [reasons, setReasons] = useState<ReasonCount[]>([]);
  const [sharing, setSharing] = useState(false); // the result card's preview
  const [asking, setAsking] = useState(false); // the Instagram Story card's preview (own open arzi)

  const load = useCallback(async () => {
    try {
      const [req, cs, ids] = await Promise.all([
        api.get(id),
        api.comments(id),
        user.isAdmin ? api.adminBannedIds() : Promise.resolve([] as string[]),
      ]);
      // Reasons only where the split is shown anyway (the database checks this too).
      const split = !!req && !req.preview &&
        (!!req.my_vote || (!!user.id && req.user_id === user.id) || new Date(req.closes_at).getTime() <= Date.now() || user.isAdmin);
      setReasons(split ? await api.voteReasons(id).catch(() => []) : []);
      setR(req);
      setComments(cs);
      setBanned(new Set(ids));
    } catch (e: any) {
      setMsg(friendly(e, t));
    } finally {
      setLoaded(true);
    }
  }, [id, user.isAdmin, user.id]); // user.id: reload with your own view once sign-in finishes

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 5000); // light polling so new votes show up
      return () => clearInterval(t);
    }, [load]),
  );

  // After a vote here, bring "What next?" into view (the results above it can be long).
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const viewH = useRef(0);
  const votedAt = useRef(0);
  const cardBottom = useRef(0);
  const nextH = useRef(0);
  // Only for a moment after voting, while the results and reasons fill in; never fights the person's own scrolling.
  const showNext = () => {
    if (Date.now() - votedAt.current > 2500 || !nextH.current) return;
    scroller.current?.scrollTo({ y: Math.max(0, cardBottom.current + 12 + nextH.current + 16 - viewH.current), animated: true });
  };
  const onVote = async (rid: string, v: Verdict, reason: VoteReason) => {
    votedAt.current = Date.now();
    setR((x) => (x ? (x.preview ? { ...x, my_vote: v } : applyVote(x, v)) : x));
    try {
      await api.vote(rid, v, reason);
      load(); // results and reasons, now that you've voted
    } catch (e: any) {
      setMsg(friendly(e, t));
      if (isGuestLimit(e)) router.push('/login');
      load();
    }
  };

  const pendingComment = useRef(false);
  useEffect(() => {
    if (user.email && pendingComment.current) {
      pendingComment.current = false;
      send();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.email]);

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    if (!requireLogin(user)) {
      pendingComment.current = true; // send automatically once the email is verified
      return;
    }
    try {
      setMsg(null);
      await api.comment(id, text);
      setBody(''); // clear only after it's saved, so a blocked comment can be edited
      load();
    } catch (e: any) {
      setMsg(friendly(e, t));
    }
  };

  const moderate = async (type: 'request' | 'comment', tid: string, hide: boolean) => {
    try {
      setMsg(null);
      await api.adminSetHidden(type, tid, hide);
      load();
    } catch (e: any) {
      setMsg(friendly(e, t));
    }
  };

  // Silent ban: two taps, so nobody gets banned by accident.
  const toggleBan = async (userId: string) => {
    const isBanned = banned.has(userId);
    if (!isBanned && confirmBan !== userId) {
      setConfirmBan(userId);
      return;
    }
    setConfirmBan(null);
    try {
      setMsg(null);
      await api.adminSetBanned(userId, !isBanned, isBanned ? undefined : 'Banned from the app by an admin');
      load();
    } catch (e: any) {
      setMsg(friendly(e, t));
    }
  };

  const report = async (type: 'request' | 'comment', tid: string) => {
    try {
      await api.report(type, tid);
      setReported((s) => new Set(s).add(tid));
    } catch (e: any) {
      setMsg(friendly(e, t));
    }
  };

  const block = async (userId: string, isAuthor: boolean) => {
    try {
      await api.block(userId);
      if (isAuthor) router.back();
      else load();
    } catch (e: any) {
      setMsg(friendly(e, t));
    }
  };

  // The poster gives or takes back their OK to feature this arzi on our social pages.
  const toggleFeature = (ok: boolean) => {
    if (!r) return;
    setR({ ...r, feature_ok: ok });
    api.setFeatureOk(r.id, ok).catch((e) => {
      setR((x) => (x ? { ...x, feature_ok: !ok } : x));
      setMsg(friendly(e, t));
    });
  };

  const toFeed = () => {
    leftArrival();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  if (!loaded) return null;
  if (!r)
    return (
      <ScrollView contentContainerStyle={s.wrap}>
        {arrivedOn(String(id)) ? <WhatIsCard /> : null}
        <Text style={s.empty}>{t('detail.notFound')}</Text>
        <Button label={t('next.more')} size="lg" block onPress={toFeed} />
      </ScrollView>
    );
  // Just voted on someone else's arzi: ask what next, right under the result.
  const votedHere = !!r.my_vote && !own(r.user_id);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView
        ref={scroller}
        onLayout={(e) => (viewH.current = e.nativeEvent.layout.height)}
        contentContainerStyle={s.wrap}
        keyboardShouldPersistTaps="handled"
      >
        {arrivedOn(r.id) ? <WhatIsCard /> : null}
        <View
          onLayout={(e) => {
            cardBottom.current = e.nativeEvent.layout.y + e.nativeEvent.layout.height;
            showNext();
          }}
        >
          <RequestCard r={r} meId={user.id} onVote={onVote} full authorBanned={banned.has(r.user_id)} reasons={reasons} />
        </View>
        {votedHere ? (
          <View
            onLayout={(e) => {
              nextH.current = e.nativeEvent.layout.height;
              showNext();
            }}
          >
            <NextCard onMore={toFeed} />
          </View>
        ) : null}
        {own(r.user_id) && timeLeft(r.closes_at, t) ? <Text style={s.nudge}>{t('share.nudge')}</Text> : null}
        {own(r.user_id) && canShareResult(r) ? (
          <Button label={t('rc.button')} icon={Share2} size="lg" block variant="tonal" colors={{ bg: M.primaryContainer, fg: M.onPrimaryContainer }} onPress={() => setSharing(true)} testID="share-result" />
        ) : null}
        {sharing ? <ShareResult r={r} reasons={reasons} onClose={() => setSharing(false)} /> : null}
        <Button
          label={t('share.button')}
          icon={MessageCircle}
          size="lg"
          block
          colors={{ bg: M.whatsapp, fg: '#FFFFFF' }}
          onPress={() =>
            shareOnWhatsApp(
              t(own(r.user_id) ? 'share.mine' : 'share.other', {
                item: r.item,
                price: inr(r.price_inr),
                reason: r.reason.length > 110 ? r.reason.slice(0, 107).trimEnd() + '…' : r.reason,
                link: requestUrl(r.id, 'wa', lang),
              }),
            )
          }
        />
        {own(r.user_id) && timeLeft(r.closes_at, t) ? (
          <Button label={t('ask.button')} icon={Camera} variant="outlined" size="lg" block onPress={() => setAsking(true)} testID="share-story" />
        ) : null}
        {asking ? (
          <ShareCardModal
            title={t('ask.title')}
            card={(ref) => <AskCard cardRef={ref} r={r} />}
            file="ruko-zara-ask.png"
            text={t('ask.text', { item: r.item, link: requestUrl(r.id, 'igs', lang) })}
            copy={requestUrl(r.id, 'igs', lang)}
            hint={t('ask.hint')}
            copiedNote={t('ask.copied')}
            onClose={() => setAsking(false)}
            testID="share-story"
          />
        ) : null}
        {votedHere ? null : <Button label={t('detail.more')} variant="outlined" size="lg" block onPress={toFeed} />}
        {own(r.user_id) && !r.preview ? (
          <CheckRow label={t('feature.ask')} checked={!!r.feature_ok} onChange={toggleFeature} testID="feature-own" />
        ) : null}
        {!own(r.user_id) ? (
          <View style={s.actions}>
            <Pressable onPress={() => report('request', r.id)} disabled={reported.has(r.id)}>
              <Text style={s.report}>{reported.has(r.id) ? t('detail.reported') : t('detail.report')}</Text>
            </Pressable>
            {!user.isAdmin && r.user_id ? (
              <Pressable onPress={() => block(r.user_id, true)}>
                <Text style={s.report}>{t('detail.block', { handle: r.handle })}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {user.isAdmin ? (
          <Button
            label={r.hidden ? t('admin.unhide') : t('admin.hide')}
            icon={r.hidden ? Eye : EyeOff}
            block
            colors={GREY}
            onPress={() => moderate('request', r.id, !r.hidden)}
          />
        ) : null}
        {user.isAdmin && !own(r.user_id) ? (
          <Button
            label={
              banned.has(r.user_id)
                ? t('admin.unban', { handle: r.handle })
                : confirmBan === r.user_id
                  ? t('admin.banConfirm', { handle: r.handle })
                  : t('admin.ban', { handle: r.handle })
            }
            icon={banned.has(r.user_id) ? CircleCheck : Ban}
            block
            colors={GREY}
            onPress={() => toggleBan(r.user_id)}
          />
        ) : null}
        {msg ? <Text style={s.err}>{msg}</Text> : null}

        <Text style={s.h}>{t('detail.comments', { n: comments.length })}</Text>
        {comments.length === 0 ? <Text style={s.muted}>{t('detail.noComments')}</Text> : null}
        {comments.map((c) => (
          <Card key={c.id} variant="outlined" style={s.comment}>
            <View style={s.cRow}>
              <Text style={s.cHandle}>
                {c.handle}
                {c.user_id && c.user_id === r.user_id ? ' · OP' : ''}
              </Text>
              <Text style={s.muted}>{ago(c.created_at, t)}</Text>
            </View>
            {user.isAdmin && banned.has(c.user_id) ? <IconText icon={Ban} size={12} color={M.onSurfaceVariant} style={s.cHidden}>{t('admin.bannedBadge')}</IconText> : null}
            {user.isAdmin && c.hidden ? <IconText icon={EyeOff} size={12} color={M.onSurfaceVariant} style={s.cHidden}>{t('admin.hiddenBadge')}</IconText> : null}
            <Text style={s.cBody}>{c.body}</Text>
            {user.isAdmin ? (
              <View style={[s.actions, { justifyContent: 'flex-start' }]}>
                <Pressable onPress={() => moderate('comment', c.id, !c.hidden)}>
                  <IconText icon={c.hidden ? Eye : EyeOff} size={13} color={M.onSurfaceVariant} style={s.cAdmin}>{c.hidden ? t('admin.unhide') : t('admin.hide')}</IconText>
                </Pressable>
                {!own(c.user_id) ? (
                  <Pressable onPress={() => toggleBan(c.user_id)}>
                    <Text style={s.cAdmin}>
                      {banned.has(c.user_id)
                        ? t('admin.unbanShort')
                        : confirmBan === c.user_id
                          ? t('admin.banShortConfirm')
                          : t('admin.banShort')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {!own(c.user_id) ? (
              <View style={[s.actions, { justifyContent: 'flex-end' }]}>
                <Pressable onPress={() => report('comment', c.id)} disabled={reported.has(c.id)}>
                  <Text style={s.cReport}>{reported.has(c.id) ? t('detail.reported') : t('detail.reportShort')}</Text>
                </Pressable>
                {c.user_id && c.user_id !== r.user_id && !user.isAdmin ? (
                  <Pressable onPress={() => block(c.user_id, false)}>
                    <Text style={s.cReport}>{t('detail.blockShort')}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </Card>
        ))}
      </ScrollView>

      <View style={s.composer}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Field style={s.input} value={body} onChangeText={setBody} placeholder={t('detail.placeholder')} maxLength={300} onSubmitEditing={send} returnKeyType="send" />
        </View>
        <Button label={t('detail.send')} icon={Send} onPress={send} disabled={!body.trim()} style={{ alignSelf: 'center' }} />
      </View>
    </KeyboardAvoidingView>
  );
}

// Admin tools in calm grey: they show on every arzi, and red all day wears you down (Arpit, 19 Nov).
const GREY = { bg: 'transparent', fg: M.onSurfaceVariant, border: M.outlineVariant };

const s = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 24 },
  empty: { ...T.body, textAlign: 'center', color: M.onSurfaceVariant, marginVertical: 24 },
  err: { ...T.body, color: M.no },
  cHidden: { ...T.labelMedium, color: M.onSurfaceVariant },
  cAdmin: { ...T.labelMedium, color: M.onSurfaceVariant, alignSelf: 'flex-start' },
  nudge: { ...T.bodySmall, color: M.onSurfaceVariant, textAlign: 'center' },
  report: { ...T.labelLarge, fontWeight: '500', color: M.onSurfaceVariant, paddingVertical: 4 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  h: { ...T.titleLarge, color: M.onSurface, marginTop: 12 },
  muted: { ...T.bodySmall, fontSize: 12, color: M.onSurfaceVariant },
  comment: { padding: 14, gap: 4, borderRadius: R.md },
  cRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cHandle: { ...T.titleSmall, fontSize: 13, color: M.onSurface },
  cBody: { ...T.body, color: M.onSurface },
  cReport: { ...T.labelMedium, fontWeight: '500', color: M.onSurfaceVariant },
  composer: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: M.surfaceContainer },
  input: { width: '100%', minHeight: 48, paddingVertical: 11, borderRadius: R.full, paddingHorizontal: 18, backgroundColor: M.surfaceContainerLowest, borderColor: M.outlineVariant },
});
