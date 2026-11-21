import { useT } from '../lib/i18n';
import type { ReasonCount } from '../lib/reasons';
import { requestUrl } from '../lib/share';
import type { FeedItem } from '../lib/types';
import { ResultCard } from './ResultCard';
import { ShareCardModal } from './ShareCardModal';

/** The poster's closed arzi: the result card (Status / Story size), shared or downloaded. */
export function ShareResult({ r, reasons, onClose }: { r: FeedItem; reasons: ReasonCount[]; onClose: () => void }) {
  const { t, lang } = useT();
  return (
    <ShareCardModal
      title={t('rc.title')}
      card={(ref) => <ResultCard cardRef={ref} r={r} reasons={reasons} />}
      file="ruko-zara-result.png"
      text={t('rc.text', { item: r.item, link: requestUrl(r.id, 'card', lang) })}
      onClose={onClose}
      testID="share-result"
    />
  );
}
