import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, RefreshControl, Modal, Switch, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import { useCacheStore } from '../../src/store/cacheStore';

export default function LeadResponsesScreen() {
  const { cache, setCache } = useCacheStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<any[]>(cache['/settings/responses'] || []);
  const [refreshing, setRefreshing] = useState(false);

  // Edit/Add Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    text: '',
    isActive: true,
    requiresFollowUp: false
  });

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/settings/responses');
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);
      setCache('/settings/responses', arr);
    } catch (e) {
      console.error('[LeadResponsesScreen] Failed to load responses', e);
    }
  }, [setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  
  const onRefresh = async () => { 
    setRefreshing(true); 
    await load(); 
    setRefreshing(false); 
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm({ text: '', isActive: true, requiresFollowUp: false });
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setForm({
      text: item.text,
      isActive: item.isActive,
      requiresFollowUp: item.requiresFollowUp
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.text.trim()) {
      Alert.alert('Error', 'Predefined response text cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Edit response
        await api.put(`/settings/responses/${editingId}`, form);
      } else {
        // Create response
        await api.post('/settings/responses', form);
      }
      setModalOpen(false);
      Alert.alert('Success', `Response ${editingId ? 'updated' : 'added'} successfully!`);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save response');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: any) => {
    try {
      await api.put(`/settings/responses/${item.id}`, {
        isActive: !item.isActive
      });
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this response?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/settings/responses/${id}`);
              load();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete response');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Lead Responses</Text>
      </View>

      <FlatList 
        data={items} 
        keyExtractor={i => i.id} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbox-ellipses-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No responses configured</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardMain}>
              <Text style={styles.responseGuj}>{item.text}</Text>
              <View style={styles.statusRow}>
                <Text style={styles.followupTag}>
                  {item.requiresFollowUp ? '• Requires Follow-up' : '• Instant Resolution'}
                </Text>
                <Pressable 
                  style={[styles.badge, { backgroundColor: item.isActive ? Colors.successBg : Colors.errorBg }]}
                  onPress={() => toggleActive(item)}
                >
                  <Text style={[styles.badgeText, { color: item.isActive ? Colors.success : Colors.error }]}>
                    {item.isActive ? 'Active' : 'Disabled'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.cardActions}>
              <Pressable style={styles.editBtn} onPress={() => openEditModal(item)}>
                <Ionicons name="pencil" size={16} color={Colors.primary} />
              </Pressable>
              <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash" size={16} color={Colors.error} />
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* FAB */}
      <Pressable style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </Pressable>

      {/* Modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Predefined Response' : 'Add Predefined Response'}
              </Text>
              <Pressable onPress={() => setModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.field}>
                <Text style={styles.label}>RESPONSE TEXT (GUJARATI) *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="કોલ રિસીવ નથી કરતા..." 
                  placeholderTextColor={Colors.textLight} 
                  value={form.text}
                  onChangeText={v => setForm({ ...form, text: v })}
                />
              </View>

              <View style={styles.switchField}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Requires Follow-up Task</Text>
                  <Text style={styles.switchDesc}>
                    Does choosing this response require employee to log a future call date?
                  </Text>
                </View>
                <Switch 
                  value={form.requiresFollowUp} 
                  onValueChange={v => setForm({ ...form, requiresFollowUp: v })}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.switchField}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Is Response Active</Text>
                  <Text style={styles.switchDesc}>
                    Disabled responses are hidden from the employee dropdown list.
                  </Text>
                </View>
                <Switch 
                  value={form.isActive} 
                  onValueChange={v => setForm({ ...form, isActive: v })}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{editingId ? 'Update' : 'Add'} Response</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: '#FFFFFF', gap: Spacing.md },
  menuBtn: { padding: Spacing.xs },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.lg, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  cardMain: { flex: 1, gap: 4 },
  responseGuj: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  followupTag: { fontSize: FontSize.xs, color: Colors.textMuted },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: 9, fontWeight: '800' },
  cardActions: { gap: Spacing.sm, paddingLeft: Spacing.md, borderLeftWidth: 1, borderLeftColor: Colors.border },
  editBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.errorBg, justifyContent: 'center', alignItems: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '70%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  closeBtn: { padding: Spacing.xs },
  modalBody: { flex: 1, marginTop: Spacing.lg },
  field: { marginBottom: Spacing.xl },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight, letterSpacing: 1, marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, height: 48, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  switchField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border + '50' },
  switchLabel: { fontSize: FontSize.md - 1, fontWeight: '700', color: Colors.text },
  switchDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1, paddingRight: Spacing.lg },
  submitBtn: { backgroundColor: Colors.primary, height: 50, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.lg },
  submitBtnText: { color: Colors.white, fontWeight: '800', fontSize: FontSize.md }
});
