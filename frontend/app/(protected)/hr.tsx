import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';

export default function HRScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const roleUpper = user?.role?.toUpperCase();
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN';

  const load = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await api.get<any[]>('/users/');
      const arr = Array.isArray(data) ? data : (data as any).items || [];
      setItems(arr);
      setTotal(arr.length);
    } catch {}
  }, [isAdmin]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable testID="back-btn" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.text} /></Pressable>
          <Text style={styles.title}>Access Denied</Text>
        </View>
        <View style={styles.empty}>
          <Ionicons name="lock-closed" size={48} color={Colors.error} />
          <Text style={styles.emptyText}>You do not have permission to view this screen.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.text} /></Pressable>
        <Text style={styles.title}>HR / Employees</Text>
        <Text style={styles.count}>{total}</Text>
      </View>
      <FlatList data={items} keyExtractor={i => i.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={48} color={Colors.textLight} /><Text style={styles.emptyText}>No employees</Text></View>}
        renderItem={({ item }) => {
          const sc = StatusColors[item.status] || StatusColors.active;
          return (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{(item.fullName || item.name || '?').charAt(0)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.fullName || item.name}</Text>
                  <Text style={styles.cardMeta}>{item.role?.name || item.role || 'No Role'} · {item.department || 'General'}</Text>
                  <Text style={styles.cardMeta}>{item.email} · {item.phone}</Text>
                </View>
                <View>
                  <View style={[styles.badge, { backgroundColor: sc.bg }]}><Text style={[styles.badgeText, { color: sc.text }]}>{item.status || 'Active'}</Text></View>
                  <Text style={styles.salary}>₹{(item.salary || 0).toLocaleString()}/mo</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  count: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary, backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.md, paddingVertical: 2, borderRadius: BorderRadius.sm },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.white },
  cardName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, alignSelf: 'flex-end' },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  salary: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginTop: Spacing.xs, textAlign: 'right' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
});
