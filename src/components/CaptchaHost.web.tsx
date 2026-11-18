import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CAPTCHA_ORIGIN, CAPTCHA_URL, captchaBroken, captchaInteractive, captchaOn, captchaSolved, isFatalCaptchaError, parseCaptchaMsg, subscribeCaptcha } from '../lib/captcha';
import { useT } from '../lib/i18n';
import { C } from '../lib/theme';

/** Web: runs the bot check in a hidden same-site iframe; shows it only if Cloudflare asks for a tap. */
export function CaptchaHost() {
  const { t } = useT();
  const [round, setRound] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(
    () =>
      subscribeCaptcha((r) => {
        setVisible(false);
        setRound(r);
      }),
    [],
  );

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== CAPTCHA_ORIGIN) return;
      const m = parseCaptchaMsg(e.data);
      if (!m) return;
      if (m.type === 'token' && m.token) captchaSolved(m.token);
      else if (m.type === 'interactive') {
              captchaInteractive();
              setVisible(true);
            }
      else if (m.type === 'error' && isFatalCaptchaError(m.code)) captchaBroken(m.code!);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  if (!captchaOn || round === 0) return null;

  return (
    <View style={visible ? s.overlay : s.hidden} pointerEvents={visible ? 'auto' : 'none'}>
      <View style={visible ? s.card : undefined}>
        {visible ? <Text style={s.h}>{t('captcha.checking')}</Text> : null}
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
  hidden: { position: 'absolute', left: -1000, top: 0, width: 320, height: 90, opacity: 0 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 10, alignItems: 'center' },
  h: { fontSize: 15, fontWeight: '800', color: C.ink },
});
