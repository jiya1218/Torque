import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';

interface DropdownSelectorProps {
  label: string;
  placeholder: string;
  options: { label: string; value: string }[];
  selectedValue: string;
  onSelect: (val: string) => void;
}

function DropdownSelector({ label, placeholder, options, selectedValue, onSelect }: DropdownSelectorProps) {
  const [visible, setVisible] = useState(false);
  const selectedOption = options.find(o => o.value === selectedValue);

  return (
    <View style={styles.dropdownField}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Pressable style={styles.dropdownTrigger} onPress={() => setVisible(true)}>
        <Text style={[styles.dropdownTriggerText, !selectedOption && styles.placeholderText]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.dropdownModalContent}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>{label}</Text>
              <Pressable onPress={() => setVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.optionsList}>
              {options.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.optionItem, opt.value === selectedValue && styles.optionItemActive]}
                  onPress={() => {
                    onSelect(opt.value);
                    setVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, opt.value === selectedValue && styles.optionTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function RatesManagementScreen() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'companies' | 'categories'>('rules');
  const [loading, setLoading] = useState(true);

  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);

  // Input states
  const [companyName, setCompanyName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [ruleForm, setRuleForm] = useState({
    id: '',
    companyId: '',
    categoryId: '',
    percentage: '',
    profit: '',
    status: '1'
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, catRes, ruleRes] = await Promise.all([
        api.get('/rates/companies'),
        api.get('/rates/categories'),
        api.get('/rates/relationships')
      ]);
      setCompanies(compRes || []);
      setCategories(catRes || []);
      setRules(ruleRes || []);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load rates configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Companies CRUD
  const handleAddCompany = async () => {
    if (!companyName.trim()) return;
    try {
      await api.post('/rates/companies', { name: companyName.trim() });
      setCompanyName('');
      Alert.alert('Success', 'Company added successfully!');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add company');
    }
  };

  const handleToggleCompany = async (id: string, currentStatus: number) => {
    try {
      const nextStatus = currentStatus === 1 ? 2 : 1;
      await api.patch(`/rates/companies/${id}`, { status: nextStatus });
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status');
    }
  };

  // Categories CRUD
  const handleAddCategory = async () => {
    if (!categoryName.trim()) return;
    try {
      await api.post('/rates/categories', { name: categoryName.trim() });
      setCategoryName('');
      Alert.alert('Success', 'Category added successfully!');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add category');
    }
  };

  const handleToggleCategory = async (id: string, currentStatus: number) => {
    try {
      const nextStatus = currentStatus === 1 ? 2 : 1;
      await api.patch(`/rates/categories/${id}`, { status: nextStatus });
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status');
    }
  };

  // Rules CRUD
  const handleSaveRule = async () => {
    const { id, companyId, categoryId, percentage, profit, status } = ruleForm;
    if (!companyId || !categoryId || percentage === '' || profit === '') {
      Alert.alert('Error', 'Please fill all required fields.');
      return;
    }

    try {
      const body = {
        companyId,
        categoryId,
        percentage: parseFloat(percentage),
        profit: parseFloat(profit),
        status: parseInt(status)
      };

      if (id) {
        await api.patch(`/rates/relationships/${id}`, body);
        Alert.alert('Success', 'Rule updated successfully!');
      } else {
        await api.post('/rates/relationships', body);
        Alert.alert('Success', 'Rule created successfully!');
      }

      setRuleForm({ id: '', companyId: '', categoryId: '', percentage: '', profit: '', status: '1' });
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save rate rule');
    }
  };

  const handleDeleteRule = async (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure want to delete this rate rule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/rates/relationships/${id}`);
            loadData();
          } catch (err: any) {
            Alert.alert('Error', 'Failed to delete rule.');
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Quotation Rates</Text>
        <Pressable onPress={loadData} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabBar}>
        {[
          { id: 'rules', label: 'Rate Rules' },
          { id: 'companies', label: 'Companies' },
          { id: 'categories', label: 'Categories' }
        ].map(tab => (
          <Pressable
            key={tab.id}
            style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          
          {/* Rules Forms */}
          {activeTab === 'rules' && (
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>{ruleForm.id ? 'Edit Rate Rule' : 'New Rate Rule'}</Text>
              
              <DropdownSelector
                label="Company"
                placeholder="Select Company"
                options={companies.map(c => ({ label: c.name, value: c.id }))}
                selectedValue={ruleForm.companyId}
                onSelect={(val) => setRuleForm({ ...ruleForm, companyId: val })}
              />

              <DropdownSelector
                label="Category"
                placeholder="Select Category"
                options={categories.map(c => ({ label: c.name, value: c.id }))}
                selectedValue={ruleForm.categoryId}
                onSelect={(val) => setRuleForm({ ...ruleForm, categoryId: val })}
              />

              <Text style={styles.label}>PERCENTAGE (IN %)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 15"
                placeholderTextColor={Colors.textLight}
                value={ruleForm.percentage}
                onChangeText={(val) => setRuleForm({ ...ruleForm, percentage: val })}
                keyboardType="numeric"
              />

              <Text style={styles.label}>PROFIT (IN RUPEES)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2000"
                placeholderTextColor={Colors.textLight}
                value={ruleForm.profit}
                onChangeText={(val) => setRuleForm({ ...ruleForm, profit: val })}
                keyboardType="numeric"
              />

              <DropdownSelector
                label="Status"
                placeholder="Choose status"
                options={[
                  { label: 'Active', value: '1' },
                  { label: 'Inactive', value: '2' }
                ]}
                selectedValue={ruleForm.status}
                onSelect={(val) => setRuleForm({ ...ruleForm, status: val })}
              />

              <View style={styles.btnRow}>
                <Pressable style={styles.saveBtn} onPress={handleSaveRule}>
                  <Text style={styles.saveBtnText}>{ruleForm.id ? 'Update Rule' : 'Create Rule'}</Text>
                </Pressable>
                {ruleForm.id ? (
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() => setRuleForm({ id: '', companyId: '', categoryId: '', percentage: '', profit: '', status: '1' })}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={[styles.sectionHeading, { marginTop: Spacing.xl }]}>Rate Matrix Rules</Text>
              {rules.length === 0 ? (
                <Text style={styles.emptyText}>No rate rules configured yet.</Text>
              ) : (
                rules.map((item) => (
                  <View key={item.id} style={styles.card}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{item.company?.name}</Text>
                      <Text style={styles.cardDesc}>{item.category?.name}</Text>
                      <Text style={styles.cardDetails}>Pct: {parseFloat(item.percentage)}%  ·  Profit: ₹{parseFloat(item.profit)}</Text>
                    </View>
                    <View style={styles.actions}>
                      <Pressable
                        style={styles.actionIcon}
                        onPress={() => setRuleForm({
                          id: item.id,
                          companyId: item.companyId,
                          categoryId: item.categoryId,
                          percentage: String(item.percentage),
                          profit: String(item.profit),
                          status: String(item.status)
                        })}
                      >
                        <Ionicons name="create-outline" size={18} color={Colors.primary} />
                      </Pressable>
                      <Pressable style={styles.actionIcon} onPress={() => handleDeleteRule(item.id)}>
                        <Ionicons name="trash-outline" size={18} color={Colors.error} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Companies CRUD Forms */}
          {activeTab === 'companies' && (
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Add Company</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. HDFC ERGO"
                placeholderTextColor={Colors.textLight}
                value={companyName}
                onChangeText={setCompanyName}
              />
              <Pressable style={[styles.saveBtn, { marginTop: Spacing.md }]} onPress={handleAddCompany}>
                <Text style={styles.saveBtnText}>Add Company</Text>
              </Pressable>

              <Text style={[styles.sectionHeading, { marginTop: Spacing.xl }]}>Registered Companies</Text>
              {companies.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={[styles.statusText, { color: item.status === 1 ? Colors.success : Colors.textMuted }]}>
                      {item.status === 1 ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.toggleBtn, { backgroundColor: item.status === 1 ? Colors.errorBg : Colors.success + '15' }]}
                    onPress={() => handleToggleCompany(item.id, item.status)}
                  >
                    <Text style={[styles.toggleBtnText, { color: item.status === 1 ? Colors.error : Colors.success }]}>
                      {item.status === 1 ? 'Disable' : 'Enable'}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Categories CRUD Forms */}
          {activeTab === 'categories' && (
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Add Category</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Two Wheeler Comprehensive"
                placeholderTextColor={Colors.textLight}
                value={categoryName}
                onChangeText={setCategoryName}
              />
              <Pressable style={[styles.saveBtn, { marginTop: Spacing.md }]} onPress={handleAddCategory}>
                <Text style={styles.saveBtnText}>Add Category</Text>
              </Pressable>

              <Text style={[styles.sectionHeading, { marginTop: Spacing.xl }]}>Categories list</Text>
              {categories.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={[styles.statusText, { color: item.status === 1 ? Colors.success : Colors.textMuted }]}>
                      {item.status === 1 ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.toggleBtn, { backgroundColor: item.status === 1 ? Colors.errorBg : Colors.success + '15' }]}
                    onPress={() => handleToggleCategory(item.id, item.status)}
                  >
                    <Text style={[styles.toggleBtnText, { color: item.status === 1 ? Colors.error : Colors.success }]}>
                      {item.status === 1 ? 'Disable' : 'Enable'}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: '#FFFFFF' },
  menuBtn: { padding: Spacing.xs },
  refreshBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, padding: 4, marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.sm },
  tabButtonActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  tabLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted },
  tabLabelActive: { color: Colors.text },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg },
  section: { gap: Spacing.sm },
  sectionHeading: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.2, marginTop: Spacing.sm },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, height: 48, fontSize: FontSize.md, color: Colors.text },
  btnRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  saveBtn: { flex: 1, backgroundColor: Colors.primary, height: 48, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: Colors.border, height: 48, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface },
  cancelBtnText: { color: Colors.textMuted, fontSize: FontSize.md, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: Colors.textLight, paddingVertical: Spacing.xl, fontSize: FontSize.sm, fontStyle: 'italic' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, marginBottom: 8 },
  cardTitle: { fontSize: FontSize.md - 1, fontWeight: '800', color: Colors.text },
  cardDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  cardDetails: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700', marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionIcon: { padding: Spacing.xs, backgroundColor: '#FFFFFF', borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.sm },
  toggleBtnText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  // Dropdown style overrides
  dropdownField: { marginBottom: Spacing.sm },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, height: 48, paddingHorizontal: Spacing.md, marginTop: 4 },
  dropdownTriggerText: { fontSize: FontSize.md, color: Colors.text, fontWeight: '500' },
  placeholderText: { color: Colors.textLight },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dropdownModalContent: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '85%', paddingBottom: 30 },
  dropdownModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownModalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  modalCloseBtn: { padding: Spacing.xs },
  optionsList: { paddingHorizontal: Spacing.lg },
  optionItem: { paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  optionItemActive: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.sm },
  optionText: { fontSize: FontSize.md, color: Colors.text },
  optionTextActive: { color: Colors.primary, fontWeight: '600' }
});
