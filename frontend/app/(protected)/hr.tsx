import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useCacheStore } from '../../src/store/cacheStore';
import Sidebar from '../../src/components/Sidebar';

export default function HRScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { cache, setCache, loadCache } = useCacheStore();

  const [items, setItems] = useState<any[]>(cache['/hr/users']?.items || []);
  const [total, setTotal] = useState(cache['/hr/users']?.items?.length || 0);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    personalMobile: '',
    homeMobile: ''
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
        personalMobile: newEmployee.personalMobile.trim() || null,
        homeMobile: newEmployee.homeMobile.trim() || null
      });
      setAddModalVisible(false);
      setNewEmployee({
        fullName: '',
        email: '',
        password: '',
        roleId: '',
        managerId: '',
        highestQualification: '',
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
        <Text style={styles.title}>HR / Employees</Text>
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
            <Ionicons name="people-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No employees</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = item.isActive ? StatusColors.active : StatusColors.inactive || StatusColors.pending;
          return (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{(item.fullName || item.name || '?').charAt(0)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.fullName || item.name}</Text>
                  <Text style={styles.cardMeta}>{item.role?.name || item.role || 'No Role'} · {item.highestQualification || 'Qualification N/A'}</Text>
                  <Text style={styles.cardMeta}>{item.email} · {item.personalMobile || item.phone || 'No Phone'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[styles.badge, { backgroundColor: item.isActive ? '#ECFDF5' : '#FEF2F2' }]}>
                    <Text style={[styles.badgeText, { color: item.isActive ? '#047857' : '#B91C1C' }]}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
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

              <View style={styles.field}>
                <Text style={styles.label}>ROLE ID (OPTIONAL UUID)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Paste Role UUID"
                  placeholderTextColor={Colors.textLight}
                  value={newEmployee.roleId}
                  onChangeText={(val) => setNewEmployee({ ...newEmployee, roleId: val })}
                />
                <Text style={styles.hint}>Available Roles: {roles.map(r => `${r.name} (${r.id.substring(0, 4)}...)`).join(', ')}</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>MANAGER ID (OPTIONAL UUID)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Paste Manager User UUID"
                  placeholderTextColor={Colors.textLight}
                  value={newEmployee.managerId}
                  onChangeText={(val) => setNewEmployee({ ...newEmployee, managerId: val })}
                />
              </View>

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
  submitBtn: { backgroundColor: Colors.primary, height: 52, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl },
  submitBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
});
