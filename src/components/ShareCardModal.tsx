import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useT } from '../lib/i18n';
import { copyText, prepareImage, shareImage } from '../lib/shareImage';
import { R, T } from '../lib/theme';
import { Share2 } from './Icon';
import { Button } from './ui';

/**
 * A preview of a Story-shaped card with one Share button. The image is made as soon as the preview
 * opens, so Share opens the phone's share sheet at once. `copy` (a link) is copied on Share, for
 * Instagram's Link sticker; `hint` explains that.
 */
export function ShareCardModal(p: {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  card: (ref: Ref<any>) => ReactNode;
  file: string;
  text: string;
  copy?: string;
  hint?: string;
  copiedNote?: string;
  onClose: () => void;
  testID?: string;
}) {
  const { t } = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  const ready = useRef<Promise<unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    // Make the image after the card has drawn (fonts in), so Share doesn't wait.
    const timer = setTimeout(() => {
      ready.current = prepareImage(ref, p.file).catch(() => null);
    }, 400);
    return () => clearTimeout(timer);
  }, [p.file]);

  const share = async () => {
    setBusy(true);
    setNote(null);
    const copied = p.copy ? copyText(p.copy) : Promise.resolve(false); // same tap: allowed everywhere
    try {
      const img = (ready.current && (await ready.current)) || (await prepareImage(ref, p.file));
      const done = await shareImage(img, { title: p.title, text: p.text });
      const notes = [done === 'downloaded' ? t('rc.downloaded') : null, (await copied) ? p.copiedNote ?? null : null];
      setNote(notes.filter(Boolean).join(' ') || null);
    } catch {
      setNote(t('rc.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={p.onClose}>
      <View style={s.backdrop}>
        <ScrollView contentContainerStyle={s.sheet}>
          <Text style={s.title}>{p.title}</Text>
          <View style={s.frame}>{p.card(ref)}</View>
          {p.hint && !note ? <Text style={s.hint}>{p.hint}</Text> : null}
          {note ? <Text style={s.note} testID={p.testID ? `${p.testID}-note` : undefined}>{note}</Text> : null}
          <Button label={busy ? '…' : t('rc.share')} icon={Share2} size="lg" onPress={share} disabled={busy} style={s.share} testID={p.testID ? `${p.testID}-go` : undefined} />
          <Button label={t('rc.close')} variant="text" colors={{ bg: 'transparent', fg: '#FFFFFF' }} onPress={p.onClose} style={{ alignSelf: 'center' }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(24,17,14,0.82)' },
  sheet: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16, gap: 12, flexGrow: 1, justifyContent: 'center' },
  title: { ...T.titleLarge, color: '#FFFFFF', textAlign: 'center' },
  frame: { borderRadius: R.xl, overflow: 'hidden' },
  hint: { ...T.bodySmall, color: '#FFE3D2', textAlign: 'center', maxWidth: 315 },
  note: { ...T.body, color: '#FFFFFF', textAlign: 'center', maxWidth: 315 },
  share: { width: 315, alignSelf: 'center' },
});
