import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import { useCacheStore } from '../../src/store/cacheStore';

export default function LoansScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<any[]>(cache['/finance/loans'] || []);
  const [total, setTotal] = useState(items.length);
  const [refreshing, setRefreshing] = useState(false);

  // Add Loan Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    loanType: 'car',
    amount: '',
    tenureMonths: '',
    interestRate: '',
    bankName: ''
  });

  useEffect(() => {
    loadCache().then(() => {
      if (cache['/finance/loans']) {
        setItems(cache['/finance/loans']);
        setTotal(cache['/finance/loans'].length);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/finance/loans');
      const arr = Array.isArray(data) ? data : (data as any).items || [];
      setItems(arr);
      setTotal(arr.length);
      setCache('/finance/loans', arr);
    } catch {}
  }, [setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleCreate = async () => {
    if (!form.customerName || !form.amount || !form.tenureMonths || !form.interestRate) {
      Alert.alert('Error', 'Customer Name, Amount, Tenure, and Interest Rate are required.');
      return;
    }
    const amt = parseFloat(form.amount);
    const tenure = parseInt(form.tenureMonths, 10);
    const rate = parseFloat(form.interestRate);

    if (isNaN(amt) || amt <= 0 || isNaN(tenure) || tenure <= 0 || isNaN(rate) || rate < 0) {
      Alert.alert('Error', 'Please enter valid numerical values for Amount, Tenure, and Interest Rate.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/finance/loans', {
        customerName: form.customerName,
        loanType: form.loanType,
        amount: amt,
        tenureMonths: tenure,
        interestRate: rate,
        bankName: form.bankName
      });
      setModalOpen(false);
      Alert.alert('Success', 'Loan entry added successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add loan entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Loans</Text>
        <Text style={styles.count}>{total}</Text>
        <Pressable style={styles.addBtn} onPress={() => {
          setForm({
            customerName: '',
            loanType: 'car',
            amount: '',
            tenureMonths: '',
            interestRate: '',
            bankName: ''
          });
          setModalOpen(true);
        }}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id || Math.random().toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cash-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No loans</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = StatusColors[item.status] || StatusColors.applied;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.customerName || item.customer_name}</Text>
                  <Text style={styles.cardMeta}>
                    {(item.loanType || item.loan_type)} loan · {item.bankName || item.bank_name || 'Generic Bank'}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.loanLabel}>Amount</Text>
                  <Text style={styles.loanValue}>₹{(item.amount || 0).toLocaleString()}</Text>
                </View>
                <View>
                  <Text style={styles.loanLabel}>EMI</Text>
                  <Text style={styles.loanValue}>₹{(item.emi || 0).toLocaleString()}</Text>
                </View>
                <View>
                  <Text style={styles.loanLabel}>Rate</Text>
                  <Text style={styles.loanValue}>{item.interestRate || item.interest_rate}%</Text>
                </View>
                <View>
                  <Text style={styles.loanLabel}>Tenure</Text>
                  <Text style={styles.loanValue}>{item.tenureMonths || item.tenure} mo</Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Add Loan Modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Loan</Text>
              <Pressable onPress={() => setModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>CUSTOMER NAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ramesh Patel"
                  value={form.customerName}
                  onChangeText={v => setForm({ ...form, customerName: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>LOAN TYPE</Text>
                <View style={styles.typeSelector}>
                  {['car', 'home', 'personal', 'business'].map(t => (
                    <Pressable
                      key={t}
                      style={[styles.typeOption, form.loanType === t && styles.typeOptionActive]}
                      onPress={() => setForm({ ...form, loanType: t })}
                    >
                      <Text style={[styles.typeOptionText, form.loanType === t && styles.typeOptionTextActive]}>
                        {t}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>LOAN AMOUNT (₹) *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 500000"
                  value={form.amount}
                  onChangeText={v => setForm({ ...form, amount: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>TENURE (MONTHS) *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 36"
                  value={form.tenureMonths}
                  onChangeText={v => setForm({ ...form, tenureMonths: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>INTEREST RATE (%) *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 9.5"
                  value={form.interestRate}
                  onChangeText={v => setForm({ ...form, interestRate: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>BANK NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. HDFC Bank"
                  value={form.bankName}
                  onChangeText={v => setForm({ ...form, bankName: v })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleCreate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Application</Text>}
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
  count: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary, backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.md, paddingVertical: 2, borderRadius: BorderRadius.sm },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.lg },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2, textTransform: 'capitalize' },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  loanLabel: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '700', textTransform: 'uppercase' },
  loanValue: { fontSize: FontSize.md, fontWeight: '900', color: Colors.text, marginTop: 2 },
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
  typeOptionActive: { backgroundColor: Colors.primaryLight },
  typeOptionText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textLight, textTransform: 'capitalize' },
  typeOptionTextActive: { color: Colors.primary, fontWeight: '800' },
  submitBtn: { backgroundColor: Colors.primary, height: 48, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.xl },
  submitBtnText: { color: Colors.white, fontWeight: '800', fontSize: FontSize.md }
});

