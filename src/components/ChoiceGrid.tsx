import { Pressable, StyleSheet, Text, View } from 'react-native';
import { M, R, T } from '../lib/theme';
import { Check } from './Icon';

/**
 * Big filled buttons in two columns, the same shape as the vote reasons: for "tap to choose" moments
 * (categories). Warm neutral, orange tint when picked; never green/red, which mean Buy it / Skip it.
 */
export function ChoiceGrid({
  options,
  selected = [],
  onPick,
  testPrefix,
}: {
  options: { id: string; label: string }[];
  selected?: string[];
  onPick: (id: string) => void;
  testPrefix: string;
}) {
  return (
    <View style={s.grid}>
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <View key={o.id} style={s.cell}>
            <Pressable
              onPress={() => onPick(o.id)}
              testID={`${testPrefix}${o.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [
                s.btn,
                { backgroundColor: on ? M.primaryContainer : pressed ? M.surfaceContainerHighest : M.surfaceContainerHigh },
                on && { borderColor: M.primary },
              ]}
            >
              {on ? <Check size={16} color={M.onPrimaryContainer} /> : null}
              <Text style={[s.label, { color: on ? M.onPrimaryContainer : M.onSurface }]}>{o.label}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -4 },
  cell: { width: '50%', padding: 4 },
  btn: {
    flex: 1, minHeight: 48, borderRadius: R.md, borderWidth: 1.5, borderColor: 'transparent',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8,
  },
  label: { ...T.labelLarge, fontWeight: '700', textAlign: 'center' },
});
