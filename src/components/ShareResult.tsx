import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useT } from '../lib/i18n';
import type { ReasonCount } from '../lib/reasons';
import { requestUrl } from '../lib/share';
import { shareView } from '../lib/shareImage';
import { C } from '../lib/theme';
import type { FeedItem } from '../lib/types';
import { IconText, Share2 } from './Icon';
import { ResultCard } from './ResultCard';

/** A preview of the result card, with Share (share sheet, or a download where sharing files isn't possible). */
export function ShareResult({ r, reasons, onClose }: { r: FeedItem; reasons: ReasonCount[]; onClose: () => void }) {
  const { t } = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const share = async () => {
    setBusy(true);
    setNote(null);
    try {
      const done = await shareView(ref, { title: t('rc.title'), text: t('rc.text', { item: r.item, link: requestUrl(r.id) }) });
      if (done === 'downloaded') setNote(t('rc.downloaded'));
    } catch {
      setNote(t('rc.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <ScrollView contentContainerStyle={s.sheet}>
          <Text style={s.title}>{t('rc.title')}</Text>
          <View style={s.frame}>
            <ResultCard cardRef={ref} r={r} reasons={reasons} />
          </View>
          {note ? <Text style={s.note}>{note}</Text> : null}
          <Pressable onPress={share} disabled={busy} style={({ pressed }) => [s.share, (pressed || busy) && { opacity: 0.8 }]} accessibilityRole="button" testID="share-result-go">
            <IconText icon={Share2} color="#fff" size={17} style={s.shareT}>{busy ? '…' : t('rc.share')}</IconText>
          </Pressable>
          <Pressable onPress={onClose} style={s.close} accessibilityRole="button">
            <Text style={s.closeT}>{t('rc.close')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,25,23,0.72)' },
  sheet: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16, gap: 12, flexGrow: 1, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 17, fontWeight: '800' },
  frame: { borderRadius: 18, overflow: 'hidden' },
  note: { color: '#fff', fontSize: 13.5, textAlign: 'center', maxWidth: 315 },
  share: { backgroundColor: C.brand, borderRadius: 12, paddingVertical: 12, width: 315, alignItems: 'center' },
  shareT: { color: '#fff', fontWeight: '800', fontSize: 16 },
  close: { paddingVertical: 8, paddingHorizontal: 16 },
  closeT: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
