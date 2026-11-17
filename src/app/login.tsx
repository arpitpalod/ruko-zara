import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, isDemo } from '../lib/api';
import { useT } from '../lib/i18n';
import { LEGAL, openLink } from '../lib/legal';
import { useSession } from '../lib/session';
import { C } from '../lib/theme';
import type { CodeMode } from '../lib/types';

/** Email login with a one-time code. An anonymous user keeps their requests and votes. */
export default function Login() {
  const { setUser } = useSession();
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<CodeMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const clean = email.trim().toLowerCase();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);

  const send = async () => {
    if (!validEmail || busy) return;
    setBusy(true);
    setErr(null);
    try {
      setMode(await api.sendEmailCode(clean));
      setCode('');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!mode || code.length < 6 || busy) return;
    setBusy(true);
    setErr(null);
    try {
      setUser(await api.verifyEmailCode(clean, code, mode));
      router.back();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <Text style={s.h}>{t('login.title')}</Text>
        <Text style={s.p}>{t('login.why')}</Text>

        {!mode ? (
          <>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t('login.emailPh')}
              placeholderTextColor={C.sub}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              onSubmitEditing={send}
            />
            <Btn label={busy ? t('common.sending') : t('login.send')} onPress={send} disabled={!validEmail || busy} />
            <Text style={s.legal}>
              {t('legal.consent')}{' '}
              <Text style={s.legalLink} onPress={() => openLink(LEGAL.terms)}>
                {t('legal.terms')}
              </Text>
              {' · '}
              <Text style={s.legalLink} onPress={() => openLink(LEGAL.privacy)}>
                {t('legal.privacy')}
              </Text>
            </Text>
          </>
        ) : (
          <>
            <Text style={s.p}>
              {t('login.sent', { email: clean })}
              {isDemo ? t('login.demo') : ''}
            </Text>
            {mode === 'login' ? (
              <Text style={s.note}>{t('login.existing')}</Text>
            ) : null}
            <TextInput
              style={[s.input, s.code]}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 10))}
              placeholder={t('login.codePh')}
              placeholderTextColor={C.sub}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              onSubmitEditing={verify}
            />
            <Btn label={busy ? t('login.checking') : t('login.verify')} onPress={verify} disabled={code.length < 6 || busy} />
            <View style={s.row}>
              <Pressable onPress={() => setMode(null)}>
                <Text style={s.link}>{t('login.changeEmail')}</Text>
              </Pressable>
              <Pressable onPress={send} disabled={busy}>
                <Text style={s.link}>{t('login.resend')}</Text>
              </Pressable>
            </View>
          </>
        )}

        {err ? <Text style={{ color: C.no }}>{err}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Btn({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[s.btn, disabled && { opacity: 0.4 }]}>
      <Text style={s.btnT}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, gap: 16 },
  h: { fontSize: 22, fontWeight: '800', color: C.ink },
  p: { fontSize: 15, lineHeight: 21, color: C.sub },
  note: { fontSize: 13, lineHeight: 19, color: C.ink, backgroundColor: C.brandSoft, padding: 10, borderRadius: 10, overflow: 'hidden' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 17, color: C.ink },
  code: { fontSize: 24, letterSpacing: 6, textAlign: 'center', fontWeight: '700' },
  btn: { backgroundColor: C.brand, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnT: { color: '#fff', fontSize: 17, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { color: C.brand, fontWeight: '700', fontSize: 14 },
  legal: { fontSize: 12, lineHeight: 18, color: C.sub, textAlign: 'center' },
  legalLink: { color: C.brand, fontWeight: '700', textDecorationLine: 'underline' },
});
