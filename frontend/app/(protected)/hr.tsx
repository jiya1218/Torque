import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
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
              <View style={styles.dropdownSearchContainer}>
                <Ionicons name="search" size={20} color={Colors.textLight} style={styles.searchIcon} />
                <TextInput
                  style={styles.dropdownSearchInput}
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

export default function HRScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { cache, setCache, loadCache } = useCacheStore();

  const [items, setItems] = useState<any[]>(cache['/hr/users']?.items || []);
  const [total, setTotal] = useState(cache['/hr/users']?.items?.length || 0);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [onLeaveCount, setOnLeaveCount] = useState(0);

  // Add Employee Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<any[]>(cache['/hr/roles'] || []);
  
  const [newEmployee, setNewEmployee] = useState({
    fullName: '',
    email: '',
    password: '',
    roleId: '',
    managerId: '',
    highestQualification: '',
    joiningDate: '',
    personalMobile: '',
    homeMobile: ''
  });

  // Edit Employee Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    roleId: '',
    managerId: '',
    personalMobile: '',
    homeMobile: '',
    highestQualification: '',
    isActive: true,
  });

  // Leave modal states
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    type: 'casual',
  });

  const roleUpper = user?.role?.toUpperCase();
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN' || roleUpper === 'MANAGER';

  // Load cache on mount
  useEffect(() => {
    loadCache().then(() => {
      const cachedUsers = cache['/hr/users'];
      if (cachedUsers && cachedUsers.items) {
        setItems(cachedUsers.items);
        setTotal(cachedUsers.items.length);
      }
      const cachedRoles = cache['/hr/roles'];
      if (cachedRoles) {
        setRoles(cachedRoles);
      }
    });
  }, []);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [uData, rData] = await Promise.all([
        api.get<any[]>('/users/'),
        api.get<any[]>('/roles').catch(() => [])
      ]);
      const arr = Array.isArray(uData) ? uData : (uData as any).items || [];
      setItems(arr);
      setTotal(arr.length);
      setCache('/hr/users', { items: arr });

      if (rData) {
        setRoles(rData);
        setCache('/hr/roles', rData);
      }

      // Fetch leaves
      try {
        const leavesRes = await api.get<any>('/hr/leaves?status=approved').catch(() => []);
        const leavesList = Array.isArray(leavesRes) ? leavesRes : leavesRes.items || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeLeaves = leavesList.filter((l: any) => {
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          start.setHours(0,0,0,0);
          end.setHours(23,59,59,999);
          return today >= start && today <= end;
        });
        setOnLeaveCount(activeLeaves.length);
      } catch (err) {
        console.warn('Failed to fetch leaves:', err);
      }
    } catch (e) {
      console.error('[HRScreen] Failed to load HR users', e);
    }
  }, [isAdmin, setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAddEmployee = async () => {
    if (!newEmployee.fullName.trim() || !newEmployee.email.trim() || !newEmployee.password.trim()) {
      Alert.alert('Error', 'Name, Email, and Password are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/users/', {
        fullName: newEmployee.fullName.trim(),
        email: newEmployee.email.trim().toLowerCase(),
        password: newEmployee.password,
        roleId: newEmployee.roleId || null,
        managerId: newEmployee.managerId || null,
        highestQualification: newEmployee.highestQualification.trim() || null,
        joiningDate: newEmployee.joiningDate ? new Date(newEmployee.joiningDate).toISOString() : null,
        personalMobile: newEmployee.personalMobile.trim() || null,
        homeMobile: newEmployee.homeMobile.trim() || null,
        isActive: false // Force onboarding by submitting isActive: false
      });
      setAddModalVisible(false);
      setNewEmployee({
        fullName: '',
        email: '',
        password: '',
        roleId: '',
        managerId: '',
        highestQualification: '',
        joiningDate: '',
        personalMobile: '',
        homeMobile: ''
      });
      Alert.alert('Success', 'Employee created successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create employee');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (emp: any) => {
    setSelectedEmployee(emp);
    setEditForm({
      fullName: emp.fullName || emp.name || '',
      email: emp.email || '',
      roleId: emp.role?.id || emp.roleId || '',
      managerId: emp.managerId || '',
      personalMobile: emp.personalMobile || '',
      homeMobile: emp.homeMobile || '',
      highestQualification: emp.highestQualification || '',
      isActive: emp.isActive ?? true,
    });
    setEditModalVisible(true);
  };

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return;
    setEditSaving(true);
    try {
      await api.patch(`/users/${selectedEmployee.id}`, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim().toLowerCase(),
        roleId: editForm.roleId || null,
        managerId: editForm.managerId || null,
        personalMobile: editForm.personalMobile.trim() || null,
        homeMobile: editForm.homeMobile.trim() || null,
        highestQualification: editForm.highestQualification.trim() || null,
        isActive: editForm.isActive,
      });
      setEditModalVisible(false);
      Alert.alert('Success', 'Employee updated!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update employee');
    } finally {
      setEditSaving(false);
    }
  };

  const openLeaveModal = (emp: any) => {
    setSelectedEmployee(emp);
    const today = new Date().toISOString().split('T')[0];
    setLeaveForm({ startDate: today, endDate: today, reason: '', type: 'casual' });
    setLeaveModalVisible(true);
  };

  const handleMarkLeave = async () => {
    if (!selectedEmployee || !leaveForm.startDate || !leaveForm.endDate) {
      Alert.alert('Error', 'Start and end date are required.');
      return;
    }
    setLeaveSaving(true);
    try {
      await api.post('/hr/leaves', {
        userId: selectedEmployee.id,
        startDate: new Date(leaveForm.startDate).toISOString(),
        endDate: new Date(leaveForm.endDate).toISOString(),
        reason: leaveForm.reason.trim() || 'Leave marked by admin',
        type: leaveForm.type,
        status: 'approved',
      });
      setLeaveModalVisible(false);
      Alert.alert('Success', `Leave marked for ${selectedEmployee.fullName || selectedEmployee.name}`);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to mark leave');
    } finally {
      setLeaveSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Sidebar Component */}
        <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <View style={styles.header}>
          <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
            <Ionicons name="menu-outline" size={26} color={Colors.text} />
          </Pressable>
          <Text style={styles.title}>Access Denied</Text>
        </View>
        <View style={styles.empty}>
          <Ionicons name="lock-closed" size={48} color={Colors.error} />
          <Text style={styles.emptyText}>You do not have permission to view this screen.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Sidebar Component */}
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>HR/Employee management</Text>
        <View style={styles.headerRight}>
          <Pressable style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
            <Ionicons name="add" size={22} color={Colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Staff</Text>
          <Text style={styles.statVal}>{total}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active Now</Text>
          <Text style={[styles.statVal, { color: Colors.success }]}>{items.filter(u => u.isActive).length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>On Leave</Text>
          <Text style={[styles.statVal, { color: Colors.error }]}>{onLeaveCount}</Text>
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
            <Ionicons name="people-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No employees</Text>
          </View>
        }
        renderItem={({ item }) => {
          return (
            <Pressable 
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              onPress={() => openEditModal(item)}
            >
              <View style={styles.cardRow}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{(item.fullName || item.name || '?').charAt(0)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.fullName || item.name}</Text>
                  <Text style={styles.cardMeta}>{item.role?.name || item.role || 'No Role'} · {item.highestQualification || 'Qualification N/A'}</Text>
                  <Text style={styles.cardMeta}>{item.email} · {item.personalMobile || item.phone || 'No Phone'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={[styles.badge, { backgroundColor: item.isActive ? '#ECFDF5' : '#FEF2F2' }]}>
                    <Text style={[styles.badgeText, { color: item.isActive ? '#047857' : '#B91C1C' }]}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {/* ── Add Employee Modal ── */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Employee Account</Text>
              <Pressable onPress={() => setAddModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>FULL NAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. KARAN MEHRA"
                  placeholderTextColor={Colors.textLight}
                  value={newEmployee.fullName}
                  onChangeText={(val) => setNewEmployee({ ...newEmployee, fullName: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>EMAIL ADDRESS *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="karan@example.com"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={newEmployee.email}
                  onChangeText={(val) => setNewEmployee({ ...newEmployee, email: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PASSWORD *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor={Colors.textLight}
                  secureTextEntry
                  value={newEmployee.password}
                  onChangeText={(val) => setNewEmployee({ ...newEmployee, password: val })}
                />
              </View>

              <DropdownSelector
                label="Role *"
                placeholder="Choose role"
                options={roles.map(r => ({ label: r.name, value: r.id }))}
                selectedValue={newEmployee.roleId}
                onSelect={(val) => setNewEmployee(prev => ({ ...prev, roleId: val }))}
              />

              {(roles.find(r => r.id === newEmployee.roleId)?.name?.toUpperCase().includes('EXECUTIVE') || 
                roles.find(r => r.id === newEmployee.roleId)?.name?.toUpperCase().includes('SALES')) && (
                <DropdownSelector
                  label="Assign Manager *"
                  placeholder="Choose manager"
                  options={items.filter(u => {
                    const rName = u.role?.name?.toUpperCase() || '';
                    return rName === 'MANAGER' || rName === 'HR MANAGER';
                  }).map(m => ({ label: `${m.fullName} (${m.role?.name || 'Manager'})`, value: m.id }))}
                  selectedValue={newEmployee.managerId}
                  onSelect={(val) => setNewEmployee(prev => ({ ...prev, managerId: val }))}
                />
              )}

              <DatePickerSelector
                label="Joining Date"
                value={newEmployee.joiningDate}
                onChange={(val) => setNewEmployee(prev => ({ ...prev, joiningDate: val }))}
                placeholder="Select Joining Date"
              />

              <View style={styles.field}>
                <Text style={styles.label}>HIGHEST QUALIFICATION</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. MBA, B.Tech"
                  placeholderTextColor={Colors.textLight}
                  value={newEmployee.highestQualification}
                  onChangeText={(val) => setNewEmployee({ ...newEmployee, highestQualification: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PERSONAL MOBILE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit number"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="phone-pad"
                  value={newEmployee.personalMobile}
                  onChangeText={(val) => setNewEmployee({ ...newEmployee, personalMobile: val })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleAddEmployee} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Create Employee</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Edit Employee Modal ── */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Employee</Text>
              <Pressable onPress={() => setEditModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.field}>
                <Text style={styles.label}>FULL NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor={Colors.textLight}
                  value={editForm.fullName}
                  onChangeText={(val) => setEditForm(p => ({ ...p, fullName: val }))}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>EMAIL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={editForm.email}
                  onChangeText={(val) => setEditForm(p => ({ ...p, email: val }))}
                />
              </View>

              <DropdownSelector
                label="Role"
                placeholder="Choose role"
                options={roles.map(r => ({ label: r.name, value: r.id }))}
                selectedValue={editForm.roleId}
                onSelect={(val) => setEditForm(p => ({ ...p, roleId: val }))}
              />

              <DropdownSelector
                label="Manager"
                placeholder="Choose manager"
                searchable
                options={[
                  { label: 'None', value: '' },
                  ...items.filter(u => {
                    const rName = u.role?.name?.toUpperCase() || '';
                    return rName === 'MANAGER' || rName === 'HR MANAGER' || rName === 'ADMIN' || rName === 'SUPER ADMIN';
                  }).map(m => ({ label: `${m.fullName} (${m.role?.name || 'Manager'})`, value: m.id }))
                ]}
                selectedValue={editForm.managerId}
                onSelect={(val) => setEditForm(p => ({ ...p, managerId: val }))}
              />

              <View style={styles.field}>
                <Text style={styles.label}>PERSONAL MOBILE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit number"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="phone-pad"
                  value={editForm.personalMobile}
                  onChangeText={(val) => setEditForm(p => ({ ...p, personalMobile: val }))}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>HOME MOBILE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Home number"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="phone-pad"
                  value={editForm.homeMobile}
                  onChangeText={(val) => setEditForm(p => ({ ...p, homeMobile: val }))}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>HIGHEST QUALIFICATION</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. MBA, B.Tech"
                  placeholderTextColor={Colors.textLight}
                  value={editForm.highestQualification}
                  onChangeText={(val) => setEditForm(p => ({ ...p, highestQualification: val }))}
                />
              </View>

              {/* Active/Inactive Toggle */}
              <View style={styles.field}>
                <Text style={styles.label}>STATUS</Text>
                <View style={styles.toggleRow}>
                  <Pressable
                    style={[styles.toggleBtn, editForm.isActive && styles.toggleBtnActive]}
                    onPress={() => setEditForm(p => ({ ...p, isActive: true }))}
                  >
                    <Text style={[styles.toggleBtnText, editForm.isActive && styles.toggleBtnTextActive]}>Active</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.toggleBtn, !editForm.isActive && styles.toggleBtnInactive]}
                    onPress={() => setEditForm(p => ({ ...p, isActive: false }))}
                  >
                    <Text style={[styles.toggleBtnText, !editForm.isActive && styles.toggleBtnTextInactive]}>Inactive</Text>
                  </Pressable>
                </View>
              </View>

              {/* Action buttons */}
              <Pressable style={styles.submitBtn} onPress={handleEditEmployee} disabled={editSaving}>
                {editSaving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Save Changes</Text>
                )}
              </Pressable>

              <Pressable 
                style={[styles.submitBtn, { backgroundColor: Colors.warning, marginTop: Spacing.sm }]} 
                onPress={() => {
                  setEditModalVisible(false);
                  setTimeout(() => openLeaveModal(selectedEmployee), 300);
                }}
              >
                <Ionicons name="calendar-outline" size={18} color={Colors.white} style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>Mark Leave</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Mark Leave Modal ── */}
      <Modal
        visible={leaveModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLeaveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mark Leave — {selectedEmployee?.fullName || selectedEmployee?.name}</Text>
              <Pressable onPress={() => setLeaveModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <DropdownSelector
                label="Leave Type"
                placeholder="Choose type"
                options={[
                  { label: 'Casual Leave', value: 'casual' },
                  { label: 'Sick Leave', value: 'sick' },
                  { label: 'Paid Leave', value: 'paid' },
                  { label: 'Unpaid Leave', value: 'unpaid' },
                ]}
                selectedValue={leaveForm.type}
                onSelect={(val) => setLeaveForm(p => ({ ...p, type: val }))}
              />

              <DatePickerSelector
                label="Start Date *"
                value={leaveForm.startDate}
                onChange={(val) => setLeaveForm(p => ({ ...p, startDate: val }))}
                placeholder="Select start date"
              />

              <DatePickerSelector
                label="End Date *"
                value={leaveForm.endDate}
                onChange={(val) => setLeaveForm(p => ({ ...p, endDate: val }))}
                placeholder="Select end date"
              />

              <View style={styles.field}>
                <Text style={styles.label}>REASON</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Reason for leave..."
                  placeholderTextColor={Colors.textLight}
                  multiline
                  value={leaveForm.reason}
                  onChangeText={(val) => setLeaveForm(p => ({ ...p, reason: val }))}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleMarkLeave} disabled={leaveSaving}>
                {leaveSaving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Confirm Leave</Text>
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
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.white },
  cardName: { fontSize: FontSize.lg - 2, fontWeight: '800', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, alignSelf: 'flex-end' },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
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
  submitBtn: { backgroundColor: Colors.primary, height: 52, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl, flexDirection: 'row' },
  submitBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  toggleBtn: { flex: 1, height: 44, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface },
  toggleBtnActive: { backgroundColor: '#ECFDF5', borderColor: '#047857' },
  toggleBtnInactive: { backgroundColor: '#FEF2F2', borderColor: '#B91C1C' },
  toggleBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textMuted },
  toggleBtnTextActive: { color: '#047857', fontWeight: '700' },
  toggleBtnTextInactive: { color: '#B91C1C', fontWeight: '700' },
  statsContainer: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, backgroundColor: '#FFFFFF' },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  statLabel: { fontSize: FontSize.xs - 1, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  statVal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },

  // Dropdown selector styles
  dropdownField: { marginBottom: Spacing.md },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, height: 50, paddingHorizontal: Spacing.md, marginTop: 4 },
  dropdownTriggerText: { fontSize: FontSize.md, color: Colors.text, fontWeight: '500' },
  placeholderText: { color: Colors.textLight },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dropdownModalContent: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '85%', paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  dropdownModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownModalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  modalCloseBtn: { padding: Spacing.xs },
  dropdownSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceMuted || '#F1F5F9', borderRadius: BorderRadius.md, marginHorizontal: Spacing.lg, marginVertical: Spacing.sm, paddingHorizontal: Spacing.sm, height: 44 },
  searchIcon: { marginRight: Spacing.xs },
  dropdownSearchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, height: '100%' },
  searchClearBtn: { padding: Spacing.xs },
  optionsList: { paddingHorizontal: Spacing.lg },
  optionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceMuted || '#F1F5F9' },
  optionItemActive: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.sm },
  optionText: { fontSize: FontSize.md, color: Colors.text },
  optionTextActive: { color: Colors.primary, fontWeight: '600' },
  noOptionsText: { textAlign: 'center', color: Colors.textLight, paddingVertical: Spacing.xl, fontSize: FontSize.sm },
});
