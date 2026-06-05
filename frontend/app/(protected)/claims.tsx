import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
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

export default function ClaimsScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();

  const [items, setItems] = useState<any[]>(cache['/claims']?.items || []);
  const [total, setTotal] = useState(cache['/claims']?.items?.length || 0);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Add Claim Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newClaim, setNewClaim] = useState({
    policyNumber: '',
    customerName: '',
    vehicleNumber: '',
    claimType: 'Accidental Damage',
    claimAmount: '',
    incident_date: ''
  });

  const [policies, setPolicies] = useState<any[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);

  const fetchPolicies = async () => {
    setLoadingPolicies(true);
    try {
      const res = await api.get<any[]>('/policies');
      setPolicies(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error fetching policies:', err);
    } finally {
      setLoadingPolicies(false);
    }
  };

  useEffect(() => {
    if (addModalVisible) {
      fetchPolicies();
    }
  }, [addModalVisible]);

  // Load cache on mount
  useEffect(() => {
    loadCache().then(() => {
      const cached = cache['/claims'];
      if (cached && cached.items) {
        setItems(cached.items);
        setTotal(cached.items.length);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const data = await api.get<any[]>(`/claims/${params}`);
      const arr = Array.isArray(data) ? data : (data as any).items || [];
      setItems(arr);
      setTotal(arr.length);
      setCache('/claims', { items: arr });
    } catch (e) {
      console.error('[ClaimsScreen] Failed to load claims', e);
    }
  }, [filter, setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAddClaim = async () => {
    if (!newClaim.policyNumber.trim()) {
      Alert.alert('Error', 'Policy selection is compulsory.');
      return;
    }
    if (!newClaim.customerName.trim() || !newClaim.claimAmount) {
      Alert.alert('Error', 'Customer Name and Amount are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/claims', {
        policyNumber: newClaim.policyNumber.trim(),
        customerName: newClaim.customerName.trim(),
        vehicleNumber: newClaim.vehicleNumber.trim() || null,
        claimType: newClaim.claimType,
        claimAmount: parseFloat(newClaim.claimAmount),
        incident_date: newClaim.incident_date ? new Date(newClaim.incident_date).toISOString() : null
      });
      setAddModalVisible(false);
      setNewClaim({ policyNumber: '', customerName: '', vehicleNumber: '', claimType: 'Accidental Damage', claimAmount: '', incident_date: '' });
      Alert.alert('Success', 'Claim filed successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to file claim');
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
        <Text style={styles.title}>Claims</Text>
        <Pressable style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Filter Row */}
      <View style={{ height: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {['all','filed','under_review','approved','rejected','settled'].map(s => (
            <Pressable key={s} style={[styles.chip, filter === s && styles.chipActive]} onPress={() => setFilter(s)}>
              <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>{s === 'all' ? 'All' : s.replace(/_/g, ' ')}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList 
        data={items} 
        keyExtractor={i => i.id} 
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
                  <Text style={styles.cardMeta}>{item.policyNumber || item.policy_number} · {(item.claimType || item.claim_type)?.replace(/_/g, ' ')}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}><Text style={[styles.badgeText, { color: sc.text }]}>{item.status?.replace(/_/g, ' ')}</Text></View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.amount}>₹{(item.claimAmount || item.claim_amount || 0).toLocaleString()}</Text>
                <Text style={styles.cardDate}>{item.vehicleNumber || item.vehicle_number}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* ── Add Claim Modal ── */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>File New Claim</Text>
              <Pressable onPress={() => setAddModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <DropdownSelector
                label="Select Policy *"
                placeholder="Choose a policy"
                options={policies.map(p => ({
                  label: `${p.policyNumber} (${p.lead?.clientName || 'Direct Policy'})`,
                  value: p.id
                }))}
                selectedValue={policies.find(p => p.policyNumber === newClaim.policyNumber)?.id || ''}
                onSelect={(val) => {
                  const policy = policies.find(p => p.id === val);
                  if (policy) {
                    setNewClaim(prev => ({
                      ...prev,
                      policyNumber: policy.policyNumber,
                      customerName: policy.lead?.clientName || 'Direct Policy',
                      vehicleNumber: policy.lead?.vehicleNo || ''
                    }));
                  }
                }}
                searchable
                onOpen={fetchPolicies}
                loading={loadingPolicies}
              />

              <View style={styles.field}>
                <Text style={styles.label}>POLICY NUMBER *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#F8FAFC' }]}
                  placeholder="Policy number"
                  placeholderTextColor={Colors.textLight}
                  value={newClaim.policyNumber}
                  editable={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>CUSTOMER NAME *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#F8FAFC' }]}
                  placeholder="Customer name"
                  placeholderTextColor={Colors.textLight}
                  value={newClaim.customerName}
                  editable={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>VEHICLE NUMBER</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#F8FAFC' }]}
                  placeholder="Vehicle number"
                  placeholderTextColor={Colors.textLight}
                  value={newClaim.vehicleNumber}
                  editable={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>CLAIM AMOUNT *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={newClaim.claimAmount}
                  onChangeText={(val) => setNewClaim({ ...newClaim, claimAmount: val })}
                />
              </View>

              <DropdownSelector
                label="Claim Type"
                placeholder="Select Claim Type"
                options={[
                  { label: 'Accidental Damage', value: 'Accidental Damage' },
                  { label: 'Theft', value: 'Theft' },
                  { label: 'Natural Calamity', value: 'Natural Calamity' },
                  { label: 'Third Party Liability', value: 'Third Party Liability' },
                  { label: 'Fire', value: 'Fire' },
                  { label: 'Other', value: 'Other' }
                ]}
                selectedValue={newClaim.claimType}
                onSelect={(val) => setNewClaim({ ...newClaim, claimType: val })}
              />

              <DatePickerSelector
                label="Incident Date"
                value={newClaim.incident_date}
                onChange={(val) => setNewClaim({ ...newClaim, incident_date: val })}
                placeholder="Select Incident Date"
              />

              <Pressable style={styles.submitBtn} onPress={handleAddClaim} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>File Claim</Text>
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
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, height: 38, marginTop: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', height: 32 },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted, textTransform: 'capitalize' },
  chipTextActive: { color: Colors.white },
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
