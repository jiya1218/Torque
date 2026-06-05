import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, RefreshControl, Linking, Modal, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCacheStore } from '../../src/store/cacheStore';
import Sidebar from '../../src/components/Sidebar';

export default function CRMScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();

  const [items, setItems] = useState<any[]>(cache['/crm']?.items || []);
  const [total, setTotal] = useState(cache['/crm']?.items?.length || 0);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Add Client Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    kyc_status: 'pending'
  });

  // Load cache on mount
  useEffect(() => {
    loadCache().then(() => {
      const cached = cache['/crm'];
      if (cached && cached.items) {
        setItems(cached.items);
        setTotal(cached.items.length);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/crm');
      const arr = Array.isArray(data) ? data : (data as any).items || [];
      setItems(arr);
      setTotal(arr.length);
      setCache('/crm', { items: arr });
    } catch (e) {
      console.error('[CRMScreen] Failed to load crm clients', e);
    }
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

  const handleAddClient = async () => {
    if (!newClient.name.trim() || !newClient.phone.trim()) {
      Alert.alert('Error', 'Name and Phone are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/crm', {
        name: newClient.name,
        phone: newClient.phone,
        email: newClient.email || null,
        address: newClient.address || null,
        kyc_status: newClient.kyc_status
      });
      setAddModalVisible(false);
      setNewClient({ name: '', phone: '', email: '', address: '', kyc_status: 'pending' });
      Alert.alert('Success', 'Client added successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add client');
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.phone?.includes(search) ||
    item.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Sidebar Component */}
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>CRM / Customers</Text>
        <Pressable style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Clients</Text>
          <Text style={styles.statVal}>{total}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pending KYC</Text>
          <Text style={[styles.statVal, { color: Colors.warning }]}>
            {items.filter(i => (i.kyc_status || i.kycStatus)?.toLowerCase() === 'pending').length}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Verified KYC</Text>
          <Text style={[styles.statVal, { color: Colors.success }]}>
            {items.filter(i => (i.kyc_status || i.kycStatus)?.toLowerCase() === 'verified').length}
          </Text>
        </View>
      </View>

      {/* Search Row */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filteredItems.length}</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredItems}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-circle-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No customers</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.name?.charAt(0)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardMeta}>{item.phone} · {item.email || 'No email'}</Text>
                <Text style={styles.cardMeta}>{item.address || 'No address'}</Text>
                
                {/* Revenue Badge */}
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
                <Pressable style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                  <Ionicons name="call" size={18} color={Colors.success} />
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => handleWhatsApp(item.name, item.phone)}>
                  <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      {/* ── Add Client Modal ── */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Client</Text>
              <Pressable onPress={() => setAddModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>FULL NAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. MEHRA KARAN"
                  placeholderTextColor={Colors.textLight}
                  value={newClient.name}
                  onChangeText={(val) => setNewClient({ ...newClient, name: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PHONE NUMBER *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+91 00000 00000"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="phone-pad"
                  value={newClient.phone}
                  onChangeText={(val) => setNewClient({ ...newClient, phone: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="karan@example.com"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={newClient.email}
                  onChangeText={(val) => setNewClient({ ...newClient, email: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>ADDRESS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Street details, city"
                  placeholderTextColor={Colors.textLight}
                  value={newClient.address}
                  onChangeText={(val) => setNewClient({ ...newClient, address: val })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleAddClient} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Add Client</Text>
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
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, backgroundColor: '#FFFFFF' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: FontSize.md, color: Colors.text },
  countBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.md, minWidth: 36, alignItems: 'center' },
  countText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#A21CAF15', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: FontSize.lg, fontWeight: '900', color: '#A21CAF' },
  cardName: { fontSize: FontSize.lg - 2, fontWeight: '800', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  revenueRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  revenueBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.success + '10', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, gap: 4, borderWidth: 1, borderColor: Colors.success + '20' },
  revenueText: { fontSize: 10, fontWeight: '700', color: Colors.success },
  activityBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary + '10', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, gap: 4, borderWidth: 1, borderColor: Colors.primary + '20' },
  activityText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  actions: { gap: Spacing.sm },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '70%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  closeBtn: { padding: Spacing.xs },
  modalBody: { flex: 1, marginTop: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, height: 50, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  submitBtn: { backgroundColor: Colors.primary, height: 52, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl },
  submitBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  statsContainer: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, backgroundColor: '#FFFFFF' },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  statLabel: { fontSize: FontSize.xs - 1, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  statVal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
});
