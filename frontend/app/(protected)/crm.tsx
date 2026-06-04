import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, RefreshControl, Linking, Modal, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import { useCacheStore } from '../../src/store/cacheStore';

export default function CRMScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<any[]>(cache['/crm'] || []);
  const [total, setTotal] = useState(items.length);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Add Client Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    kyc_status: 'pending'
  });

  useEffect(() => {
    loadCache().then(() => {
      if (cache['/crm']) {
        setItems(cache['/crm']);
        setTotal(cache['/crm'].length);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/crm');
      const arr = Array.isArray(data) ? data : (data as any).items || [];
      setItems(arr);
      setTotal(arr.length);
      setCache('/crm', arr);
    } catch {}
  }, [setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleWhatsApp = async (name: string, phone: string) => {
    if (phone) {
      const msg = `Hi ${name || 'Customer'}`;
      let cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
      }
      const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
      await Linking.openURL(whatsappUrl).catch(() => {
        return Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`);
      });
    }
  };

  const openAddModal = () => {
    setForm({ name: '', phone: '', email: '', address: '', kyc_status: 'pending' });
    setModalOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name || !form.phone) {
      Alert.alert('Error', 'Name and Phone are required.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/crm', form);
      setModalOpen(false);
      Alert.alert('Success', 'Client added successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.backBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>CRM / Clients</Text>
        <Text style={styles.count}>{total}</Text>
        <Pressable style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </Pressable>
      </View>
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput testID="crm-search" style={styles.searchInput} placeholder="Search customers..." placeholderTextColor={Colors.textLight} value={search} onChangeText={setSearch} onSubmitEditing={load} returnKeyType="search" />
        </View>
      </View>
      <FlatList data={items.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search))} keyExtractor={i => i.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-circle-outline" size={48} color={Colors.textLight} /><Text style={styles.emptyText}>No customers</Text></View>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.name?.charAt(0)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardMeta}>{item.phone} · {item.email || 'No email'}</Text>
                <Text style={styles.cardMeta}>{item.address || 'No address'}</Text>
                
                {/* Revenue & Activity Tracking */}
                <View style={styles.revenueRow}>
                  <View style={styles.revenueBadge}>
                    <Ionicons name="cash-outline" size={12} color={Colors.success} />
                    <Text style={styles.revenueText}>₹{item.totalRevenue || 0}</Text>
                  </View>
                  <View style={styles.activityBadge}>
                    <Ionicons name="shield-checkmark-outline" size={12} color={Colors.primary} />
                    <Text style={styles.activityText}>{item.policyCount || 0} Policies</Text>
                  </View>
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable testID={`call-${item.id}`} style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                  <Ionicons name="call" size={18} color={Colors.success} />
                </Pressable>
                <Pressable testID={`whatsapp-${item.id}`} style={styles.actionBtn} onPress={() => handleWhatsApp(item.name, item.phone)}>
                  <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      {/* Add Client Modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Client</Text>
              <Pressable onPress={() => setModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>CLIENT NAME *</Text>
                <TextInput style={styles.input} placeholder="e.g. Rahul Sharma" value={form.name} onChangeText={v => setForm({ ...form, name: v })} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>PHONE NUMBER *</Text>
                <TextInput style={styles.input} keyboardType="phone-pad" placeholder="e.g. 9876543210" value={form.phone} onChangeText={v => setForm({ ...form, phone: v })} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <TextInput style={styles.input} keyboardType="email-address" placeholder="e.g. rahul@example.com" value={form.email} onChangeText={v => setForm({ ...form, email: v })} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>ADDRESS</Text>
                <TextInput style={styles.input} placeholder="e.g. Sector 12, Gandhinagar" value={form.address} onChangeText={v => setForm({ ...form, address: v })} />
              </View>
              <Pressable style={styles.submitBtn} onPress={handleCreate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Add Client</Text>}
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
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  count: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary, backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.md, paddingVertical: 2, borderRadius: BorderRadius.sm },
  searchRow: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: FontSize.md, color: Colors.text },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#A21CAF15', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: FontSize.lg, fontWeight: '900', color: '#A21CAF' },
  cardName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  revenueRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  revenueBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.success + '10', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, gap: 4, borderWidth: 1, borderColor: Colors.success + '20' },
  revenueText: { fontSize: 10, fontWeight: '700', color: Colors.success },
  activityBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary + '10', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, gap: 4, borderWidth: 1, borderColor: Colors.primary + '20' },
  activityText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  cardVehicles: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600', marginTop: 4 },
  actions: { gap: Spacing.sm },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  backBtn: { padding: Spacing.xs },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '70%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  closeBtn: { padding: Spacing.xs },
  modalBody: { flex: 1, marginTop: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight, letterSpacing: 1, marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, height: 48, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  submitBtn: { backgroundColor: Colors.primary, height: 48, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md },
  submitBtnText: { color: Colors.white, fontWeight: '800', fontSize: FontSize.md }
});
