import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCacheStore } from '../../src/store/cacheStore';
import Sidebar from '../../src/components/Sidebar';

export default function RTOScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();

  const [items, setItems] = useState<any[]>(cache['/workflow/rto']?.items || []);
  const [total, setTotal] = useState(cache['/workflow/rto']?.items?.length || 0);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Add RTO Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRto, setNewRto] = useState({
    customerName: '',
    vehicleNumber: '',
    workType: '',
    rtoOffice: '',
    fees: '',
    dueDate: '',
    leadId: ''
  });

  // Load cache on mount
  useEffect(() => {
    loadCache().then(() => {
      const cached = cache['/workflow/rto'];
      if (cached && cached.items) {
        setItems(cached.items);
        setTotal(cached.items.length);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/workflow/rto');
      const arr = Array.isArray(data) ? data : (data as any).items || [];
      setItems(arr);
      setTotal(arr.length);
      setCache('/workflow/rto', { items: arr });
    } catch (e) {
      console.error('[RTOScreen] Failed to load RTO work', e);
    }
  }, [setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAddRto = async () => {
    if (!newRto.customerName.trim() || !newRto.workType.trim()) {
      Alert.alert('Error', 'Customer Name and Work Type are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/workflow/rto', {
        customerName: newRto.customerName.trim(),
        vehicleNumber: newRto.vehicleNumber.trim() || null,
        workType: newRto.workType.trim(),
        rtoOffice: newRto.rtoOffice.trim() || null,
        fees: newRto.fees ? parseFloat(newRto.fees) : null,
        dueDate: newRto.dueDate ? new Date(newRto.dueDate).toISOString() : null,
        leadId: newRto.leadId || null
      });
      setAddModalVisible(false);
      setNewRto({ customerName: '', vehicleNumber: '', workType: '', rtoOffice: '', fees: '', dueDate: '', leadId: '' });
      Alert.alert('Success', 'RTO Work created successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create RTO work');
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
        <Text style={styles.title}>RTO Work</Text>
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
            <Ionicons name="car-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No RTO work</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = StatusColors[item.status] || StatusColors.pending;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.customerName || item.customer_name}</Text>
                  <Text style={styles.cardMeta}>{item.vehicleNumber || item.vehicle_number} · {(item.workType || item.work_type)?.replace(/_/g, ' ')}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}><Text style={[styles.badgeText, { color: sc.text }]}>{item.status?.replace(/_/g, ' ')}</Text></View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.amount}>₹{(item.fees || 0).toLocaleString()}</Text>
                <Text style={styles.cardDate}>{item.dueDate || item.due_date ? `Due: ${new Date(item.dueDate || item.due_date).toLocaleDateString()}` : ''}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* ── Add RTO Modal ── */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNewRto({ customerName: '', vehicleNumber: '', workType: '', rtoOffice: '', fees: '', dueDate: '', leadId: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create RTO Work</Text>
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
                  value={newRto.customerName}
                  onChangeText={(val) => setNewRto({ ...newRto, customerName: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>VEHICLE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. GJ-01-XX-0000"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="characters"
                  value={newRto.vehicleNumber}
                  onChangeText={(val) => setNewRto({ ...newRto, vehicleNumber: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>WORK TYPE *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Tax Payment, Transfer, Renewal"
                  placeholderTextColor={Colors.textLight}
                  value={newRto.workType}
                  onChangeText={(val) => setNewRto({ ...newRto, workType: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>RTO OFFICE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ahmedabad RTO"
                  placeholderTextColor={Colors.textLight}
                  value={newRto.rtoOffice}
                  onChangeText={(val) => setNewRto({ ...newRto, rtoOffice: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>FEES (ESTIMATED)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={newRto.fees}
                  onChangeText={(val) => setNewRto({ ...newRto, fees: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>DUE DATE (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2026-06-30"
                  placeholderTextColor={Colors.textLight}
                  value={newRto.dueDate}
                  onChangeText={(val) => setNewRto({ ...newRto, dueDate: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>LINK TO LEAD (OPTIONAL ID)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Paste Lead UUID if any"
                  placeholderTextColor={Colors.textLight}
                  value={newRto.leadId}
                  onChangeText={(val) => setNewRto({ ...newRto, leadId: val })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleAddRto} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Create RTO Work</Text>
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
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md },
  amount: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.text },
  cardDate: { fontSize: FontSize.sm, color: Colors.textMuted },
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
