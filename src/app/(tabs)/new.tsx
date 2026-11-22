import { IconText, Link2 } from '../../components/Icon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, CheckRow, Chip, Field as Input } from '../../components/ui';
import { SavingsHeader, trackScroll } from '../../components/SavingsHeader';
import { friendly } from '../../lib/errors';
import { api } from '../../lib/api';
import { catLabel, domainOf, extractLink, inr } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { requireLogin, useUser } from '../../lib/session';
import { M, T } from '../../lib/theme';
import { CATEGORIES, DURATIONS } from '../../lib/types';

const DRAFT = 'rz.newDraft';
const PENDING = 'rz.postAfterLogin';

/** Nayi Arzi — the purchase request form. Writing the "why" is half the cure. */
export default function NewRequest() {
  const scrollY = useRef(new Animated.Value(0)).current; // shrinks the savings header
  const user = useUser();
  const { t } = useT();
  const [item, setItem] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<string>('Gadgets');
  const [reason, setReason] = useState('');
  const [alternative, setAlternative] = useState('');
  const [linkText, setLinkText] = useState('');
  const [hours, setHours] = useState<number>(24);
  const [featureOk, setFeatureOk] = useState(false);
  // Started from the feed's "What are you about to buy?" card: carry over what they typed and the category.
  const from = useLocalSearchParams<{ item?: string; price?: string; category?: string }>();
  useEffect(() => {
    if (!from.item && !from.price && !from.category) return;
    if (from.item) setItem(String(from.item).slice(0, 80));
    if (from.price) setPrice(String(from.price).replace(/\D/g, '').slice(0, 8));
    if (from.category && (CATEGORIES as readonly string[]).includes(String(from.category))) setCategory(String(from.category));
    router.setParams({ item: undefined, price: undefined, category: undefined });
  }, [from.item, from.price, from.category]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // The form is kept on this device until it's posted: Google sign-in leaves the site and comes back with
  // a fresh page, and a half-written arzi shouldn't be lost to that (or to a closed tab).
  const restored = useRef(false);
  useEffect(() => {
    AsyncStorage.multiGet([DRAFT, PENDING])
      .then(([[, d], [, p]]) => {
        if (d) {
          const v = JSON.parse(d);
          setItem((x) => x || String(v.item ?? ''));
          setPrice((x) => x || String(v.price ?? ''));
          if ((CATEGORIES as readonly string[]).includes(v.category) && !from.category) setCategory(v.category);
          setReason((x) => x || String(v.reason ?? ''));
          setAlternative((x) => x || String(v.alternative ?? ''));
          setLinkText((x) => x || String(v.linkText ?? ''));
          if (DURATIONS.includes(v.hours)) setHours(v.hours);
          setFeatureOk(v.featureOk === true);
        }
        if (p === '1') pendingPost.current = true; // they pressed Send, then went to sign in
      })
      .catch(() => {})
      .finally(() => (restored.current = true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    const timer = setTimeout(() => {
      const empty = !item && !price && !reason && !alternative && !linkText;
      (empty ? AsyncStorage.removeItem(DRAFT) : AsyncStorage.setItem(DRAFT, JSON.stringify({ item, price, category, reason, alternative, linkText, hours, featureOk }))).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [item, price, category, reason, alternative, linkText, hours, featureOk]);

  const priceNum = Number(price || 0);
  const link = linkText.trim() ? extractLink(linkText) : null;
  const linkBad = linkText.trim().length > 0 && !link;
  const valid = item.trim().length >= 2 && priceNum > 0 && reason.trim().length >= 10 && !linkBad;

  // Fill everything first; if login is needed, the arzi posts itself right after the email is verified.
  const pendingPost = useRef(false);
  useEffect(() => {
    if (user.email && pendingPost.current) {
      pendingPost.current = false;
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.email]);
  useFocusEffect(
    useCallback(() => {
      // Back from the login screen without signing in. (Not while the page is still starting up: after
      // Google, the person arrives here before their sign-in has finished loading.)
      if (user.id && !user.email) {
        pendingPost.current = false;
        AsyncStorage.removeItem(PENDING).catch(() => {});
      }
    }, [user.id, user.email]),
  );

  const submit = async () => {
    if (!valid || busy) return;
    if (!requireLogin(user)) {
      pendingPost.current = true; // post automatically once the email is verified
      AsyncStorage.setItem(PENDING, '1').catch(() => {}); // and across a Google sign-in's page reload
      return;
    }
    AsyncStorage.removeItem(PENDING).catch(() => {});
    setBusy(true);
    setErr(null);
    try {
      const id = await api.create({
        item: item.trim(),
        price_inr: priceNum,
        category,
        reason: reason.trim(),
        alternative: alternative.trim() || null,
        link,
        duration_hours: hours,
        feature_ok: featureOk,
      });
      setItem(''); setPrice(''); setReason(''); setAlternative(''); setLinkText(''); setHours(24); setFeatureOk(false);
      router.push(`/request/${id}`);
    } catch (e: any) {
      setErr(friendly(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SavingsHeader scrollY={scrollY} />
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled" onScroll={trackScroll(scrollY)} scrollEventThrottle={16}>
        <Text style={s.lead}>{t('new.lead')}</Text>

        <Field label={t('new.item')}>
          <Input value={item} onChangeText={setItem} placeholder={t('new.itemPh')} maxLength={80} />
        </Field>

        <Field label={t('new.price')}>
          <Input value={price} onChangeText={(t) => setPrice(t.replace(/\D/g, '').slice(0, 8))} placeholder="e.g. 8999" keyboardType="number-pad" />
          {priceNum > 0 ? <Text style={s.hint}>{inr(priceNum)}</Text> : null}
        </Field>

        <Field label={t('new.category')}>
          <View style={s.chips}>
            {CATEGORIES.map((c) => (
              <Chip key={c} label={catLabel(c, t)} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </View>
        </Field>

        <Field label={t('new.reason')}>
          <Input style={s.multi} value={reason} onChangeText={setReason} placeholder={t('new.reasonPh')} multiline maxLength={500} />
          <Text style={s.hint}>{reason.trim().length < 10 ? t('new.reasonMin', { n: reason.trim().length }) : `${reason.length}/500`}</Text>
        </Field>

        <Field label={t('new.alt')}>
          <Input value={alternative} onChangeText={setAlternative} placeholder={t('new.altPh')} maxLength={200} />
        </Field>

        <Field label={t('new.duration')}>
          <View style={s.chips}>
            {DURATIONS.map((h) => (
              <Chip
                key={h}
                label={h < 24 ? t('dur.hours', { n: h }) : h === 24 ? t('dur.day1') : t('dur.days', { n: h / 24 })}
                selected={hours === h}
                onPress={() => setHours(h)}
              />
            ))}
          </View>
          <Text style={s.hint}>{t('new.durationNote')}</Text>
        </Field>

        <Field label={t('new.link')}>
          <Input
            value={linkText}
            onChangeText={setLinkText}
            placeholder={t('new.linkPh')}
           
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            maxLength={600}
          />
          {link ? <IconText icon={Link2} size={13} color={M.onSurfaceVariant} style={s.hint}>{domainOf(link)}</IconText> : null}
          {linkBad ? <Text style={[s.hint, { color: M.no }]}>{t('new.linkBad')}</Text> : null}
        </Field>

        <CheckRow label={t('feature.ask')} checked={featureOk} onChange={setFeatureOk} testID="feature-ok" />
        {err ? <Text style={s.err}>{err}</Text> : null}

        <Button label={busy ? t('common.sending') : t('new.submit')} size="lg" block onPress={submit} disabled={!valid || busy} style={{ marginTop: 4, minHeight: 56 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, gap: 22, paddingBottom: 40 },
  lead: { ...T.bodySmall, fontSize: 14, lineHeight: 20, color: M.onSurfaceVariant },
  label: { ...T.titleSmall, color: M.onSurface },
  multi: { minHeight: 112, textAlignVertical: 'top' },
  hint: { ...T.bodySmall, fontSize: 12, color: M.onSurfaceVariant, paddingHorizontal: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  err: { ...T.body, color: M.no },
});
