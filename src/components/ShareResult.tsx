import { useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useT } from '../lib/i18n';
import type { ReasonCount } from '../lib/reasons';
import { requestUrl } from '../lib/share';
import { shareView } from '../lib/shareImage';
import { M, R, T } from '../lib/theme';
import type { FeedItem } from '../lib/types';
import { Share2 } from './Icon';
import { Button } from './ui';
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
          <Button label={busy ? '…' : t('rc.share')} icon={Share2} size="lg" onPress={share} disabled={busy} style={s.share} testID="share-result-go" />
          <Button label={t('rc.close')} variant="text" colors={{ bg: 'transparent', fg: '#FFFFFF' }} onPress={onClose} style={{ alignSelf: 'center' }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(24,17,14,0.82)' },
  sheet: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16, gap: 12, flexGrow: 1, justifyContent: 'center' },
  title: { ...T.titleLarge, color: '#FFFFFF' },
  frame: { borderRadius: R.xl, overflow: 'hidden' },
  note: { ...T.body, color: '#FFFFFF', textAlign: 'center', maxWidth: 315 },
  share: { width: 315, alignSelf: 'center' },
});
