import { Globe, IconText } from './Icon';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LANGS, useT } from '../lib/i18n';
import { C } from '../lib/theme';

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
        <IconText icon={Globe} size={14} color={C.ink} style={s.pillT}>{current.short}</IconText>
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
                style={[s.option, l.id === lang && s.optionOn]}
              >
                <Text style={[s.optionT, l.id === lang && { color: '#fff' }]}>{l.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  pill: { marginRight: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff' },
  pillT: { fontSize: 13, fontWeight: '700', color: C.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 32 },
  sheet: { backgroundColor: C.bg, borderRadius: 18, padding: 18, gap: 10 },
  title: { fontSize: 16, fontWeight: '800', color: C.ink, textAlign: 'center', marginBottom: 4 },
  option: { borderWidth: 1.5, borderColor: C.brand, borderRadius: 12, paddingVertical: 13, alignItems: 'center', backgroundColor: '#fff' },
  optionOn: { backgroundColor: C.brand },
  optionT: { fontSize: 17, fontWeight: '800', color: C.brand },
});
