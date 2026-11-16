import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, isDemo } from '../lib/api';
import { useSession } from '../lib/session';
import { C } from '../lib/theme';
import type { CodeMode } from '../lib/types';

/** Email login with a one-time code. An anonymous user keeps their requests and votes. */
export default function Login() {
  const { setUser } = useSession();
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
        <Text style={s.h}>Pehle email verify karo ✉️</Text>
        <Text style={s.p}>
          Vote, arzi aur comment ke liye ek baar email verify karna zaroori hai — taaki votes asli logon ke hon. Email kisi ko
          dikhega nahi.
        </Text>

        {!mode ? (
          <>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tumhara@email.com"
              placeholderTextColor={C.sub}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              onSubmitEditing={send}
            />
            <Btn label={busy ? 'Bhej rahe hain…' : 'Code bhejo'} onPress={send} disabled={!validEmail || busy} />
          </>
        ) : (
          <>
            <Text style={s.p}>
              <Text style={{ fontWeight: '700', color: C.ink }}>{clean}</Text> pe code bheja hai. Spam folder bhi dekh lena.
              {isDemo ? ' (Demo: 123456)' : ''}
            </Text>
            {mode === 'login' ? (
              <Text style={s.note}>
                Yeh email pehle se registered hai — verify karne pe us account mein login hoga. Is phone ki bina-login wali activity
                us account mein nahi jayegi.
              </Text>
            ) : null}
            <TextInput
              style={[s.input, s.code]}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 10))}
              placeholder="Code"
              placeholderTextColor={C.sub}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              onSubmitEditing={verify}
            />
            <Btn label={busy ? 'Check ho raha hai…' : 'Verify karo'} onPress={verify} disabled={code.length < 6 || busy} />
            <View style={s.row}>
              <Pressable onPress={() => setMode(null)}>
                <Text style={s.link}>Email badlo</Text>
              </Pressable>
              <Pressable onPress={send} disabled={busy}>
                <Text style={s.link}>Code dobara bhejo</Text>
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
});
