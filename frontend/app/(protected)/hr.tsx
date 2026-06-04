import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import Sidebar from '../../src/components/Sidebar';
import { useCacheStore } from '../../src/store/cacheStore';

export default function HRScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { cache, setCache, loadCache } = useCacheStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<any[]>(cache['/users/'] || []);
  const [total, setTotal] = useState(items.length);
  const [refreshing, setRefreshing] = useState(false);

  // Add Employee Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    roleId: '',
    personalMobile: '',
    highestQualification: ''
  });

  const roleUpper = user?.role?.toUpperCase();
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN';

  useEffect(() => {
    loadCache().then(() => {
      if (cache['/users/']) {
        setItems(cache['/users/']);
        setTotal(cache['/users/'].length);
      }
    });
  }, []);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await api.get<any[]>('/users/');
      const arr = Array.isArray(data) ? data : (data as any).items || [];
      setItems(arr);
      setTotal(arr.length);
      setCache('/users/', arr);
    } catch {}
  }, [isAdmin, setCache]);

  const loadRoles = async () => {
    try {
      const data = await api.get<any[]>('/roles');
      setRoles(data || []);
      if (data && data.length > 0) {
        setForm(prev => ({ ...prev, roleId: data[0].id }));
      }
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleCreate = async () => {
    if (!form.fullName || !form.email || !form.password) {
      Alert.alert('Error', 'Full Name, Email, and Password are required.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/users/', {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        roleId: form.roleId || null,
        personalMobile: form.personalMobile,
        highestQualification: form.highestQualification
      });
      setModalOpen(false);
      Alert.alert('Success', 'Employee added successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add employee');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
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
        <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>HR / Employees</Text>
        <Text style={styles.count}>{total}</Text>
        <Pressable style={styles.addBtn} onPress={() => {
          setForm({
            fullName: '',
            email: '',
            password: '',
            roleId: '',
            personalMobile: '',
            highestQualification: ''
          });
          loadRoles();
          setModalOpen(true);
        }}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id || Math.random().toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No employees</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = StatusColors[item.status] || StatusColors.active;
          return (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(item.fullName || item.name || '?').charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.fullName || item.name}</Text>
                  <Text style={styles.cardMeta}>
                    {item.role?.name || item.role || 'No Role'} · {item.department || 'General'}
                  </Text>
                  <Text style={styles.cardMeta}>{item.email} · {item.personalMobile || item.phone || 'No Mobile'}</Text>
                </View>
                <View>
                  <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.badgeText, { color: sc.text }]}>{item.status || 'Active'}</Text>
                  </View>
                  <Text style={styles.salary}>₹{(item.salary || 0).toLocaleString()}/mo</Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Add Employee Modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Employee</Text>
              <Pressable onPress={() => setModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>FULL NAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ramesh Patil"
                  value={form.fullName}
                  onChangeText={v => setForm({ ...form, fullName: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>EMAIL ADDRESS *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="e.g. ramesh@example.com"
                  value={form.email}
                  onChangeText={v => setForm({ ...form, email: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PASSWORD *</Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  placeholder="Minimum 6 characters"
                  value={form.password}
                  onChangeText={v => setForm({ ...form, password: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>ROLE</Text>
                <View style={styles.typeSelector}>
                  {roles.map(r => (
                    <Pressable
                      key={r.id}
                      style={[styles.typeOption, form.roleId === r.id && styles.typeOptionActive]}
                      onPress={() => setForm({ ...form, roleId: r.id })}
                    >
                      <Text style={[styles.typeOptionText, form.roleId === r.id && styles.typeOptionTextActive]}>
                        {r.name}
                      </Text>
                    </Pressable>
                  ))}
                  {roles.length === 0 && (
                    <Text style={styles.noPerms}>Loading roles...</Text>
                  )}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>MOBILE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  placeholder="e.g. 9876543210"
                  value={form.personalMobile}
                  onChangeText={v => setForm({ ...form, personalMobile: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>HIGHEST QUALIFICATION</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. MBA, B.Tech"
                  value={form.highestQualification}
                  onChangeText={v => setForm({ ...form, highestQualification: v })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleCreate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Add Employee</Text>}
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
  menuBtn: { padding: Spacing.xs },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  count: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary, backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.md, paddingVertical: 2, borderRadius: BorderRadius.sm },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.lg },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.white },
  cardName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, alignSelf: 'flex-end' },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  salary: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginTop: Spacing.xs, textAlign: 'right' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, fontWeight: '600', textAlign: 'center', paddingHorizontal: Spacing.xl },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '80%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  closeBtn: { padding: Spacing.xs },
  modalBody: { flex: 1, marginTop: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight, letterSpacing: 1, marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, height: 48, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, padding: 4, gap: 4 },
  typeOption: { minWidth: 80, height: 38, justifyContent: 'center', alignItems: 'center', borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm },
  typeOptionActive: { backgroundColor: Colors.primaryLight },
  typeOptionText: { fontSize: FontSize.sm - 1, fontWeight: '700', color: Colors.textLight, textTransform: 'capitalize' },
  typeOptionTextActive: { color: Colors.primary, fontWeight: '800' },
  noPerms: { fontSize: FontSize.sm, color: Colors.textLight, fontStyle: 'italic', padding: Spacing.sm },
  submitBtn: { backgroundColor: Colors.primary, height: 48, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.xl },
  submitBtnText: { color: Colors.white, fontWeight: '800', fontSize: FontSize.md }
});

