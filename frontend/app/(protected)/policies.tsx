import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, RefreshControl, Modal, ScrollView, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import { useCacheStore } from '../../src/store/cacheStore';

export default function PoliciesScreen() {
  const router = useRouter();
  const { cache, setCache } = useCacheStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<any[]>(cache['/policies'] || []);
  const [total, setTotal] = useState(items.length);
  const [refreshing, setRefreshing] = useState(false);

  // Modal & Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    lead_id: '',
    policy_number: '',
    provider: '',
    type: 'Comprehensive',
    premium_amount: '',
    status: 'Active',
    start_date: '',
    end_date: ''
  });

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/policies');
      const arr = Array.isArray(data) ? data : (data as any).items || [];
      setItems(arr);
      setTotal(arr.length);
      setCache('/policies', arr);
    } catch (e) {
      console.error('[PoliciesScreen] Failed to load policies', e);
    }
  }, [setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  
  const onRefresh = async () => { 
    setRefreshing(true); 
    await load(); 
    setRefreshing(false); 
  };

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await api.get<any>('/leads');
      setLeads(res.leads || []);
    } catch {
      Alert.alert('Error', 'Failed to fetch leads for selection');
    } finally {
      setLoadingLeads(false);
    }
  };

  const openAddModal = () => {
    setForm({
      lead_id: '',
      policy_number: '',
      provider: '',
      type: 'Comprehensive',
      premium_amount: '',
      status: 'Active',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setModalOpen(true);
    fetchLeads();
  };

  const handleCreate = async () => {
    if (!form.lead_id || !form.policy_number || !form.provider || !form.premium_amount) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/policies', {
        ...form,
        premium_amount: parseFloat(form.premium_amount)
      });
      setModalOpen(false);
      Alert.alert('Success', 'Policy created successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create policy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Policies</Text>
        <Text style={styles.count}>{total}</Text>
      </View>

      <FlatList 
        data={items} 
        keyExtractor={i => i.id} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="shield-checkmark-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No policies</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = StatusColors[(item.status || 'Active').toLowerCase()] || StatusColors.active;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.lead?.clientName || 'Quoted Customer'}</Text>
                  <Text style={styles.cardMeta}>{item.provider} · {item.type}</Text>
                  <Text style={styles.cardNo}>No: {item.policyNumber}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.lbl}>Premium</Text>
                  <Text style={styles.val}>₹{Number(item.premiumAmount || 0).toLocaleString()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.lbl}>Expiry Date</Text>
                  <Text style={styles.val}>{item.endDate ? new Date(item.endDate).toLocaleDateString() : 'N/A'}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* FAB */}
      <Pressable style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </Pressable>

      {/* Modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Policy</Text>
              <Pressable onPress={() => setModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>SELECT CLIENT / LEAD *</Text>
                {loadingLeads ? (
                  <ActivityIndicator color={Colors.primary} style={{ marginVertical: 10 }} />
                ) : (
                  <View style={styles.selectWrap}>
                    {leads.map((l) => (
                      <Pressable 
                        key={l.id} 
                        style={[styles.leadItem, form.lead_id === l.id && styles.leadItemActive]}
                        onPress={() => setForm({ ...form, lead_id: l.id })}
                      >
                        <Text style={[styles.leadItemText, form.lead_id === l.id && styles.leadItemTextActive]}>
                          {l.clientName} ({l.vehicleNo || 'No vehicle'})
                        </Text>
                      </Pressable>
                    ))}
                    {leads.length === 0 && <Text style={styles.emptyLeads}>No active leads available.</Text>}
                  </View>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>POLICY NUMBER *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. POL-987456" 
                  value={form.policy_number}
                  onChangeText={v => setForm({ ...form, policy_number: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PROVIDER *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. HDFC Ergo" 
                  value={form.provider}
                  onChangeText={v => setForm({ ...form, provider: v })}
                />
              </View>

              <View style={styles.gridFields}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>TYPE</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="e.g. Comprehensive" 
                    value={form.type}
                    onChangeText={v => setForm({ ...form, type: v })}
                  />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>PREMIUM (INR) *</Text>
                  <TextInput 
                    style={styles.input} 
                    keyboardType="numeric"
                    placeholder="₹ 0.00" 
                    value={form.premium_amount}
                    onChangeText={v => setForm({ ...form, premium_amount: v })}
                  />
                </View>
              </View>

              <View style={styles.gridFields}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>START DATE</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="YYYY-MM-DD" 
                    value={form.start_date}
                    onChangeText={v => setForm({ ...form, start_date: v })}
                  />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>END DATE</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="YYYY-MM-DD" 
                    value={form.end_date}
                    onChangeText={v => setForm({ ...form, end_date: v })}
                  />
                </View>
              </View>

              <Pressable style={styles.submitBtn} onPress={handleCreate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Add Policy</Text>}
              </Pressable>
              
              <View style={{ height: 40 }} />
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: '#FFFFFF', gap: Spacing.md },
  menuBtn: { padding: Spacing.xs },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  count: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary, backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.md, paddingVertical: 2, borderRadius: BorderRadius.sm },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  cardNo: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700', marginTop: 2 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  lbl: { fontSize: FontSize.xs, color: Colors.textMuted },
  val: { fontSize: FontSize.md, fontWeight: '900', color: Colors.text, marginTop: 2 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '85%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  closeBtn: { padding: Spacing.xs },
  modalBody: { flex: 1, marginTop: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight, letterSpacing: 1, marginBottom: Spacing.xs },
  selectWrap: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: '#FFFFFF', maxHeight: 150, padding: 4 },
  leadItem: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: 2 },
  leadItemActive: { backgroundColor: Colors.primaryLight },
  leadItemText: { fontSize: FontSize.sm, color: Colors.text },
  leadItemTextActive: { color: Colors.primary, fontWeight: '700' },
  emptyLeads: { padding: Spacing.md, fontStyle: 'italic', color: Colors.textMuted },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, height: 48, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  gridFields: { flexDirection: 'row', gap: Spacing.md },
  submitBtn: { backgroundColor: Colors.primary, height: 50, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md },
  submitBtnText: { color: Colors.white, fontWeight: '800', fontSize: FontSize.md }
});
