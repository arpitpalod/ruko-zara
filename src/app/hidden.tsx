import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { RequestCard } from '../components/RequestCard';
import { adminHiddenArzi } from '../lib/adminHidden';
import { friendly } from '../lib/errors';
import { useT } from '../lib/i18n';
import { useUser } from '../lib/session';
import { M, T } from '../lib/theme';
import type { FeedItem } from '../lib/types';

/** Admins only: hidden arzi and banned people's arzi, out of the feed but one tap away to review or undo. */
export default function Hidden() {
  const user = useUser();
  const { t } = useT();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [banned, setBanned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user.isAdmin) return setLoading(false);
    try {
      setErr(null);
      const r = await adminHiddenArzi();
      setItems(r.items);
      setBanned(r.banned);
    } catch (e: any) {
      setErr(friendly(e, t));
    } finally {
      setLoading(false);
    }
  }, [user.isAdmin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!user.isAdmin) return null;
  return (
    <FlatList
      data={items}
      keyExtractor={(x) => x.id}
      contentContainerStyle={s.list}
      refreshing={loading}
      onRefresh={load}
      ListHeaderComponent={
        <View style={{ gap: 6, marginBottom: 4 }}>
          <Text style={s.note}>{t('admin.hiddenNote')}</Text>
          {err ? <Text style={s.note}>{err}</Text> : null}
        </View>
      }
      ListEmptyComponent={loading ? undefined : <Text style={s.note}>{t('admin.hiddenEmpty')}</Text>}
      renderItem={({ item }) => (
        <View style={{ marginBottom: 14 }}>
          <RequestCard r={item} meId={user.id} onPress={() => router.push(`/request/${item.id}`)} authorBanned={banned.has(item.user_id)} />
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  list: { padding: 16 },
  note: { ...T.bodySmall, fontSize: 14, lineHeight: 20, color: M.onSurfaceVariant },
});
