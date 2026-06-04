import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCacheStore } from '../../src/store/cacheStore';
import Sidebar from '../../src/components/Sidebar';

export default function RolesScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();

  const [roles, setRoles] = useState<any[]>(cache['/roles'] || []);
  const [permissions, setPermissions] = useState<any[]>(cache['/permissions'] || []);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Edit Role Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<Record<string, boolean>>({});

  // Load cache on mount
  useEffect(() => {
    loadCache().then(() => {
      if (cache['/roles']) setRoles(cache['/roles']);
      if (cache['/permissions']) setPermissions(cache['/permissions']);
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const [rData, pData] = await Promise.all([
        api.get<any[]>('/roles'),
        api.get<any[]>('/permissions')
      ]);
      setRoles(rData);
      setPermissions(pData);
      setCache('/roles', rData);
      setCache('/permissions', pData);
    } catch (e) {
      console.error('[RolesScreen] Failed to load roles & permissions', e);
    }
  }, [setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleEditRole = (role: any) => {
    setSelectedRole(role);
    const initialPermMap: Record<string, boolean> = {};
    permissions.forEach(p => {
      initialPermMap[p.id] = role.permissions?.some((rp: any) => rp.name === p.name) || false;
    });
    setSelectedPermIds(initialPermMap);
    setEditModalVisible(true);
  };

  const handleTogglePermission = (permId: string) => {
    setSelectedPermIds(prev => ({
      ...prev,
      [permId]: !prev[permId]
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const activeIds = Object.keys(selectedPermIds).filter(id => selectedPermIds[id]);
      await api.patch(`/roles/${selectedRole.id}`, {
        permissionIds: activeIds
      });
      setEditModalVisible(false);
      Alert.alert('Success', 'Role permissions updated successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update permissions');
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
        <Text style={styles.title}>Roles & Permissions</Text>
      </View>

      {/* List */}
      <FlatList 
        data={roles} 
        keyExtractor={i => i.id} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="ribbon-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No roles found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>{item.description || 'No description provided.'}</Text>
              </View>
              <Pressable style={styles.editBtn} onPress={() => handleEditRole(item)}>
                <Ionicons name="create-outline" size={20} color={Colors.primary} />
              </Pressable>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.badge}>
                <Ionicons name="people-outline" size={12} color={Colors.primary} />
                <Text style={styles.badgeText}>{item._count?.users || 0} Staff</Text>
              </View>
              <View style={styles.badge}>
                <Ionicons name="key-outline" size={12} color={Colors.success} />
                <Text style={[styles.badgeText, { color: Colors.success }]}>{item.permissions?.length || 0} Rules</Text>
              </View>
            </View>
          </View>
        )}
      />

      {/* ── Edit Permissions Modal ── */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Edit Rules: {selectedRole?.name}</Text>
                <Text style={styles.modalSubtitle}>Toggle security policies for this staff role</Text>
              </View>
              <Pressable onPress={() => setEditModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {permissions.map((p) => (
                <View key={p.id} style={styles.permRow}>
                  <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                    <Text style={styles.permName}>{p.name}</Text>
                    <Text style={styles.permDesc}>{p.description || 'No description'}</Text>
                  </View>
                  <Switch 
                    value={selectedPermIds[p.id] || false}
                    onValueChange={() => handleTogglePermission(p.id)}
                    trackColor={{ false: '#E2E8F0', true: Colors.primary + '60' }}
                    thumbColor={selectedPermIds[p.id] ? Colors.primary : '#94A3B8'}
                  />
                </View>
              ))}

              <View style={{ height: Spacing.xl }} />

              <Pressable style={styles.submitBtn} onPress={handleSavePermissions} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Save Policy Changes</Text>
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
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: FontSize.lg - 2, fontWeight: '800', color: Colors.text },
  cardSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4, lineHeight: 18 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  cardFooter: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '80%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  modalSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  closeBtn: { padding: Spacing.xs },
  modalBody: { flex: 1, marginTop: Spacing.lg },
  permRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  permName: { fontSize: FontSize.md - 1, fontWeight: '700', color: Colors.text },
  permDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  submitBtn: { backgroundColor: Colors.primary, height: 52, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xl },
  submitBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
});
