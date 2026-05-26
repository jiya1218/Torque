import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { quotationsService, Quotation } from '../../src/services/quotations';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';

export default function QuotationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Quotation[]>([]);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await quotationsService.list({ limit: 100 });
      setItems(data);
      setTotal(data.length);
    } catch (e) {
      console.error('[QuotationsScreen] Failed to load quotations', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.text} /></Pressable>
        <Text style={styles.title}>Quotations</Text>
        <Text style={styles.count}>{total}</Text>
      </View>
      <FlatList data={items} keyExtractor={i => i.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="document-text-outline" size={48} color={Colors.textLight} /><Text style={styles.emptyText}>No quotations</Text></View>}
        renderItem={({ item }) => {
          const sc = StatusColors[item.status] || StatusColors.draft;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                              <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>
                    {item.details?.customer_name ?? item.details?.client_name ?? 'Quotation'}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {item.details?.vehicle_type ?? ''}
                    {item.details?.vehicle_number ? ` · ${item.details.vehicle_number}` : ''}
                    {item.details?.insurance_type ? ` · ${item.details.insurance_type.replace(/_/g, ' ')}` : ''}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}><Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text></View>
              </View>
              <View style={styles.cardBottom}>
                <View><Text style={styles.lbl}>Amount</Text><Text style={styles.val}>₹{Number(item.amount || 0).toLocaleString()}</Text></View>
                <View><Text style={styles.lbl}>Status</Text><Text style={styles.val}>{item.status}</Text></View>
                <View><Text style={styles.lbl}>Lead ID</Text><Text style={styles.val}>{item.leadId || item.lead_id ? (item.leadId || item.lead_id).substring(0, 8) + '…' : '—'}</Text></View>
              </View>
            </View>
          );
        }}
      />
      <Pressable testID="new-quotation-fab" style={styles.fab} onPress={() => router.push('/quotation-new')}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </Pressable>
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
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  lbl: { fontSize: FontSize.xs, color: Colors.textMuted },
  val: { fontSize: FontSize.md, fontWeight: '900', color: Colors.text, marginTop: 2 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
});
