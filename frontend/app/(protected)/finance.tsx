import React, { useState, useCallback } from 'react';
import { StatusBar, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar, View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { StatusBar, useRouter, useFocusEffect } from 'expo-router';
import { StatusBar, api } from '../../src/utils/api';
import { StatusBar, Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { StatusBar, Ionicons } from '@expo/vector-icons';

export default function FinanceScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/finance/transactions');
      const arr = Array.isArray(data) ? data : (data as any).items || [];
      setItems(arr);
      setSummary((data as any).summary || {});
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.text} /></Pressable>
        <Text style={styles.title}>Finance</Text>
      </View>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: Colors.success }]}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryValue, { color: Colors.success }]}>₹{(summary.income || 0).toLocaleString()}</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: Colors.error }]}>
          <Text style={styles.summaryLabel}>Expense</Text>
          <Text style={[styles.summaryValue, { color: Colors.error }]}>₹{(summary.expense || 0).toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.filterRow}>
        {['all', 'income', 'expense'].map(s => (
          <Pressable key={s} style={[styles.chip, filter === s && styles.chipActive]} onPress={() => setFilter(s)}>
            <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>{s === 'all' ? 'All' : s}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList data={items} keyExtractor={i => i.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="wallet-outline" size={48} color={Colors.textLight} /><Text style={styles.emptyText}>No transactions</Text></View>}
        renderItem={({ item }) => {
          const isIncome = item.type === 'income';
          return (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={[styles.typeIcon, { backgroundColor: isIncome ? Colors.successBg : Colors.errorBg }]}>
                  <Ionicons name={isIncome ? 'arrow-down' : 'arrow-up'} size={18} color={isIncome ? Colors.success : Colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardDesc}>{item.description}</Text>
                  <Text style={styles.cardMeta}>{item.category} · {item.reference}</Text>
                </View>
              </View>
              <Text style={[styles.cardAmount, { color: isIncome ? Colors.success : Colors.error }]}>{isIncome ? '+' : '-'}₹{(item.amount || 0).toLocaleString()}</Text>
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
  summaryRow: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm },
  summaryCard: { flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3, borderRadius: BorderRadius.sm, padding: Spacing.lg },
  summaryLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5 },
  summaryValue: { fontSize: FontSize.xxl, fontWeight: '900', marginTop: 4 },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted, textTransform: 'capitalize' },
  chipTextActive: { color: Colors.white },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.md },
  typeIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  cardDesc: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  cardAmount: { fontSize: FontSize.lg, fontWeight: '900' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
});
