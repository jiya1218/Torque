import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCacheStore } from '../../src/store/cacheStore';
import Sidebar from '../../src/components/Sidebar';

export default function LoansScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();

  const [items, setItems] = useState<any[]>(cache['/finance/loans']?.items || []);
  const [total, setTotal] = useState(cache['/finance/loans']?.items?.length || 0);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Add Loan Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newLoan, setNewLoan] = useState({
    customerName: '',
    loanType: '',
    amount: '',
    tenureMonths: '',
    interestRate: '',
    bankName: '',
    leadId: ''
  });

  // Load cache on mount
  useEffect(() => {
    loadCache().then(() => {
      const cached = cache['/finance/loans'];
      if (cached && cached.items) {
        setItems(cached.items);
        setTotal(cached.items.length);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/finance/loans');
      const arr = Array.isArray(data) ? data : (data as any).items || [];
      setItems(arr);
      setTotal(arr.length);
      setCache('/finance/loans', { items: arr });
    } catch (e) {
      console.error('[LoansScreen] Failed to load loans', e);
    }
  }, [setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAddLoan = async () => {
    if (!newLoan.customerName.trim() || !newLoan.amount) {
      Alert.alert('Error', 'Customer Name and Amount are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/finance/loans', {
        customerName: newLoan.customerName.trim(),
        loanType: newLoan.loanType.trim() || null,
        amount: parseFloat(newLoan.amount),
        tenureMonths: newLoan.tenureMonths ? parseInt(newLoan.tenureMonths) : null,
        interestRate: newLoan.interestRate ? parseFloat(newLoan.interestRate) : null,
        bankName: newLoan.bankName.trim() || null,
        leadId: newLoan.leadId || null
      });
      setAddModalVisible(false);
      setNewLoan({ customerName: '', loanType: '', amount: '', tenureMonths: '', interestRate: '', bankName: '', leadId: '' });
      Alert.alert('Success', 'Loan application submitted successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit loan application');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Sidebar Component */}
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Loans</Text>
        <View style={styles.headerRight}>
          <View style={styles.countBadge}><Text style={styles.countText}>{total}</Text></View>
          <Pressable style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
            <Ionicons name="add" size={22} color={Colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* List */}
      <FlatList 
        data={items} 
        keyExtractor={i => i.id} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cash-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No loans</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = StatusColors[item.status] || StatusColors.applied || StatusColors.pending;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.customerName || item.customer_name}</Text>
                  <Text style={styles.cardMeta}>{item.loanType || item.loan_type || 'N/A'} loan · {item.bankName || item.bank_name || 'N/A'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}><Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text></View>
              </View>
              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.loanLabel}>Amount</Text>
                  <Text style={styles.loanValue}>₹{(item.amount || 0).toLocaleString()}</Text>
                </View>
                <View>
                  <Text style={styles.loanLabel}>Rate</Text>
                  <Text style={styles.loanValue}>{item.interestRate || item.interest_rate || 0}%</Text>
                </View>
                <View>
                  <Text style={styles.loanLabel}>Tenure</Text>
                  <Text style={styles.loanValue}>{item.tenureMonths || item.tenure || 0} mo</Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* ── Add Loan Modal ── */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNewLoan({ customerName: '', loanType: '', amount: '', tenureMonths: '', interestRate: '', bankName: '', leadId: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Loan</Text>
              <Pressable onPress={() => setAddModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>CUSTOMER NAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. MEHRA KARAN"
                  placeholderTextColor={Colors.textLight}
                  value={newLoan.customerName}
                  onChangeText={(val) => setNewLoan({ ...newLoan, customerName: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>LOAN TYPE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Auto, Home, Personal"
                  placeholderTextColor={Colors.textLight}
                  value={newLoan.loanType}
                  onChangeText={(val) => setNewLoan({ ...newLoan, loanType: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>AMOUNT *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={newLoan.amount}
                  onChangeText={(val) => setNewLoan({ ...newLoan, amount: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>TENURE (MONTHS)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 36"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="number-pad"
                  value={newLoan.tenureMonths}
                  onChangeText={(val) => setNewLoan({ ...newLoan, tenureMonths: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>INTEREST RATE (%)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 8.5"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={newLoan.interestRate}
                  onChangeText={(val) => setNewLoan({ ...newLoan, interestRate: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>BANK NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. HDFC Bank"
                  placeholderTextColor={Colors.textLight}
                  value={newLoan.bankName}
                  onChangeText={(val) => setNewLoan({ ...newLoan, bankName: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>LINK TO LEAD (OPTIONAL ID)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Paste Lead UUID if any"
                  placeholderTextColor={Colors.textLight}
                  value={newLoan.leadId}
                  onChangeText={(val) => setNewLoan({ ...newLoan, leadId: val })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleAddLoan} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Application</Text>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  countBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.md, minWidth: 32, alignItems: 'center' },
  countText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: FontSize.lg - 2, fontWeight: '800', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  loanLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '500' },
  loanValue: { fontSize: FontSize.md, fontWeight: '900', color: Colors.text, marginTop: 2 },
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
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, height: 50, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  submitBtn: { backgroundColor: Colors.primary, height: 52, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl },
  submitBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
});
