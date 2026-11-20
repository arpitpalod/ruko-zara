import { Globe, IconText } from './Icon';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LANGS, useT } from '../lib/i18n';
import { E, M, R, T } from '../lib/theme';

/** Header button: shows the current language and lets the user switch from any screen. */
export function LanguageButton() {
  const { lang, setLang } = useT();
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.id === lang) ?? LANGS[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={s.pill}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Change language / भाषा बदलें"
      >
        <IconText icon={Globe} size={16} color={M.onSurfaceVariant} style={s.pillT}>{current.short}</IconText>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <View style={s.sheet}>
            <Text style={s.title}>Language · भाषा</Text>
            {LANGS.map((l) => (
              <Pressable
                key={l.id}
                onPress={() => {
                  setLang(l.id);
                  setOpen(false);
                }}
                style={({ pressed }) => [s.option, pressed && { backgroundColor: M.surfaceContainerHighest }]}
                accessibilityRole="radio"
                accessibilityState={{ checked: l.id === lang }}
              >
                <View style={[s.radio, l.id === lang && s.radioOn]}>{l.id === lang ? <View style={s.dot} /> : null}</View>
                <Text style={s.optionT}>{l.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  // Material assist chip
  pill: { marginRight: 12, paddingHorizontal: 10, minHeight: 32, justifyContent: 'center', borderRadius: R.sm, borderWidth: 1, borderColor: M.outlineVariant },
  pillT: { ...T.labelLarge, color: M.onSurfaceVariant },
  // Material dialog with a radio list
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.32)', justifyContent: 'center', padding: 32 },
  sheet: { backgroundColor: M.surfaceContainerHigh, borderRadius: R.xl, paddingVertical: 20, paddingHorizontal: 12, gap: 2, ...E[3] },
  title: { ...T.headline, color: M.onSurface, paddingHorizontal: 12, marginBottom: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 52, paddingHorizontal: 12, borderRadius: R.full },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: M.onSurfaceVariant, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: M.primary },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: M.primary },
  optionT: { ...T.bodyLarge, color: M.onSurface },
});
