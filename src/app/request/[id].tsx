import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RequestCard } from '../../components/RequestCard';
import { friendly } from '../../lib/errors';
import { api } from '../../lib/api';
import { ago, applyVote, inr, timeLeft } from '../../lib/format';
import { requestUrl, shareOnWhatsApp } from '../../lib/share';
import { useT } from '../../lib/i18n';
import { requireLogin, useUser } from '../../lib/session';
import { C } from '../../lib/theme';
import type { Comment, FeedItem, Verdict } from '../../lib/types';

/** One arzi: full reason, live votes, and "janta ki raay" (comments). */
export default function RequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useUser();
  const { t } = useT();
  const [r, setR] = useState<FeedItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const [req, cs] = await Promise.all([api.get(id), api.comments(id)]);
      setR(req);
      setComments(cs);
    } catch (e: any) {
      setMsg(friendly(e, t));
    } finally {
      setLoaded(true);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 5000); // light polling so new votes show up
      return () => clearInterval(t);
    }, [load]),
  );

  const onVote = async (rid: string, v: Verdict) => {
    if (!requireLogin(user)) return;
    setR((x) => (x ? applyVote(x, v) : x));
    try {
      await api.vote(rid, v);
    } catch (e: any) {
      setMsg(friendly(e, t));
      load();
    }
  };

  const send = async () => {
    const text = body.trim();
    if (!text || !requireLogin(user)) return;
    setBody('');
    try {
      await api.comment(id, text);
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

  if (!loaded) return null;
  if (!r) return <Text style={s.empty}>{t('detail.notFound')}</Text>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <RequestCard r={r} meId={user.id} onVote={onVote} full />
        {r.user_id === user.id && timeLeft(r.closes_at, t) ? <Text style={s.nudge}>{t('share.nudge')}</Text> : null}
        <Pressable
          style={s.wa}
          onPress={() =>
            shareOnWhatsApp(
              t(r.user_id === user.id ? 'share.mine' : 'share.other', { item: r.item, price: inr(r.price_inr), link: requestUrl(r.id) }),
            )
          }
        >
          <Text style={s.waT}>{t('share.button')}</Text>
        </Pressable>
        {r.user_id !== user.id ? (
          <View style={s.actions}>
            <Pressable onPress={() => report('request', r.id)} disabled={reported.has(r.id)}>
              <Text style={s.report}>{reported.has(r.id) ? t('detail.reported') : t('detail.report')}</Text>
            </Pressable>
            <Pressable onPress={() => block(r.user_id, true)}>
              <Text style={s.report}>{t('detail.block', { handle: r.handle })}</Text>
            </Pressable>
          </View>
        ) : null}
        {msg ? <Text style={{ color: C.no }}>{msg}</Text> : null}

        <Text style={s.h}>{t('detail.comments', { n: comments.length })}</Text>
        {comments.length === 0 ? <Text style={s.muted}>{t('detail.noComments')}</Text> : null}
        {comments.map((c) => (
          <View key={c.id} style={s.comment}>
            <View style={s.cRow}>
              <Text style={s.cHandle}>
                {c.handle}
                {c.user_id === r.user_id ? ' · OP' : ''}
              </Text>
              <Text style={s.muted}>{ago(c.created_at, t)}</Text>
            </View>
            <Text style={s.cBody}>{c.body}</Text>
            {c.user_id !== user.id ? (
              <View style={[s.actions, { justifyContent: 'flex-end' }]}>
                <Pressable onPress={() => report('comment', c.id)} disabled={reported.has(c.id)}>
                  <Text style={s.cReport}>{reported.has(c.id) ? t('detail.reported') : t('detail.reportShort')}</Text>
                </Pressable>
                {c.user_id !== r.user_id ? (
                  <Pressable onPress={() => block(c.user_id, false)}>
                    <Text style={s.cReport}>{t('detail.blockShort')}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      <View style={s.composer}>
        <TextInput style={s.input} value={body} onChangeText={setBody} placeholder={t('detail.placeholder')} placeholderTextColor={C.sub} maxLength={300} onSubmitEditing={send} returnKeyType="send" />
        <Pressable onPress={send} style={[s.send, !body.trim() && { opacity: 0.4 }]} disabled={!body.trim()}>
          <Text style={s.sendT}>{t('detail.send')}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 24 },
  empty: { textAlign: 'center', color: C.sub, marginTop: 40 },
  nudge: { fontSize: 13, color: C.ink, textAlign: 'center' },
  wa: { backgroundColor: '#25D366', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  waT: { color: '#fff', fontWeight: '800', fontSize: 15 },
  report: { fontSize: 13, color: C.sub },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  h: { fontSize: 17, fontWeight: '800', color: C.ink, marginTop: 8 },
  muted: { fontSize: 12, color: C.sub },
  comment: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.line, gap: 4 },
  cRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cHandle: { fontSize: 13, fontWeight: '700', color: C.ink },
  cBody: { fontSize: 15, lineHeight: 21, color: C.ink },
  cReport: { fontSize: 11, color: C.sub },
  composer: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: '#fff' },
  input: { flex: 1, backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: C.ink },
  send: { backgroundColor: C.brand, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  sendT: { color: '#fff', fontWeight: '800' },
});
