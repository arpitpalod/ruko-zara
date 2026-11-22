import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GoogleButton } from '../components/GoogleButton';
import { Button, Field } from '../components/ui';
import { friendly } from '../lib/errors';
import { api, isDemo } from '../lib/api';
import { useT } from '../lib/i18n';
import { LEGAL, WEB_BASE, openLink } from '../lib/legal';
import { googleOn, loginReturnUrl } from '../lib/loginReturn';
import { useSession } from '../lib/session';
import { M, R, T } from '../lib/theme';
import type { CodeMode } from '../lib/types';

/** Email login with a one-time code. An anonymous user keeps their requests and votes. */
export default function Login() {
  const { user, setUser } = useSession();
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
      setErr(friendly(e, t));
    } finally {
      setBusy(false);
    }
  };

  // Google (website): a guest's account gets the Google sign-in added, so their votes and arzi stay theirs.
  const showGoogle = googleOn(isDemo, user.isAdmin);
  const google = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api.signInWithGoogle(loginReturnUrl(new URL(WEB_BASE).pathname));
      if (r === 'redirecting') return; // off to Google; the page comes back signed in
      setUser(r);
      router.back();
    } catch (e: any) {
      setErr(friendly(e, t));
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
      setErr(friendly(e, t));
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
            {showGoogle ? (
              <>
                <GoogleButton label={t('login.google')} onPress={google} disabled={busy} />
                <Text style={s.or}>{t('login.orEmail')}</Text>
              </>
            ) : null}
            <Field
              value={email}
              onChangeText={setEmail}
              placeholder={t('login.emailPh')}
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
            <Field
              style={s.code}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 10))}
              placeholder={t('login.codePh')}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              onSubmitEditing={verify}
            />
            <Btn label={busy ? t('login.checking') : t('login.verify')} onPress={verify} disabled={code.length < 6 || busy} />
            <View style={s.row}>
              <Button label={t('login.changeEmail')} variant="text" onPress={() => setMode(null)} />
              <Button label={t('login.resend')} variant="text" onPress={send} disabled={busy} />
            </View>
          </>
        )}

        {err ? <Text style={s.err}>{err}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Btn({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Button label={label} onPress={onPress} disabled={disabled} size="lg" block style={{ minHeight: 56 }} />;
}

const s = StyleSheet.create({
  wrap: { padding: 20, gap: 16 },
  h: { ...T.headline, color: M.onSurface },
  p: { ...T.body, color: M.onSurfaceVariant },
  note: { ...T.bodySmall, fontSize: 14, lineHeight: 20, color: M.onPrimaryContainer, backgroundColor: M.primaryContainer, padding: 12, borderRadius: R.md, overflow: 'hidden' },
  code: { fontSize: 24, lineHeight: 30, letterSpacing: 6, textAlign: 'center', fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  err: { ...T.body, color: M.no },
  legal: { ...T.bodySmall, fontSize: 12, color: M.onSurfaceVariant, textAlign: 'center' },
  or: { ...T.bodySmall, color: M.onSurfaceVariant, textAlign: 'center' },
  legalLink: { color: M.primary, fontWeight: '700', textDecorationLine: 'underline' },
});
