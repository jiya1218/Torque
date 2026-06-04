import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import { useCacheStore } from '../../src/store/cacheStore';

export default function FinanceScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<any[]>(cache['/finance/transactions']?.items || []);
  const [summary, setSummary] = useState<any>(cache['/finance/transactions']?.summary || {});
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Add Transaction Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'income',
    category: '',
    amount: '',
    payment_method: 'UPI',
    reference_number: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadCache().then(() => {
      const cached = cache['/finance/transactions'];
      if (cached) {
        setItems(cached.items || []);
        setSummary(cached.summary || {});
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any>('/finance/transactions');
      const arr = Array.isArray(data) ? data : data.items || [];
      const summ = data.summary || {};
      
      const payload = { items: arr, summary: summ };
      setItems(arr);
      setSummary(summ);
      setCache('/finance/transactions', payload);
    } catch {}
  }, [setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleCreate = async () => {
    if (!form.category || !form.amount) {
      Alert.alert('Error', 'Category and Amount are required.');
      return;
    }
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/finance/transactions', {
        type: form.type,
        category: form.category,
        amount: amt,
        payment_method: form.payment_method,
        reference_number: form.reference_number,
        description: form.description,
        date: form.date
      });
      setModalOpen(false);
      Alert.alert('Success', 'Transaction added successfully!');
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
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Finance</Text>
        <Pressable style={styles.addBtn} onPress={() => {
          setForm({
            type: 'income',
            category: '',
            amount: '',
            payment_method: 'UPI',
            reference_number: '',
            description: '',
            date: new Date().toISOString().split('T')[0]
          });
          setModalOpen(true);
        }}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </Pressable>
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

      <FlatList
        data={filteredItems}
        keyExtractor={i => i.id || Math.random().toString()}
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
                <View style={[styles.typeIcon, { backgroundColor: isIncome ? Colors.successBg : Colors.errorBg }]}>
                  <Ionicons name={isIncome ? 'arrow-down' : 'arrow-up'} size={18} color={isIncome ? Colors.success : Colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardDesc}>{item.description || item.category}</Text>
                  <Text style={styles.cardMeta}>{item.category} · {item.paymentMethod || item.payment_method || 'UPI'} {item.referenceNumber ? `(${item.referenceNumber})` : ''}</Text>
                </View>
              </View>
              <Text style={[styles.cardAmount, { color: isIncome ? Colors.success : Colors.error }]}>
                {isIncome ? '+' : '-'}₹{(item.amount || 0).toLocaleString()}
              </Text>
            </View>
          );
        }}
      />

      {/* Add Transaction Modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Transaction</Text>
              <Pressable onPress={() => setModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Type Switcher */}
              <View style={styles.field}>
                <Text style={styles.label}>TRANSACTION TYPE</Text>
                <View style={styles.typeSelector}>
                  <Pressable
                    style={[styles.typeOption, form.type === 'income' && styles.typeOptionIncome]}
                    onPress={() => setForm({ ...form, type: 'income' })}
                  >
                    <Text style={[styles.typeOptionText, form.type === 'income' && styles.typeOptionTextActive]}>Income</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.typeOption, form.type === 'expense' && styles.typeOptionExpense]}
                    onPress={() => setForm({ ...form, type: 'expense' })}
                  >
                    <Text style={[styles.typeOptionText, form.type === 'expense' && styles.typeOptionTextActive]}>Expense</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>AMOUNT (₹) *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 5000"
                  value={form.amount}
                  onChangeText={v => setForm({ ...form, amount: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>CATEGORY *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Brokerage, Salary, Utilities"
                  value={form.category}
                  onChangeText={v => setForm({ ...form, category: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PAYMENT METHOD</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. UPI, Cash, Bank Transfer"
                  value={form.payment_method}
                  onChangeText={v => setForm({ ...form, payment_method: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>REFERENCE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Txn ID or Cheque No."
                  value={form.reference_number}
                  onChangeText={v => setForm({ ...form, reference_number: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>DESCRIPTION / NOTES</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: Spacing.sm }]}
                  multiline
                  placeholder="Optional description"
                  value={form.description}
                  onChangeText={v => setForm({ ...form, description: v })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleCreate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Entry</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
  menuBtn: { padding: Spacing.xs },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  summaryRow: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm },
  summaryCard: { flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, borderRadius: BorderRadius.md, padding: Spacing.lg },
  summaryLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: FontSize.xxl, fontWeight: '900', marginTop: 4 },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.xs },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase' },
  chipTextActive: { color: Colors.white },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.lg },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.md },
  typeIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  cardDesc: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  cardAmount: { fontSize: FontSize.lg, fontWeight: '900' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, fontWeight: '600' },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '80%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  closeBtn: { padding: Spacing.xs },
  modalBody: { flex: 1, marginTop: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight, letterSpacing: 1, marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, height: 48, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  typeSelector: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, padding: 4 },
  typeOption: { flex: 1, height: 38, justifyContent: 'center', alignItems: 'center', borderRadius: BorderRadius.sm },
  typeOptionIncome: { backgroundColor: Colors.successBg },
  typeOptionExpense: { backgroundColor: Colors.errorBg },
  typeOptionText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textLight },
  typeOptionTextActive: { color: Colors.text },
  submitBtn: { backgroundColor: Colors.primary, height: 48, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.xl },
  submitBtnText: { color: Colors.white, fontWeight: '800', fontSize: FontSize.md }
});

