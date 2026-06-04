import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCacheStore } from '../../src/store/cacheStore';
import Sidebar from '../../src/components/Sidebar';

const GROUP_LABELS: Record<string, string> = {
  auth: 'Authentication and security',
  role: 'Role and Permission Management',
  lead: 'Lead Management',
  rate: 'Rate Calculator',
  rto: 'RTO work management',
  vahan: 'Vahan Work Management',
  fitness: 'Fitness Work Management',
  claims: 'Claims Management',
  accounts: 'Accounts and Finance',
  hr: 'HR Management',
  loan: 'Loan department',
  crm: 'CRM System',
  visit: 'Customer Visit Module',
  data: 'Data Management',
  quotation: 'Quotation system',
  dashboard: 'Dashboard and analytics',
  notification: 'Notifications',
  template: 'Template (whatsapp/sms)',
  system: 'Admin panel/System Config',
  user: 'staff and user management',
};

const GROUP_ICONS: Record<string, string> = {
  auth: '🔐', role: '🛡️', user: '👥', lead: '📋', rate: '💰', rto: '🚗',
  vahan: '🚘', fitness: '🔧', claims: '📄', accounts: '💳', hr: '👥',
  loan: '🏦', crm: '🤝', visit: '📍', data: '🗄️',
  quotation: '📊', dashboard: '📈', notification: '🔔',
  template: '💬', system: '⚙️',
};

const GROUP_ORDER = [
  'auth', 'role', 'lead', 'rate', 'rto', 'vahan', 'fitness', 'claims',
  'accounts', 'hr', 'loan', 'crm', 'visit', 'data', 'quotation',
  'dashboard', 'notification', 'template', 'system', 'user'
];

const ACTION_LABELS: Record<string, string> = {
  // auth
  'auth.biometric_enable': 'Biometric Enable',
  'auth.login': 'Login',
  'auth.logout': 'Logout',
  'auth.pin_setup': 'Pin Setup',
  'auth.reset_access': 'Reset Access',
  'auth.session_manage': 'Session Manage',
  // role
  'role.assign_permissions': 'Assign Permission',
  'role.view': 'View',
  'role.create': 'Create',
  'role.delete': 'Delete',
  'role.edit': 'Edit',
  'role.manage_users': 'Manage Users',
  // lead
  'lead.assign': 'Assign',
  'lead.change_status': 'Change Status',
  'lead.create': 'Create',
  'lead.delete': 'Delete',
  'lead.edit': 'Edit',
  'lead.export': 'Export',
  'lead.import': 'Import',
  'lead.view': 'View',
  // rate
  'rate.calculate': 'Calculate',
  'rate.configure_tables': 'Configure Tables',
  'rate.edit_rules': 'Edit Rules',
  'rate.export': 'Export',
  'rate.manage_addons': 'Manage Addons',
  'rate.view': 'View',
  // rto
  'rto.track_payment': 'Track Payment',
  'rto.delete': 'Delete',
  'rto.create': 'Create',
  'rto.edit': 'Edit',
  'rto.update_status': 'Update Status',
  'rto.view': 'View',
  // vahan
  'vahan.create': 'Create',
  'vahan.delete': 'Delete',
  'vahan.edit': 'Edit',
  'vahan.track_payment': 'Track Payment',
  'vahan.update_status': 'Update Status',
  'vahan.view': 'View',
  // fitness
  'fitness.create': 'Create',
  'fitness.edit': 'Edit',
  'fitness.update_status': 'Update Status',
  'fitness.delete': 'Delete',
  'fitness.track_payment': 'Track Payment',
  'fitness.view': 'View',
  // claims
  'claims.create': 'Create',
  'claims.edit': 'Edit',
  'claims.upload_documents': 'Upload Document',
  'claims.delete': 'Delete',
  'claims.update_status': 'Update Status',
  'claims.view': 'View',
  // accounts
  'accounts.create_entry': 'Create Entry',
  'accounts.delete_entry': 'Delete Entry',
  'accounts.edit_entry': 'Edit Entry',
  'accounts.export': 'Export',
  'accounts.manage_salary': 'Manage Salary',
  'accounts.view': 'View',
  'accounts.view_reports': 'View Reports',
  // hr
  'hr.create': 'Create',
  'hr.delete': 'Delete',
  'hr.edit': 'Edit',
  'hr.manage_attendance': 'Manage Attendance',
  'hr.manage_leave': 'Manage Leave',
  'hr.view': 'View',
  'hr.view_performance': 'View Performance',
  // loan
  'loan.create': 'Create',
  'loan.delete': 'Delete',
  'loan.edit': 'Edit',
  'loan.track_conversion': 'Track Conversion',
  'loan.update_status': 'Update Status',
  'loan.view': 'View',
  // crm
  'crm.create': 'Create',
  'crm.delete': 'Delete',
  'crm.edit': 'Edit',
  'crm.manage_followups': 'Manage Followups',
  'crm.view': 'View',
  'crm.view_revenue': 'View Revenue',
  // visit
  'visit.create': 'Create',
  'visit.edit': 'Edit',
  'visit.track_location': 'Track Location',
  'visit.delete': 'Delete',
  'visit.manage_followups': 'Manage Followups',
  'visit.view': 'View',
  // data
  'data.approve_changes': 'Approve Changes',
  'data.create': 'Create',
  'data.delete': 'Delete',
  'data.edit': 'Edit',
  'data.manage_documents': 'Manage Documentation',
  'data.view': 'View',
  // quotation
  'quotation.create': 'Create',
  'quotation.delete': 'Delete',
  'quotation.edit': 'Edit',
  'quotation.generate_pdf': 'Generate PDF',
  'quotation.view': 'View',
  'quotation.share': 'Share',
  'quotation.approve': 'Approve',
  // dashboard
  'dashboard.export': 'Export',
  'dashboard.view_admin': 'View Admin',
  'dashboard.view_agent': 'View Agent',
  'dashboard.view_manager': 'View Manager',
  // notification
  'notification.configure': 'Configure',
  'notification.manage': 'Manage',
  'notification.send': 'Send',
  'notification.view': 'View',
  // template
  'template.create': 'Create',
  'template.delete': 'Delete',
  'template.edit': 'Edit',
  'template.view': 'View',
  // system
  'system.audit_logs_view': 'Audit Logs View',
  'system.settings_manage': 'Settings Manage',
  'system.view': 'View Settings',
  // user
  'user.create': 'Create',
  'user.edit': 'Edit',
  'user.delete': 'Delete',
  'user.view': 'View'
};

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
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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

  // Group and unify duplicate permissions
  const unifiedPermissions = React.useMemo(() => {
    const map: Record<string, {
      key: string;
      displayName: string;
      group: string;
      ids: string[];
      names: string[];
      description: string;
    }> = {};

    permissions.forEach(p => {
      const parts = p.name.split('.');
      let group = parts[0];
      let action = parts.slice(1).join('.');

      // Normalize group names to merge duplicates
      if (group === 'leads') group = 'lead';
      if (group === 'quotations') group = 'quotation';
      if (group === 'roles') group = 'role';
      if (group === 'settings') group = 'system';
      if (group === 'users') group = 'user';

      // Normalize action names
      if (action === 'settings_manage' || action === 'manage') {
        if (group === 'system' || group === 'setting') {
          action = 'settings_manage';
        }
        if (group === 'role') {
          action = 'manage_users';
        }
      }

      const key = `${group}.${action}`;

      if (!map[key]) {
        map[key] = {
          key,
          displayName: ACTION_LABELS[key] || action.replace(/_/g, ' '),
          group,
          ids: [],
          names: [],
          description: p.description || ''
        };
      }

      map[key].ids.push(p.id);
      map[key].names.push(p.name);
    });

    return Object.values(map);
  }, [permissions]);

  // Build permission groups
  const groups = React.useMemo(() => {
    const map: Record<string, any[]> = {};
    unifiedPermissions.forEach(p => {
      const g = p.group;
      if (!map[g]) map[g] = [];
      map[g].push(p);
    });
    return map;
  }, [unifiedPermissions]);

  const orderedGroups = React.useMemo(() => {
    return [
      ...GROUP_ORDER.filter(g => groups[g]),
      ...Object.keys(groups).filter(g => !GROUP_ORDER.includes(g)),
    ];
  }, [groups]);

  const handleEditRole = (role: any) => {
    setSelectedRole(role);
    // Find permission IDs for the role based on permission names
    const activeIds: string[] = [];
    role.permissions?.forEach((rp: any) => {
      const match = permissions.find(p => p.name === rp.name);
      if (match) {
        activeIds.push(match.id);
      }
    });
    setRolePermissions(activeIds);
    setExpandedGroups({});
    setEditModalVisible(true);
  };

  const toggleUnifiedPermission = (p: any) => {
    const allOn = p.ids.every((id: string) => rolePermissions.includes(id));
    setRolePermissions(prev => {
      if (allOn) {
        return prev.filter(id => !p.ids.includes(id));
      } else {
        return [...new Set([...prev, ...p.ids])];
      }
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await api.patch(`/roles/${selectedRole.id}`, {
        permissionIds: rolePermissions
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
              {orderedGroups.map((group) => {
                const groupPerms = groups[group] || [];
                const isExpanded = expandedGroups[group] || false;
                const selectedCount = groupPerms.filter((p: any) => p.ids.every((id: string) => rolePermissions.includes(id))).length;
                const allOn = selectedCount === groupPerms.length && groupPerms.length > 0;

                return (
                  <View key={group} style={styles.groupContainer}>
                    {/* Group Header */}
                    <Pressable
                      style={styles.groupHeader}
                      onPress={() => setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }))}
                    >
                      <View style={styles.groupHeaderLeft}>
                        <Text style={styles.groupIcon}>{GROUP_ICONS[group] || '🔧'}</Text>
                        <View style={{ marginLeft: Spacing.sm }}>
                          <Text style={styles.groupLabel}>{GROUP_LABELS[group] || group}</Text>
                          <Text style={styles.groupCountText}>
                            {selectedCount} of {groupPerms.length} active
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                        <Pressable
                          style={[styles.groupSelectAllBtn, allOn && styles.groupSelectAllBtnActive]}
                          onPress={() => {
                            const allIds = groupPerms.flatMap((p: any) => p.ids);
                            setRolePermissions(prev => {
                              if (allOn) {
                                return prev.filter(id => !allIds.includes(id));
                              } else {
                                return [...new Set([...prev, ...allIds])];
                              }
                            });
                          }}
                        >
                          <Text style={[styles.groupSelectAllText, allOn && styles.groupSelectAllTextActive]}>
                            {allOn ? 'Clear' : 'All'}
                          </Text>
                        </Pressable>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={18}
                          color={Colors.textMuted}
                        />
                      </View>
                    </Pressable>

                    {/* Group Items */}
                    {isExpanded && (
                      <View style={styles.groupItems}>
                        {groupPerms.map((p: any) => {
                          const on = p.ids.every((id: string) => rolePermissions.includes(id));
                          return (
                            <Pressable
                              key={p.key}
                              style={styles.permRow}
                              onPress={() => toggleUnifiedPermission(p)}
                            >
                              <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                                <Text style={styles.permName}>{p.displayName}</Text>
                                <Text style={styles.permDesc}>{p.description || 'No description'}</Text>
                              </View>
                              <Switch
                                value={on}
                                onValueChange={() => toggleUnifiedPermission(p)}
                                trackColor={{ false: '#E2E8F0', true: Colors.primary + '60' }}
                                thumbColor={on ? Colors.primary : '#94A3B8'}
                              />
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}

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

  // Group styles
  groupContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: '#FAFAFA',
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupIcon: {
    fontSize: FontSize.lg,
  },
  groupLabel: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
  },
  groupCountText: {
    fontSize: FontSize.xs - 1,
    color: Colors.textMuted,
    marginTop: 2,
  },
  groupSelectAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryLight,
  },
  groupSelectAllBtnActive: {
    backgroundColor: Colors.primary,
  },
  groupSelectAllText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
  },
  groupSelectAllTextActive: {
    color: '#FFFFFF',
  },
  groupItems: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    backgroundColor: '#FFFFFF',
  },
});
