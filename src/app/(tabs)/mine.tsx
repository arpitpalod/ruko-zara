import { BadgeCheck, CirclePlus, EyeOff, IconText, MessageCircle, PartyPopper, ShoppingBag } from '../../components/Icon';
import { Button, Segmented } from '../../components/ui';
import { adminHiddenArzi } from '../../lib/adminHidden';
import { refreshMine } from '../../lib/savings';
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
import { useSession, openLogin } from '../../lib/session';
import { M, R, T } from '../../lib/theme';
import type { FeedItem, Outcome } from '../../lib/types';

/** Meri Arzi — your requests, outcomes and money saved. */
export default function Mine() {
  const { user, setUser } = useSession();
  const { t, lang, setLang } = useT();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [hiddenCount, setHiddenCount] = useState<number | null>(null); // admins only

  const load = useCallback(async () => {
    setLoading(true);
    if (user.isAdmin) adminHiddenArzi().then((r) => setHiddenCount(r.items.length), () => setHiddenCount(null));
    try {
      setErr(null);
      setItems(await api.mine());
    } catch (e: any) {
      setErr(friendly(e, t));
    } finally {
      setLoading(false);
    }
  }, [user.isAdmin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const decide = async (id: string, o: Outcome) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, outcome: o } : x)));
    try {
      await api.setOutcome(id, o);
      refreshMine().catch(() => {}); // the savings bar on the feed
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
          {user.handle ? <Text style={s.heroSub}>{t('mine.stats', { handle: user.handle, n: items.length, k: skipped })}</Text> : null}
          {saved === 0 ? <Text style={s.heroSub}>{t('save.how')}</Text> : null}
          <View style={s.heroBtns}>
            <Button label={t('save.post')} icon={CirclePlus} onPress={() => router.push('/new')} testID="mine-post" />
            {saved > 0 ? (
              <Button
                label={t('mine.shareSavings')}
                icon={MessageCircle}
                colors={{ bg: M.whatsapp, fg: '#FFFFFF' }}
                onPress={() => shareOnWhatsApp(t('share.savings', { amt: inr(saved), link: `${WEB_BASE}/?src=wa` }))}
              />
            ) : null}
          </View>
          {err ? <Text style={s.err}>{err}</Text> : null}
        </View>
      }
      ListFooterComponent={
        <View style={s.account}>
          {user.isAdmin ? (
            <Pressable onPress={() => router.push('/hidden')} accessibilityRole="button">
              <IconText icon={EyeOff} color={M.onSurfaceVariant} style={s.accT}>{t('admin.hiddenLink', { n: hiddenCount ?? '…' })}</IconText>
            </Pressable>
          ) : null}
          {user.email ? (
            <IconText icon={BadgeCheck} color={M.yes} style={s.accT}>{t('mine.verified', { email: user.email })}</IconText>
          ) : (
            <Button label={t('mine.verify')} size="lg" block onPress={() => openLogin()} />
          )}
          <View style={{ gap: 8 }}>
            <Text style={s.accT}>{t('mine.language')} · भाषा</Text>
            <Segmented options={LANGS.map((l) => ({ value: l.id, label: l.label }))} value={lang} onChange={setLang} />
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
                  <Text style={[s.del, { fontWeight: '700' }]}>{t('mine.deleteYes')}</Text>
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
                <Button label={t('mine.skip')} icon={PartyPopper} size="sm" colors={{ bg: M.yesContainer, fg: M.onYesContainer }} onPress={() => decide(item.id, 'skipped')} />
                <Button label={t('mine.bought')} icon={ShoppingBag} size="sm" colors={{ bg: M.surfaceContainerLowest, fg: M.onSurface, border: M.outlineVariant }} onPress={() => decide(item.id, 'bought')} />
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
  hero: { backgroundColor: M.primaryContainer, borderRadius: R.xl, padding: 24, marginBottom: 4 },
  heroLabel: { ...T.labelLarge, color: M.onPrimaryContainer, opacity: 0.85 },
  heroAmt: { ...T.display, fontSize: 40, lineHeight: 48, color: M.onPrimaryContainer, marginTop: 2 },
  heroSub: { ...T.bodySmall, color: M.onPrimaryContainer, opacity: 0.8, marginTop: 4 },
  heroBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  err: { ...T.body, color: M.no, marginTop: 6 },
  empty: { ...T.body, textAlign: 'center', color: M.onSurfaceVariant, marginTop: 30 },
  decide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, flexWrap: 'wrap', gap: 8 },
  decideQ: { ...T.titleSmall, fontSize: 13, color: M.onSurfaceVariant },
  account: { marginTop: 16, gap: 16, paddingHorizontal: 4, paddingBottom: 24 },
  accT: { ...T.bodySmall, color: M.onSurfaceVariant },
  legalLink: { ...T.labelLarge, fontSize: 13, color: M.primary },
  del: { ...T.labelLarge, fontSize: 13, fontWeight: '500', color: M.no },
});
