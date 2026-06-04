import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCacheStore } from '../../src/store/cacheStore';
import Sidebar from '../../src/components/Sidebar';

export default function FinanceScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();

  const [items, setItems] = useState<any[]>(cache['/finance/transactions']?.items || []);
  const [summary, setSummary] = useState<any>(cache['/finance/transactions']?.summary || {});
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Add Transaction Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTx, setNewTx] = useState({
    type: 'income',
    category: 'premium',
    amount: '',
    payment_method: 'bank',
    reference_number: '',
    description: '',
    date: ''
  });

  // Load cache on mount
  useEffect(() => {
    loadCache().then(() => {
      const cached = cache['/finance/transactions'];
      if (cached) {
        if (cached.items) setItems(cached.items);
        if (cached.summary) setSummary(cached.summary);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any>('/finance/transactions');
      const arr = Array.isArray(data) ? data : data?.items || [];
      const sum = data?.summary || {};
      setItems(arr);
      setSummary(sum);
      setCache('/finance/transactions', { items: arr, summary: sum });
    } catch (e) {
      console.error('[FinanceScreen] Failed to load transactions', e);
    }
  }, [setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAddTransaction = async () => {
    if (!newTx.amount || !newTx.category.trim() || !newTx.description.trim()) {
      Alert.alert('Error', 'Amount, Category, and Description are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/finance/transactions', {
        type: newTx.type,
        category: newTx.category.trim(),
        amount: parseFloat(newTx.amount),
        payment_method: newTx.payment_method,
        reference_number: newTx.reference_number.trim() || null,
        description: newTx.description.trim(),
        date: newTx.date ? new Date(newTx.date).toISOString() : new Date().toISOString()
      });
      setAddModalVisible(false);
      setNewTx({
        type: 'income',
        category: 'premium',
        amount: '',
        payment_method: 'bank',
        reference_number: '',
        description: '',
        date: ''
      });
      Alert.alert('Success', 'Transaction recorded successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add transaction');
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Sidebar Component */}
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Finance</Text>
        <Pressable style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Summary Row */}
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

      {/* Filters */}
      <View style={styles.filterRow}>
        {['all', 'income', 'expense'].map(s => (
          <Pressable key={s} style={[styles.chip, filter === s && styles.chipActive]} onPress={() => setFilter(s)}>
            <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>{s === 'all' ? 'All' : s}</Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      <FlatList 
        data={filteredItems} 
        keyExtractor={i => i.id} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No transactions</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isIncome = item.type === 'income';
          return (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={[styles.typeIcon, { backgroundColor: isIncome ? Colors.success + '15' : Colors.error + '15' }]}>
                  <Ionicons name={isIncome ? 'arrow-down' : 'arrow-up'} size={18} color={isIncome ? Colors.success : Colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardDesc}>{item.description}</Text>
                  <Text style={styles.cardMeta}>{item.category} · {item.paymentMethod || item.payment_method} · {item.referenceNumber || item.reference_number || 'N/A'}</Text>
                </View>
              </View>
              <Text style={[styles.cardAmount, { color: isIncome ? Colors.success : Colors.error }]}>
                {isIncome ? '+' : '-'}₹{(item.amount || 0).toLocaleString()}
              </Text>
            </View>
          );
        }}
      />

      {/* ── Add Transaction Modal ── */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Transaction</Text>
              <Pressable onPress={() => setAddModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Type Switcher */}
              <View style={styles.field}>
                <Text style={styles.label}>TRANSACTION TYPE *</Text>
                <View style={styles.typeSelector}>
                  <Pressable 
                    style={[styles.typeOption, newTx.type === 'income' && styles.typeOptionIncomeActive]}
                    onPress={() => setNewTx({ ...newTx, type: 'income', category: 'premium' })}
                  >
                    <Text style={[styles.typeOptionText, newTx.type === 'income' && styles.typeOptionTextActive]}>INCOME</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.typeOption, newTx.type === 'expense' && styles.typeOptionExpenseActive]}
                    onPress={() => setNewTx({ ...newTx, type: 'expense', category: 'office' })}
                  >
                    <Text style={[styles.typeOptionText, newTx.type === 'expense' && styles.typeOptionTextActive]}>EXPENSE</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>AMOUNT *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={newTx.amount}
                  onChangeText={(val) => setNewTx({ ...newTx, amount: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>CATEGORY *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. premium, commission, salary, office"
                  placeholderTextColor={Colors.textLight}
                  value={newTx.category}
                  onChangeText={(val) => setNewTx({ ...newTx, category: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PAYMENT METHOD</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. cash, bank, upi"
                  placeholderTextColor={Colors.textLight}
                  value={newTx.payment_method}
                  onChangeText={(val) => setNewTx({ ...newTx, payment_method: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>REFERENCE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. TXN123456789"
                  placeholderTextColor={Colors.textLight}
                  value={newTx.reference_number}
                  onChangeText={(val) => setNewTx({ ...newTx, reference_number: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>DESCRIPTION *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Payment for..."
                  placeholderTextColor={Colors.textLight}
                  value={newTx.description}
                  onChangeText={(val) => setNewTx({ ...newTx, description: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>DATE (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2026-06-04"
                  placeholderTextColor={Colors.textLight}
                  value={newTx.date}
                  onChangeText={(val) => setNewTx({ ...newTx, date: val })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleAddTransaction} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Add Entry</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md, backgroundColor: '#FFFFFF' },
  menuBtn: { padding: Spacing.xs },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  summaryRow: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm },
  summaryCard: { flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, borderRadius: BorderRadius.sm, padding: Spacing.lg },
  summaryLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5 },
  summaryValue: { fontSize: FontSize.xxl, fontWeight: '900', marginTop: 4 },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted, textTransform: 'capitalize' },
  chipTextActive: { color: Colors.white },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.md },
  typeIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  cardDesc: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  cardAmount: { fontSize: FontSize.lg, fontWeight: '900' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '80%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  closeBtn: { padding: Spacing.xs },
  modalBody: { flex: 1, marginTop: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: Spacing.xs },
  typeSelector: { flexDirection: 'row', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, overflow: 'hidden' },
  typeOption: { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface },
  typeOptionIncomeActive: { backgroundColor: Colors.success },
  typeOptionExpenseActive: { backgroundColor: Colors.error },
  typeOptionText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textMuted },
  typeOptionTextActive: { color: Colors.white },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, height: 50, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  submitBtn: { backgroundColor: Colors.primary, height: 52, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl },
  submitBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
});

