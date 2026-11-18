import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { inr } from '../lib/format';
import { useT, type Key } from '../lib/i18n';
import { nudgeState } from '../lib/nudge';
import { C } from '../lib/theme';
import { CircleCheck, CirclePlus, IconText } from './Icon';

interface Props {
  /** Money saved: your arzi marked "Didn't buy". 0 when not known yet (not signed in). */
  saved: number;
  posted: number;
  /** Your arzi whose voting has closed and that you haven't marked yet. */
  toDecide: number;
}

/**
 * Always at the top of the feed. Pause → Ask → Decide, with "Pause" already done (you opened the
 * app before buying) and one button for the next step. See src/lib/nudge.ts for the reasoning.
 */
export function SavingsNudge({ saved, posted, toDecide }: Props) {
  const { t } = useT();
  const state = nudgeState(saved, posted, toDecide);
  const step = state === 'start' ? 1 : 2; // index of the step in progress
  const line: Key = state === 'start' ? 'save.start' : state === 'waiting' ? 'save.waiting' : state === 'decide' ? 'save.decide' : 'save.ask';
  const decide = state === 'decide';

  return (
    <View style={s.box} testID="savings-nudge">
      <View style={s.top}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>{t('mine.saved')}</Text>
          <Text style={s.amt}>{inr(saved)}</Text>
        </View>
        <Pressable
          onPress={() => router.push(decide ? '/mine' : '/new')}
          style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          {decide ? (
            <Text style={s.btnT}>{t('save.mark')}</Text>
          ) : (
            <IconText icon={CirclePlus} size={16} color="#fff" style={s.btnT}>{t('save.post')}</IconText>
          )}
        </Pressable>
      </View>
      {state !== 'saved' ? (
        <View style={s.steps} accessibilityLabel={`${t('save.stepPause')}, ${t('save.stepAsk')}, ${t('save.stepDecide')}`}>
          {(['save.stepPause', 'save.stepAsk', 'save.stepDecide'] as Key[]).map((k, i) => {
            const done = i < step;
            const now = i === step;
            return (
              <View key={k} style={[s.step, done && s.stepDone, now && s.stepNow]}>
                {done ? <CircleCheck size={13} color={C.yesSoft} /> : <Text style={[s.stepN, now && { color: '#fff' }]}>{i + 1}</Text>}
                <Text style={[s.stepT, (done || now) && { color: '#fff' }]}>{t(k)}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
      <Text style={s.line}>{t(line)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: C.ink, borderRadius: 16, padding: 14, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { color: '#D6D3D1', fontSize: 12.5, fontWeight: '600' },
  amt: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 1 },
  btn: { backgroundColor: C.brand, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  btnT: { color: '#fff', fontWeight: '800', fontSize: 14 },
  steps: { flexDirection: 'row', gap: 6 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#2E2A27' },
  stepDone: { backgroundColor: '#1F3B2A' },
  stepNow: { backgroundColor: C.brand },
  stepN: { color: '#A8A29E', fontSize: 12, fontWeight: '800' },
  stepT: { color: '#A8A29E', fontSize: 12.5, fontWeight: '700' },
  line: { color: '#D6D3D1', fontSize: 13, lineHeight: 18 },
});
