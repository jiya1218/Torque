import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';

export default function FitnessScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/workflow/fitness');
      const arr = Array.isArray(data) ? data : (data as any).items || [];
      setItems(arr);
      setTotal(arr.length);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.text} /></Pressable>
        <Text style={styles.title}>Fitness Work</Text>
        <Text style={styles.count}>{total}</Text>
      </View>
      <FlatList data={items} keyExtractor={i => i.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="fitness-outline" size={48} color={Colors.textLight} /><Text style={styles.emptyText}>No fitness work</Text></View>}
        renderItem={({ item }) => {
          const sc = StatusColors[item.status] || StatusColors.scheduled;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}><Text style={styles.cardName}>{item.customerName || item.customer_name}</Text><Text style={styles.cardMeta}>{item.vehicleNumber || item.vehicle_number} · {item.vehicleType || item.vehicle_type}</Text></View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}><Text style={[styles.badgeText, { color: sc.text }]}>{item.status?.replace(/_/g, ' ')}</Text></View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.cardDate}>{item.centerName || item.center_name}</Text>
                <Text style={styles.cardDate}>Test: {item.testDate || item.test_date}</Text>
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md },
  cardDate: { fontSize: FontSize.sm, color: Colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
});
