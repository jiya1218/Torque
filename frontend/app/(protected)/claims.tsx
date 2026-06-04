import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import { useCacheStore } from '../../src/store/cacheStore';

export default function ClaimsScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<any[]>(cache['/claims'] || []);
  const [total, setTotal] = useState(items.length);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  // Add Claim Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    policyNumber: '',
    vehicleNumber: '',
    claimType: 'accidental',
    claimAmount: '',
    incidentDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadCache().then(() => {
      const cached = cache['/claims'];
      if (cached) {
        setItems(cached);
        setTotal(cached.length);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const data = await api.get<any[]>(`/claims${params}`);
      const arr = Array.isArray(data) ? data : (data as any).items || [];
      setItems(arr);
      setTotal(arr.length);
      
      // Cache the full claims list if filter is 'all'
      if (filter === 'all') {
        setCache('/claims', arr);
      }
    } catch {}
  }, [filter, setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleCreate = async () => {
    if (!form.customerName || !form.policyNumber || !form.claimAmount) {
      Alert.alert('Error', 'Customer Name, Policy Number, and Claim Amount are required.');
      return;
    }
    const amt = parseFloat(form.claimAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Please enter a valid claim amount.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/claims', {
        customerName: form.customerName,
        policyNumber: form.policyNumber,
        vehicleNumber: form.vehicleNumber,
        claimType: form.claimType,
        claimAmount: amt,
        incidentDate: form.incidentDate
      });
      setModalOpen(false);
      Alert.alert('Success', 'Claim added successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add claim');
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
        <Text style={styles.title}>Claims</Text>
        <Text style={styles.count}>{total}</Text>
        <Pressable style={styles.addBtn} onPress={() => {
          setForm({
            customerName: '',
            policyNumber: '',
            vehicleNumber: '',
            claimType: 'accidental',
            claimAmount: '',
            incidentDate: new Date().toISOString().split('T')[0]
          });
          setModalOpen(true);
        }}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={{ height: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {['all', 'filed', 'under_review', 'approved', 'rejected', 'settled'].map(s => (
            <Pressable key={s} style={[styles.chip, filter === s && styles.chipActive]} onPress={() => setFilter(s)}>
              <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>
                {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id || Math.random().toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="shield-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No claims</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = StatusColors[item.status] || StatusColors.filed;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.customerName || item.customer_name}</Text>
                  <Text style={styles.cardMeta}>
                    {item.policyNumber || item.policy_number} · {(item.claimType || item.claim_type)?.replace(/_/g, ' ')}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.badgeText, { color: sc.text }]}>{item.status?.replace(/_/g, ' ')}</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.amount}>₹{(item.claimAmount || item.claim_amount || 0).toLocaleString()}</Text>
                <Text style={styles.cardDate}>{item.vehicleNumber || item.vehicle_number || 'N/A'}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* Add Claim Modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Claim</Text>
              <Pressable onPress={() => setModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>CUSTOMER NAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Rohan Mehta"
                  value={form.customerName}
                  onChangeText={v => setForm({ ...form, customerName: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>POLICY NUMBER *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. POL-123456"
                  value={form.policyNumber}
                  onChangeText={v => setForm({ ...form, policyNumber: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>VEHICLE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. GJ-01-XX-9999"
                  autoCapitalize="characters"
                  value={form.vehicleNumber}
                  onChangeText={v => setForm({ ...form, vehicleNumber: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>CLAIM TYPE</Text>
                <View style={styles.typeSelector}>
                  {['accidental', 'theft', 'third_party'].map(t => (
                    <Pressable
                      key={t}
                      style={[styles.typeOption, form.claimType === t && styles.typeOptionActive]}
                      onPress={() => setForm({ ...form, claimType: t })}
                    >
                      <Text style={[styles.typeOptionText, form.claimType === t && styles.typeOptionTextActive]}>
                        {t.replace(/_/g, ' ')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>CLAIM AMOUNT (₹) *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 25000"
                  value={form.claimAmount}
                  onChangeText={v => setForm({ ...form, claimAmount: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>INCIDENT DATE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={form.incidentDate}
                  onChangeText={v => setForm({ ...form, incidentDate: v })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleCreate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Add Claim</Text>}
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
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, height: 34, justifyContent: 'center' },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase' },
  chipTextActive: { color: Colors.white },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.lg },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md, alignItems: 'center' },
  amount: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.text },
  cardDate: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600' },
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

