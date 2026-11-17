import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { InstallHint } from '../../components/InstallHint';
import { RequestCard } from '../../components/RequestCard';
import { friendly } from '../../lib/errors';
import { api } from '../../lib/api';
import { inr } from '../../lib/format';
import { LANGS, useT } from '../../lib/i18n';
import { LEGAL, WEB_BASE, openLink } from '../../lib/legal';
import { shareOnWhatsApp } from '../../lib/share';
import { useSession } from '../../lib/session';
import { C } from '../../lib/theme';
import type { FeedItem, Outcome } from '../../lib/types';

/** Meri Arzi — your requests, outcomes and money saved. */
export default function Mine() {
  const { user, setUser } = useSession();
  const { t, lang, setLang } = useT();
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

  const decide = async (id: string, o: Outcome) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, outcome: o } : x)));
    try {
      await api.setOutcome(id, o);
    } catch (e: any) {
      setErr(friendly(e, t));
      load();
    }
  };

  const deleteAccount = async () => {
    try {
      setUser(await api.deleteAccount());
      setConfirmDelete(false);
      load();
    } catch (e: any) {
      setErr(friendly(e, t));
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
          <Text style={s.heroLabel}>{t('mine.saved')}</Text>
          <Text style={s.heroAmt}>{inr(saved)}</Text>
          <Text style={s.heroSub}>{t('mine.stats', { handle: user.handle, n: items.length, k: skipped })}</Text>
          {saved > 0 ? (
            <Pressable style={s.brag} onPress={() => shareOnWhatsApp(t('share.savings', { amt: inr(saved), link: WEB_BASE }))}>
              <Text style={s.bragT}>{t('mine.shareSavings')}</Text>
            </Pressable>
          ) : null}
          {err ? <Text style={{ color: C.no, marginTop: 6 }}>{err}</Text> : null}
        </View>
      }
      ListFooterComponent={
        <View style={s.account}>
          {user.email ? (
            <Text style={s.accT}>{t('mine.verified', { email: user.email })}</Text>
          ) : (
            <Pressable style={s.loginBtn} onPress={() => router.push('/login')}>
              <Text style={s.loginT}>{t('mine.verify')}</Text>
            </Pressable>
          )}
          <View style={{ gap: 8 }}>
            <Text style={s.accT}>{t('mine.language')} · भाषा</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {LANGS.map((l) => (
                <Pressable key={l.id} onPress={() => setLang(l.id)} style={[s.langChip, lang === l.id && s.langOn]}>
                  <Text style={[s.langT, lang === l.id && { color: '#fff' }]}>{l.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <InstallHint />
          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
            <Text style={s.legalLink} onPress={() => openLink(LEGAL.terms)}>{t('legal.terms')}</Text>
            <Text style={s.legalLink} onPress={() => openLink(LEGAL.privacy)}>{t('legal.privacy')}</Text>
            <Text style={s.legalLink} onPress={() => openLink(LEGAL.grievance)}>{t('legal.contact')}</Text>
          </View>
          {!confirmDelete ? (
            <Pressable onPress={() => setConfirmDelete(true)}>
              <Text style={s.del}>{t('mine.delete')}</Text>
            </Pressable>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={s.accT}>{t('mine.deleteConfirm')}</Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Pressable onPress={deleteAccount}>
                  <Text style={[s.del, { fontWeight: '800' }]}>{t('mine.deleteYes')}</Text>
                </Pressable>
                <Pressable onPress={() => setConfirmDelete(false)}>
                  <Text style={s.accT}>{t('mine.deleteNo')}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      }
      ListEmptyComponent={loading ? undefined : <Text style={s.empty}>{t('mine.empty')}</Text>}
      renderItem={({ item }) => (
        <View style={{ gap: 8 }}>
          <RequestCard r={item} meId={user.id} onPress={() => router.push(`/request/${item.id}`)} />
          {!item.outcome ? (
            <View style={s.decide}>
              <Text style={s.decideQ}>{t('mine.decideQ')}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable style={[s.dBtn, { backgroundColor: C.yesSoft }]} onPress={() => decide(item.id, 'skipped')}>
                  <Text style={[s.dBtnT, { color: C.yes }]}>{t('mine.skip')}</Text>
                </Pressable>
                <Pressable style={[s.dBtn, { backgroundColor: C.brandSoft }]} onPress={() => decide(item.id, 'bought')}>
                  <Text style={[s.dBtnT, { color: C.brand }]}>{t('mine.bought')}</Text>
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
  brag: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#25D366', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  bragT: { color: '#fff', fontWeight: '800', fontSize: 14 },
  empty: { textAlign: 'center', color: C.sub, marginTop: 30 },
  decide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, flexWrap: 'wrap', gap: 8 },
  decideQ: { fontSize: 13, color: C.sub, fontWeight: '600' },
  dBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  dBtnT: { fontSize: 13, fontWeight: '700' },
  account: { marginTop: 12, gap: 14, paddingHorizontal: 4, paddingBottom: 24 },
  accT: { fontSize: 13, color: C.sub },
  langChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff' },
  langOn: { backgroundColor: C.brand, borderColor: C.brand },
  langT: { fontSize: 13, fontWeight: '700', color: C.ink },
  legalLink: { fontSize: 13, color: C.brand, fontWeight: '600' },
  loginBtn: { backgroundColor: C.brand, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  loginT: { color: '#fff', fontWeight: '800' },
  del: { fontSize: 13, color: C.no },
});
