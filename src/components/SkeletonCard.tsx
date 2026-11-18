import { StyleSheet, View } from 'react-native';
import { C } from '../lib/theme';

/** Grey placeholder in the shape of an arzi card, shown while the first list loads. */
export function SkeletonCard() {
  return (
    <View style={s.card} accessibilityLabel="loading">
      <View style={s.row}>
        <View style={[s.bar, { width: '55%', height: 18 }]} />
        <View style={[s.bar, { width: '22%', height: 18 }]} />
      </View>
      <View style={[s.bar, { width: '40%' }]} />
      <View style={[s.bar, { width: '90%', marginTop: 6 }]} />
      <View style={[s.bar, { width: '70%' }]} />
      <View style={s.row}>
        <View style={[s.btn]} />
        <View style={[s.btn]} />
      </View>
    </View>
  );
}

export function SkeletonList({ n = 3 }: { n?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: n }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 16, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  bar: { height: 12, borderRadius: 6, backgroundColor: C.line },
  btn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: C.line, marginTop: 8 },
});
