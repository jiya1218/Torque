import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, StatusBar, Modal, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/context/AuthContext';
import { usersService, User } from '../../../src/services/users';

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

export default function NewLeadScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    vehicle_type: 'Car',
    vehicle_number: '',
    gvw: '',
    insurance_type: 'Comprehensive',
    source: 'Direct',
    priority: 'medium',
    notes: '',
    assignedTo: '',
  });
  const [loading, setLoading] = useState(false);
  const [salesExecs, setSalesExecs] = useState<User[]>([]);
  const [execsLoading, setExecsLoading] = useState(false);

  const roleUpper = currentUser?.role?.toUpperCase();
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN';

  useEffect(() => {
    if (isAdmin) {
      loadSalesExecutives();
    }
  }, [isAdmin]);

  const loadSalesExecutives = async () => {
    setExecsLoading(true);
    try {
      const data = await usersService.list({ limit: 100 });
      const filtered = data.filter(u => 
        u.is_active && 
        u.role?.name && 
        (u.role.name.toUpperCase().includes('EXECUTIVE') || u.role.name.toUpperCase().includes('SALES'))
      );
      setSalesExecs(filtered);
    } catch (e: any) {
      console.error('[NewLeadScreen] Failed to load sales executives', e);
    } finally {
      setExecsLoading(false);
    }
  };

  const update = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const submit = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    if (!form.phone.trim()) { Alert.alert('Error', 'Phone number is required'); return; }

    setLoading(true);
    try {
      // Map form fields → exact API field names expected by Prisma
      await api.post('/leads/', {
        clientName: form.name.trim(),
        clientPhone: form.phone.trim(),
        clientEmail: form.email.trim() || undefined,
        vehicleNo: form.vehicle_number.trim() || undefined,
        gvw: form.gvw.trim() || undefined,
        status: 'New',
        assignedTo: form.assignedTo || undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // ✅ Use react-native-safe-area-context to properly handle status bar on Android
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>New Lead</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          <Text style={styles.label}>NAME *</Text>
          <TextInput
            testID="lead-name-input"
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={Colors.textLight}
            value={form.name}
            onChangeText={v => update('name', v)}
          />

          <Text style={styles.label}>PHONE *</Text>
          <TextInput
            testID="lead-phone-input"
            style={styles.input}
            placeholder="Phone number"
            placeholderTextColor={Colors.textLight}
            value={form.phone}
            onChangeText={v => update('phone', v)}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            testID="lead-email-input"
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={Colors.textLight}
            value={form.email}
            onChangeText={v => update('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>COMPANY</Text>
          <TextInput
            style={styles.input}
            placeholder="Company name"
            placeholderTextColor={Colors.textLight}
            value={form.company}
            onChangeText={v => update('company', v)}
          />

          <Text style={styles.label}>VEHICLE NUMBER</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., MH01AB1234"
            placeholderTextColor={Colors.textLight}
            value={form.vehicle_number}
            onChangeText={v => update('vehicle_number', v)}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>GVW</Text>
          <TextInput
            style={styles.input}
            placeholder="Gross Vehicle Weight (GVW)"
            placeholderTextColor={Colors.textLight}
            value={form.gvw}
            onChangeText={v => update('gvw', v)}
          />

          <Text style={styles.label}>INSURANCE TYPE</Text>
          <View style={styles.chipRow}>
            {['Comprehensive', 'Third Party', 'Commercial'].map(t => (
              <Pressable
                key={t}
                style={[styles.chip, form.insurance_type === t && styles.chipActive]}
                onPress={() => update('insurance_type', t)}
              >
                <Text style={[styles.chipText, form.insurance_type === t && styles.chipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>SOURCE</Text>
          <View style={styles.chipRow}>
            {['Direct', 'Referral', 'Website', 'Walk In', 'Cold Call', 'Social Media'].map(t => (
              <Pressable
                key={t}
                style={[styles.chip, form.source === t && styles.chipActive]}
                onPress={() => update('source', t)}
              >
                <Text style={[styles.chipText, form.source === t && styles.chipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          {isAdmin && (
            <DropdownSelector
              label="Assign to Sales Executive"
              placeholder={execsLoading ? "Loading executives..." : "Choose Sales Executive"}
              options={[
                { label: "None / Unassigned", value: "" },
                ...salesExecs.map(exec => ({
                  label: exec.full_name || exec.fullName || exec.email,
                  value: exec.id
                }))
              ]}
              selectedValue={form.assignedTo}
              onSelect={val => update('assignedTo', val)}
              loading={execsLoading}
              searchable
            />
          )}

          <Text style={styles.label}>NOTES</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Additional notes..."
            placeholderTextColor={Colors.textLight}
            value={form.notes}
            onChangeText={v => update('notes', v)}
            multiline
            numberOfLines={3}
          />

          <View style={{ height: 20 }} />
        </ScrollView>

        <View style={styles.stickyFooter}>
          <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={submit} disabled={loading}>
            <Text style={styles.submitBtnText}>{loading ? 'Saving...' : 'Save Lead'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: { padding: Spacing.sm },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    height: 48,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  textArea: { height: 80, paddingTop: Spacing.md, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted, textTransform: 'capitalize' },
  chipTextActive: { color: Colors.white },
  stickyFooter: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  submitBtn: {
    flex: 2,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
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
