import { Image, StyleSheet, Text, View } from 'react-native';
import type { LinkPreview } from '../lib/types';
import { M, R, T } from '../lib/theme';
import { IconText, Link2 } from './Icon';

/** Under the shop link on the New form: the product's photo and name, as the shop shows them. */
export function LinkPreviewCard({ p }: { p: LinkPreview }) {
  return (
    <View style={s.card} testID="link-preview">
      {p.image ? <Image source={{ uri: p.image }} style={s.img} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        {p.title ? (
          <Text style={s.title} numberOfLines={2}>
            {p.title}
          </Text>
        ) : null}
        <IconText icon={Link2} size={13} color={M.onSurfaceVariant} style={s.site}>
          {p.site}
        </IconText>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, marginTop: 8,
    borderRadius: R.md, borderWidth: 1, borderColor: M.outlineVariant, backgroundColor: M.surfaceContainerLowest,
  },
  img: { width: 64, height: 64, borderRadius: R.sm, backgroundColor: '#FFFFFF' },
  title: { ...T.titleSmall, color: M.onSurface },
  site: { ...T.bodySmall, color: M.onSurfaceVariant },
});
