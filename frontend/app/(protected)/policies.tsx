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

export default function PoliciesScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();

  const [items, setItems] = useState<any[]>(cache['/policies']?.items || []);
  const [total, setTotal] = useState(cache['/policies']?.items?.length || 0);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  // Add Policy Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leads, setLeads] = useState<any[]>(cache['/leads']?.items || []);
  
  const [newPolicy, setNewPolicy] = useState({
    policy_number: '',
    provider: '',
    type: '',
    premium_amount: '',
    status: 'Active',
    start_date: '',
    end_date: '',
    lead_id: ''
  });
  const [loadingLeads, setLoadingLeads] = useState(false);

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const lData = await api.get<any>('/leads');
      const leadsArr = Array.isArray(lData) ? lData : lData?.leads || lData?.items || [];
      setLeads(leadsArr);
      setCache('/leads', { items: leadsArr });
    } catch (err) {
      console.error('Error fetching leads in Policies:', err);
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
      const cachedPolicies = cache['/policies'];
      if (cachedPolicies && cachedPolicies.items) {
        setItems(cachedPolicies.items);
        setTotal(cachedPolicies.items.length);
      }
      const cachedLeads = cache['/leads'];
      if (cachedLeads && cachedLeads.items) {
        setLeads(cachedLeads.items);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const [pData, lData] = await Promise.all([
        api.get<any[]>(`/policies${statusParam}`),
        api.get<any>('/leads').catch(() => null)
      ]);

      const policiesArr = Array.isArray(pData) ? pData : [];
      setItems(policiesArr);
      setTotal(policiesArr.length);
      setCache('/policies', { items: policiesArr });

      if (lData) {
        const leadsArr = Array.isArray(lData) ? lData : lData.leads || lData.items || [];
        setLeads(leadsArr);
        setCache('/leads', { items: leadsArr });
      }
    } catch (e) {
      console.error('[PoliciesScreen] Failed to load policies data', e);
    }
  }, [filter, setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAddPolicy = async () => {
    if (!newPolicy.policy_number.trim() || !newPolicy.provider.trim() || !newPolicy.type.trim() || !newPolicy.premium_amount || !newPolicy.start_date || !newPolicy.end_date || !newPolicy.lead_id) {
      Alert.alert('Error', 'All fields marked with * are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/policies', {
        policy_number: newPolicy.policy_number.trim(),
        provider: newPolicy.provider.trim(),
        type: newPolicy.type.trim(),
        premium_amount: parseFloat(newPolicy.premium_amount),
        status: newPolicy.status,
        start_date: new Date(newPolicy.start_date).toISOString(),
        end_date: new Date(newPolicy.end_date).toISOString(),
        lead_id: newPolicy.lead_id || null
      });
      setAddModalVisible(false);
      setNewPolicy({ policy_number: '', provider: '', type: '', premium_amount: '', status: 'Active', start_date: '', end_date: '', lead_id: '' });
      Alert.alert('Success', 'Policy registered successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to register policy');
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
        <Text style={styles.title}>Policies</Text>
        <View style={styles.headerRight}>
          <View style={styles.countBadge}><Text style={styles.countText}>{total}</Text></View>
          <Pressable style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
            <Ionicons name="add" size={22} color={Colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {['all', 'Active', 'Expired', 'Lapsed'].map(s => (
          <Pressable key={s} style={[styles.chip, filter === s && styles.chipActive]} onPress={() => setFilter(s)}>
            <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      <FlatList 
        data={items} 
        keyExtractor={i => i.id} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="shield-checkmark-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No policies</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = StatusColors[item.status] || StatusColors.active || StatusColors.pending;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.lead?.clientName || 'Direct Policy'}</Text>
                  <Text style={styles.cardMeta}>{item.policyNumber} · {item.provider} · {item.type}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}><Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text></View>
              </View>
              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.policyLabel}>Premium</Text>
                  <Text style={styles.policyValue}>₹{Number(item.premiumAmount || 0).toLocaleString()}</Text>
                </View>
                <View>
                  <Text style={styles.policyLabel}>End Date</Text>
                  <Text style={styles.policyValue}>{new Date(item.endDate).toLocaleDateString()}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* ── Add Policy Modal ── */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Policy</Text>
              <Pressable onPress={() => setAddModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <DropdownSelector
                label="Link to Lead *"
                placeholder="Choose a lead to link"
                options={leads.map(l => ({
                  label: `${l.clientName} (${l.vehicleNo || 'No vehicle'})`,
                  value: l.id
                }))}
                selectedValue={newPolicy.lead_id}
                onSelect={(val) => setNewPolicy(prev => ({ ...prev, lead_id: val }))}
                searchable
                onOpen={fetchLeads}
                loading={loadingLeads}
              />

              <View style={styles.field}>
                <Text style={styles.label}>POLICY NUMBER *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. POL-98765432"
                  placeholderTextColor={Colors.textLight}
                  value={newPolicy.policy_number}
                  onChangeText={(val) => setNewPolicy({ ...newPolicy, policy_number: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PROVIDER *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. HDFC Ergo, ICICI Lombard"
                  placeholderTextColor={Colors.textLight}
                  value={newPolicy.provider}
                  onChangeText={(val) => setNewPolicy({ ...newPolicy, provider: val })}
                />
              </View>

              <DropdownSelector
                label="Policy Type *"
                placeholder="Select Type"
                options={[
                  { label: "Comprehensive", value: "Comprehensive" },
                  { label: "Third Party", value: "Third Party" },
                  { label: "Zero Depreciation", value: "Zero Depreciation" },
                  { label: "Own Damage Only", value: "Own Damage Only" }
                ]}
                selectedValue={newPolicy.type}
                onSelect={(val) => setNewPolicy(prev => ({ ...prev, type: val }))}
              />

              <View style={styles.field}>
                <Text style={styles.label}>PREMIUM AMOUNT *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={newPolicy.premium_amount}
                  onChangeText={(val) => setNewPolicy({ ...newPolicy, premium_amount: val })}
                />
              </View>

              <DatePickerSelector
                label="Start Date *"
                value={newPolicy.start_date}
                onChange={(val) => setNewPolicy(prev => ({ ...prev, start_date: val }))}
                placeholder="Select Start Date"
              />

              <DatePickerSelector
                label="End Date *"
                value={newPolicy.end_date}
                onChange={(val) => setNewPolicy(prev => ({ ...prev, end_date: val }))}
                placeholder="Select End Date"
              />

              <Pressable style={styles.submitBtn} onPress={handleAddPolicy} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Register Policy</Text>
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
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingVertical: Spacing.sm, backgroundColor: '#FFFFFF' },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted },
  chipTextActive: { color: Colors.white },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: FontSize.lg - 2, fontWeight: '800', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  policyLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '500' },
  policyValue: { fontSize: FontSize.md, fontWeight: '900', color: Colors.text, marginTop: 2 },
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
  hint: { fontSize: 10, color: Colors.textLight, marginTop: 4 },
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
