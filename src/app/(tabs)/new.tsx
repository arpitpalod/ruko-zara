import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../../lib/api';
import { catLabel, inr } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { requireLogin, useUser } from '../../lib/session';
import { C } from '../../lib/theme';
import { CATEGORIES } from '../../lib/types';

/** Nayi Arzi — the purchase request form. Writing the "why" is half the cure. */
export default function NewRequest() {
  const user = useUser();
  const { t } = useT();
  const [item, setItem] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<string>('Gadgets');
  const [reason, setReason] = useState('');
  const [alternative, setAlternative] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const priceNum = Number(price || 0);
  const valid = item.trim().length >= 2 && priceNum > 0 && reason.trim().length >= 10;

  const submit = async () => {
    if (!valid || busy || !requireLogin(user)) return;
    setBusy(true);
    setErr(null);
    try {
      const id = await api.create({
        item: item.trim(),
        price_inr: priceNum,
        category,
        reason: reason.trim(),
        alternative: alternative.trim() || null,
      });
      setItem(''); setPrice(''); setReason(''); setAlternative('');
      router.push(`/request/${id}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <Text style={s.lead}>{t('new.lead')}</Text>

        <Field label={t('new.item')}>
          <TextInput style={s.input} value={item} onChangeText={setItem} placeholder={t('new.itemPh')} placeholderTextColor={C.sub} maxLength={80} />
        </Field>

        <Field label={t('new.price')}>
          <TextInput style={s.input} value={price} onChangeText={(t) => setPrice(t.replace(/\D/g, '').slice(0, 8))} placeholder="e.g. 8999" placeholderTextColor={C.sub} keyboardType="number-pad" />
          {priceNum > 0 ? <Text style={s.hint}>{inr(priceNum)}</Text> : null}
        </Field>

        <Field label={t('new.category')}>
          <View style={s.chips}>
            {CATEGORIES.map((c) => (
              <Pressable key={c} onPress={() => setCategory(c)} style={[s.chip, category === c && s.chipOn]}>
                <Text style={[s.chipT, category === c && { color: '#fff' }]}>{catLabel(c, t)}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label={t('new.reason')}>
          <TextInput style={[s.input, s.multi]} value={reason} onChangeText={setReason} placeholder={t('new.reasonPh')} placeholderTextColor={C.sub} multiline maxLength={500} />
          <Text style={s.hint}>{reason.trim().length < 10 ? t('new.reasonMin', { n: reason.trim().length }) : `${reason.length}/500`}</Text>
        </Field>

        <Field label={t('new.alt')}>
          <TextInput style={s.input} value={alternative} onChangeText={setAlternative} placeholder={t('new.altPh')} placeholderTextColor={C.sub} maxLength={200} />
        </Field>

        {err ? <Text style={{ color: C.no }}>{err}</Text> : null}

        <Pressable onPress={submit} disabled={!valid || busy} style={[s.submit, (!valid || busy) && { opacity: 0.4 }]}>
          <Text style={s.submitT}>{busy ? t('common.sending') : t('new.submit')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, gap: 18, paddingBottom: 40 },
  lead: { fontSize: 14, color: C.sub, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '700', color: C.ink },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.ink },
  multi: { minHeight: 100, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: C.sub },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff' },
  chipOn: { backgroundColor: C.brand, borderColor: C.brand },
  chipT: { fontSize: 13, fontWeight: '600', color: C.ink },
  submit: { backgroundColor: C.brand, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  submitT: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
