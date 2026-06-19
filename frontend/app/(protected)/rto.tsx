import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCacheStore } from '../../src/store/cacheStore';
import Sidebar from '../../src/components/Sidebar';
import DatePickerSelector from '../../src/components/DatePickerSelector';

interface DropdownProps {
  label: string;
  placeholder: string;
  options: { label: string; value: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
  searchable?: boolean;
  onOpen?: () => void;
  loading?: boolean;
}

function DropdownSelector({ label, placeholder, options, selectedValue, onSelect, searchable = false, onOpen, loading = false }: DropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const selectedOption = options.find(o => o.value === selectedValue);
  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <View style={styles.dropdownField}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Pressable 
        style={styles.dropdownTrigger} 
        onPress={() => {
          setSearchQuery('');
          setModalVisible(true);
          if (onOpen) onOpen();
        }}
      >
        <Text style={[styles.dropdownTriggerText, !selectedOption && styles.placeholderText]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
        )}
      </Pressable>
      
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dropdownModalContent}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>{label}</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            
            {searchable && (
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.textLight} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  placeholderTextColor={Colors.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                    <Ionicons name="close-circle" size={16} color={Colors.textLight} />
                  </Pressable>
                )}
              </View>
            )}
            
            <ScrollView style={styles.optionsList} keyboardShouldPersistTaps="handled">
              {filteredOptions.length === 0 ? (
                <Text style={styles.noOptionsText}>No options found</Text>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === selectedValue;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[styles.optionItem, isSelected && styles.optionItemActive]}
                      onPress={() => {
                        onSelect(opt.value);
                        setModalVisible(false);
                      }}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                        {opt.label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

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

  // Edit RTO Status Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedRto, setSelectedRto] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await api.get<any>('/leads');
      setLeads(res.leads || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (addModalVisible) {
      fetchLeads();
    }
  }, [addModalVisible]);

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
    if (!newRto.leadId) {
      Alert.alert('Error', 'Lead selection is compulsory.');
      return;
    }
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

  const handleUpdateStatus = async () => {
    if (!selectedRto) return;
    setUpdating(true);
    try {
      await api.patch('/workflow/rto', {
        id: selectedRto.id,
        status: editStatus,
        paymentStatus: editPaymentStatus
      });
      setEditModalVisible(false);
      Alert.alert('Success', 'RTO work updated successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update RTO status');
    } finally {
      setUpdating(false);
    }
  };

  // Stats calculations
  const pendingCount = items.filter(item => item.status?.toLowerCase() === 'pending').length;
  const inProgressCount = items.filter(item => item.status?.toLowerCase() === 'in_progress' || item.status?.toLowerCase() === 'active').length;
  const completedCount = items.filter(item => item.status?.toLowerCase() === 'completed').length;

  const paymentPendingCount = items.filter(item => !item.paymentStatus || item.paymentStatus?.toLowerCase() === 'pending' || item.paymentStatus?.toLowerCase() === 'unpaid').length;
  const paymentPaidCount = items.filter(item => item.paymentStatus?.toLowerCase() === 'paid').length;

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

      {/* RTO Statistics */}
      <View style={styles.statsSection}>
        <View style={styles.statsColumn}>
          <Text style={styles.columnHeading}>WORK STATUS</Text>
          <View style={styles.columnStatsRow}>
            <View style={styles.miniStatItem}>
              <View style={[styles.statusDot, { backgroundColor: Colors.warning }]} />
              <Text style={styles.miniStatLabel}>Pending:</Text>
              <Text style={[styles.miniStatValue, { color: Colors.warning }]}>{pendingCount}</Text>
            </View>
            <View style={styles.miniStatItem}>
              <View style={[styles.statusDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.miniStatLabel}>Active:</Text>
              <Text style={[styles.miniStatValue, { color: Colors.primary }]}>{inProgressCount}</Text>
            </View>
            <View style={styles.miniStatItem}>
              <View style={[styles.statusDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.miniStatLabel}>Completed:</Text>
              <Text style={[styles.miniStatValue, { color: Colors.success }]}>{completedCount}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsDividerLine} />

        <View style={styles.statsColumn}>
          <Text style={styles.columnHeading}>PAYMENT STATUS</Text>
          <View style={styles.columnStatsRow}>
            <View style={styles.miniStatItem}>
              <View style={[styles.statusDot, { backgroundColor: Colors.error }]} />
              <Text style={styles.miniStatLabel}>Unpaid:</Text>
              <Text style={[styles.miniStatValue, { color: Colors.error }]}>{paymentPendingCount}</Text>
            </View>
            <View style={styles.miniStatItem}>
              <View style={[styles.statusDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.miniStatLabel}>Paid:</Text>
              <Text style={[styles.miniStatValue, { color: Colors.success }]}>{paymentPaidCount}</Text>
            </View>
          </View>
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
          const isPaid = item.paymentStatus?.toLowerCase() === 'paid';
          return (
            <Pressable
              style={styles.card}
              onPress={() => {
                setSelectedRto(item);
                setEditStatus(item.status);
                setEditPaymentStatus(item.paymentStatus || 'Pending');
                setEditModalVisible(true);
              }}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.customerName || item.customer_name}</Text>
                  <Text style={styles.cardMeta}>{item.vehicleNumber || item.vehicle_number} · {(item.workType || item.work_type)?.replace(/_/g, ' ')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 9, color: Colors.textMuted, fontWeight: '600' }}>Work:</Text>
                    <View style={[styles.badge, { backgroundColor: sc.bg }]}><Text style={[styles.badgeText, { color: sc.text }]}>{item.status?.replace(/_/g, ' ')}</Text></View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 9, color: Colors.textMuted, fontWeight: '600' }}>Pay:</Text>
                    <View style={[styles.badge, { backgroundColor: isPaid ? '#ECFDF5' : '#FEF2F2' }]}><Text style={[styles.badgeText, { color: isPaid ? '#047857' : '#B91C1C' }]}>{item.paymentStatus || 'Unpaid'}</Text></View>
                  </View>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.amount}>₹{(item.fees || 0).toLocaleString()}</Text>
                <Text style={styles.cardDate}>{item.dueDate || item.due_date ? `Due: ${new Date(item.dueDate || item.due_date).toLocaleDateString()}` : ''}</Text>
              </View>
            </Pressable>
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
              <DropdownSelector
                label="Select Lead *"
                placeholder="Choose a lead"
                options={leads.map(l => ({
                  label: `${l.clientName} (${l.vehicleNo || 'No vehicle'})`,
                  value: l.id
                }))}
                selectedValue={newRto.leadId}
                onSelect={(val) => {
                  const lead = leads.find(l => l.id === val);
                  if (lead) {
                    setNewRto(prev => ({
                      ...prev,
                      leadId: val,
                      customerName: lead.clientName || '',
                      vehicleNumber: lead.vehicleNo || ''
                    }));
                  }
                }}
                searchable
                onOpen={fetchLeads}
                loading={loadingLeads}
              />

              <View style={styles.field}>
                <Text style={styles.label}>CUSTOMER NAME *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#F8FAFC' }]}
                  placeholder="Customer name"
                  placeholderTextColor={Colors.textLight}
                  value={newRto.customerName}
                  editable={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>VEHICLE NUMBER</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#F8FAFC' }]}
                  placeholder="Vehicle number"
                  placeholderTextColor={Colors.textLight}
                  value={newRto.vehicleNumber}
                  editable={false}
                />
              </View>

              <DropdownSelector
                label="Work Type *"
                placeholder="Select service type"
                options={[
                  { label: 'Ownership Transfer', value: 'Ownership Transfer' },
                  { label: 'NOC Certificate', value: 'NOC Certificate' },
                  { label: 'Address Change', value: 'Address Change' },
                  { label: 'Duplicate RC', value: 'Duplicate RC' },
                  { label: 'HP Adding/Removing', value: 'HP Adding/Removing' }
                ]}
                selectedValue={newRto.workType}
                onSelect={(val) => setNewRto(prev => ({ ...prev, workType: val }))}
              />

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

              <DatePickerSelector
                label="Due Date"
                value={newRto.dueDate}
                onChange={(val) => setNewRto(prev => ({ ...prev, dueDate: val }))}
                placeholder="Select Due Date"
              />

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

      {/* ── Edit Status Modal ── */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Status</Text>
              <Pressable onPress={() => setEditModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedRto && (
                <>
                  <View style={{ marginBottom: Spacing.lg }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.text }}>{selectedRto.customerName || selectedRto.customer_name}</Text>
                    <Text style={{ fontSize: FontSize.xs, color: Colors.textMuted }}>{selectedRto.vehicleNumber || selectedRto.vehicle_number} · {selectedRto.workType || selectedRto.work_type}</Text>
                  </View>

                  <DropdownSelector
                    label="Work Status"
                    placeholder="Select status"
                    options={[
                      { label: 'Pending', value: 'pending' },
                      { label: 'In Progress', value: 'in_progress' },
                      { label: 'Completed', value: 'completed' },
                      { label: 'Cancelled', value: 'cancelled' }
                    ]}
                    selectedValue={editStatus}
                    onSelect={(val) => setEditStatus(val)}
                  />

                  <DropdownSelector
                    label="Payment Status"
                    placeholder="Select payment status"
                    options={[
                      { label: 'Pending', value: 'Pending' },
                      { label: 'Paid', value: 'Paid' },
                      { label: 'Partially Paid', value: 'Partially Paid' }
                    ]}
                    selectedValue={editPaymentStatus}
                    onSelect={(val) => setEditPaymentStatus(val)}
                  />

                  <Pressable style={styles.submitBtn} onPress={handleUpdateStatus} disabled={updating}>
                    {updating ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <Text style={styles.submitBtnText}>Update Work Status</Text>
                    )}
                  </Pressable>
                </>
              )}
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
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: Spacing.md,
  },
  statsColumn: {
    flex: 1,
  },
  columnHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  columnStatsRow: {
    flexDirection: 'column',
    gap: 6,
  },
  miniStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniStatLabel: {
    fontSize: FontSize.sm - 1,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  miniStatValue: {
    fontSize: FontSize.sm - 1,
    fontWeight: '800',
  },
  statsDividerLine: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
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
  dropdownField: {
    marginBottom: Spacing.md,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    height: 50,
    paddingHorizontal: Spacing.md,
    marginTop: 4,
  },
  dropdownTriggerText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  placeholderText: {
    color: Colors.textLight,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dropdownModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownModalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  modalCloseBtn: {
    padding: Spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    height: '100%',
  },
  searchClearBtn: {
    padding: Spacing.xs,
  },
  optionsList: {
    paddingHorizontal: Spacing.lg,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceMuted,
  },
  optionItemActive: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  optionText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  optionTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  noOptionsText: {
    textAlign: 'center',
    color: Colors.textLight,
    paddingVertical: Spacing.xl,
    fontSize: FontSize.sm,
  },
});
