import { IconText, ShieldCheck } from './Icon';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CAPTCHA_ORIGIN, CAPTCHA_URL, captchaBroken, captchaInteractive, captchaOn, captchaSolved, isFatalCaptchaError, parseCaptchaMsg, subscribeCaptcha, subscribeWanted } from '../lib/captcha';
import { useT } from '../lib/i18n';
import { C } from '../lib/theme';

/**
 * Web: runs the bot check in a small card at the bottom of the screen while signing in; the app
 * stays usable around it. It must stay visible: Chrome on Android throttles hidden or off-screen
 * frames, and the check then never finishes. The full overlay appears only if Cloudflare asks for a
 * tap and someone is waiting on it.
 */
export function CaptchaHost() {
  const { t } = useT();
  const [round, setRound] = useState(0);
  // Cloudflare asked for a tap; shown only once someone is waiting on it (tapped vote, post,
  // comment, login), so a check running in the background never interrupts reading.
  const [asked, setAsked] = useState(false);
  const [wanted, setWanted] = useState(false);
  const visible = asked && wanted;

  useEffect(
    () =>
      subscribeCaptcha((r) => {
        setAsked(false);
        setRound(r);
      }),
    [],
  );
  useEffect(() => subscribeWanted(setWanted), []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== CAPTCHA_ORIGIN) return;
      const m = parseCaptchaMsg(e.data);
      if (!m) return;
      if (m.type === 'token' && m.token) captchaSolved(m.token);
      else if (m.type === 'interactive') {
              captchaInteractive();
              setAsked(true);
            }
      else if (m.type === 'error' && isFatalCaptchaError(m.code)) captchaBroken(m.code!);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  if (!captchaOn || round === 0) return null;

  return (
    <View style={visible ? s.overlay : s.dock} pointerEvents={visible ? 'auto' : 'box-none'}>
      <View style={s.card}>
        <IconText icon={ShieldCheck} size={16} color={C.ink} style={s.h}>{t('captcha.checking')}</IconText>
        <iframe
          key={round}
          src={CAPTCHA_URL}
          title="captcha"
          style={{ width: 310, height: 80, border: 0, background: 'transparent' }}
          onError={() => captchaBroken('load')}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, bottom: 72, alignItems: 'center', zIndex: 1000 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 12, gap: 8, alignItems: 'center', borderWidth: 1, borderColor: C.line, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12 },
  h: { fontSize: 15, fontWeight: '800', color: C.ink },
});
