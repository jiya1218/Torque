import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCacheStore } from '../../src/store/cacheStore';
import Sidebar from '../../src/components/Sidebar';

export default function PredefinedResponsesScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();

  const [items, setItems] = useState<any[]>(cache['/settings/responses']?.items || []);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Add/Edit Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formText, setFormText] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formReqFollowUp, setFormReqFollowUp] = useState(false);

  // Load cache on mount
  useEffect(() => {
    loadCache().then(() => {
      const cached = cache['/settings/responses'];
      if (cached && cached.items) {
        setItems(cached.items);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/settings/responses');
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);
      setCache('/settings/responses', { items: arr });
    } catch (e) {
      console.error('[PredefinedResponsesScreen] Failed to load responses', e);
    }
  }, [setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormText('');
    setFormIsActive(true);
    setFormReqFollowUp(false);
    setModalVisible(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingId(item.id);
    setFormText(item.text);
    setFormIsActive(item.isActive);
    setFormReqFollowUp(item.requiresFollowUp);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formText.trim()) {
      Alert.alert('Error', 'Response text is required.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/settings/responses/${editingId}`, {
          text: formText.trim(),
          isActive: formIsActive,
          requiresFollowUp: formReqFollowUp
        });
        Alert.alert('Success', 'Predefined response updated successfully!');
      } else {
        await api.post('/settings/responses', {
          text: formText.trim(),
          isActive: formIsActive,
          requiresFollowUp: formReqFollowUp
        });
        Alert.alert('Success', 'Predefined response added successfully!');
      }
      setModalVisible(false);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save predefined response');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Response',
      'Are you sure you want to delete this predefined response?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/settings/responses/${id}`);
              Alert.alert('Success', 'Predefined response deleted.');
              load();
            } catch {
              Alert.alert('Error', 'Failed to delete predefined response.');
            }
          }
        }
      ]
    );
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
        <Text style={styles.title}>Lead Responses</Text>
        <Pressable style={styles.addBtn} onPress={handleOpenAddModal}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      {/* List */}
      <FlatList 
        data={items} 
        keyExtractor={i => i.id} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="settings-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No lead responses found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                <Text style={styles.responseText}>{item.text}</Text>
                
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: item.isActive ? '#ECFDF5' : '#F1F5F9' }]}>
                    <Text style={[styles.badgeText, { color: item.isActive ? '#047857' : '#64748B' }]}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  {item.requiresFollowUp ? (
                    <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
                      <Text style={[styles.badgeText, { color: Colors.primary }]}>
                        Requires Follow-up
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.actions}>
                <Pressable style={styles.actionBtn} onPress={() => handleOpenEditModal(item)}>
                  <Ionicons name="create-outline" size={18} color={Colors.primary} />
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      {/* ── Add / Edit Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Predefined Response' : 'Add Predefined Response'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>RESPONSE TEXT * (GUJARATI/ENGLISH)</Text>
                <TextInput
                  style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: Spacing.sm }]}
                  placeholder="e.g. વ્યાજ દર વિશે પૂછપરછ (Inquiry about interest rate)"
                  placeholderTextColor={Colors.textLight}
                  multiline
                  numberOfLines={4}
                  value={formText}
                  onChangeText={setFormText}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Is Active</Text>
                  <Text style={styles.toggleDesc}>Whether this response shows up in list selection</Text>
                </View>
                <Switch 
                  value={formIsActive}
                  onValueChange={setFormIsActive}
                  trackColor={{ false: '#E2E8F0', true: Colors.primary + '60' }}
                  thumbColor={formIsActive ? Colors.primary : '#94A3B8'}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Requires Follow-up</Text>
                  <Text style={styles.toggleDesc}>Automatically schedules a follow-up task when selected</Text>
                </View>
                <Switch 
                  value={formReqFollowUp}
                  onValueChange={setFormReqFollowUp}
                  trackColor={{ false: '#E2E8F0', true: Colors.primary + '60' }}
                  thumbColor={formReqFollowUp ? Colors.primary : '#94A3B8'}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Save Response</Text>
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
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  responseText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, lineHeight: 22 },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: Spacing.xs },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '70%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  closeBtn: { padding: Spacing.xs },
  modalBody: { flex: 1, marginTop: Spacing.lg },
  field: { marginBottom: Spacing.lg },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  toggleLabel: { fontSize: FontSize.md - 1, fontWeight: '700', color: Colors.text },
  toggleDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, paddingRight: Spacing.sm },
  submitBtn: { backgroundColor: Colors.primary, height: 52, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.xl },
  submitBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
});
