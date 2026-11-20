import { Pressable, StyleSheet, Text, View } from 'react-native';
import { M, R, T } from '../lib/theme';
import { Check } from './Icon';

/**
 * Big filled buttons in two columns, the same shape as the vote reasons: for "tap to choose" moments
 * (categories). White tiles with a hairline border; picked = light orange, orange border, tick.
 * Never green/red, which mean Buy it / Skip it.
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
                on
                  ? { backgroundColor: M.primaryContainer, borderColor: M.primary }
                  : { backgroundColor: pressed ? M.surfaceContainerLow : M.surfaceContainerLowest, borderColor: M.outlineVariant },
              ]}
            >
              {on ? <Check size={16} color={M.primary} strokeWidth={3} /> : null}
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
    flex: 1, minHeight: 48, borderRadius: R.md, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8,
  },
  label: { ...T.labelLarge, fontWeight: '600', textAlign: 'center' },
});
