import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'action';
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

const ICONS: Record<string, any> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'warning',
  info: 'information-circle',
  action: 'flash',
  default: 'notifications'
};

const COLORS: Record<string, string> = {
  success: Colors.success,
  error: Colors.error,
  warning: Colors.warning,
  info: Colors.info,
  action: Colors.primary,
  default: Colors.textMuted
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any>('/notifications?limit=50');
      setItems(data.notifications || []);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all', {});
      load();
    } catch {}
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}`, {});
      load();
    } catch {}
  };

  const timeAgo = (dt: string) => {
    const diff = Date.now() - new Date(dt).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Alerts</Text>
        <Pressable onPress={markAllRead}>
          <Text style={styles.markAll}>Read All</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>No alerts yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable 
              style={[styles.card, !item.isRead && styles.unreadCard]}
              onPress={() => markRead(item.id)}
            >
              <View style={[styles.iconWrap, { backgroundColor: (COLORS[item.type] || COLORS.default) + '20' }]}>
                <Ionicons
                  name={ICONS[item.type] || ICONS.default}
                  size={20}
                  color={COLORS[item.type] || COLORS.default}
                />
              </View>
              <View style={styles.content}>
                <Text style={[styles.label, !item.isRead && { fontWeight: '900' }]}>{item.title}</Text>
                <Text style={styles.bodyText}>{item.body}</Text>
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.isRead && <View style={[styles.dot, { backgroundColor: Colors.primary }]} />}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border
  },
  backBtn: { width: 40 },
  title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text },
  markAll: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  emptyText: { marginTop: Spacing.md, color: Colors.textLight, fontSize: FontSize.sm },
  list: { padding: Spacing.lg },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  unreadCard: {
    backgroundColor: Colors.primary + '05',
    borderColor: Colors.primary + '20',
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: BorderRadius.lg,
    alignItems: 'center', justifyContent: 'center'
  },
  content: { flex: 1 },
  label: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  bodyText: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  time: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 }
});
