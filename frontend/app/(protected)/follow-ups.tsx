import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert, StatusBar, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCacheStore } from '../../src/store/cacheStore';
import Sidebar from '../../src/components/Sidebar';
import AppFooter from '../../src/components/AppFooter';

export default function FollowUpsScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();

  const [items, setItems] = useState<any[]>(cache['/follow-ups']?.items || []);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Add Follow-up Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({
    lead_name: '',
    type: 'call',
    scheduled_at: '',
    notes: ''
  });

  // Load cache on mount
  useEffect(() => {
    loadCache().then(() => {
      const cached = cache['/follow-ups'];
      if (cached && cached.items) {
        setItems(cached.items);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>(`/follow-ups?status=${filter}`);
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);
      setCache('/follow-ups', { items: arr });
    } catch {
      console.error('[FollowUpsScreen] Failed to load follow-ups');
    }
  }, [filter, setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleComplete = async (item: any) => {
    Alert.alert(
      'Complete Task',
      `Are you sure you want to mark follow-up for ${item.leadName || item.lead?.clientName || 'this lead'} as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: async () => {
            try {
              await api.patch(`/follow-ups/${item.id}`, { status: 'completed' });
              Alert.alert('Success', 'Follow-up marked as completed.');
              load();
            } catch {
              Alert.alert('Error', 'Failed to update follow-up status.');
            }
          },
        },
      ]
    );
  };

  const handleAddFollowUp = async () => {
    if (!newFollowUp.lead_name.trim() || !newFollowUp.scheduled_at) {
      Alert.alert('Error', 'Lead Name and Scheduled Date & Time are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/follow-ups', {
        lead_name: newFollowUp.lead_name.trim(),
        type: newFollowUp.type,
        scheduled_at: new Date(newFollowUp.scheduled_at).toISOString(),
        notes: newFollowUp.notes.trim() || null
      });
      setAddModalVisible(false);
      setNewFollowUp({ lead_name: '', type: 'call', scheduled_at: '', notes: '' });
      Alert.alert('Success', 'Follow-up scheduled successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to schedule follow-up');
    } finally {
      setSaving(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'call': return { name: 'call-outline' as const, color: '#3b82f6', bg: '#eff6ff' };
      case 'whatsapp': return { name: 'logo-whatsapp' as const, color: '#10b981', bg: '#ecfdf5' };
      case 'visit': return { name: 'location-outline' as const, color: '#ef4444', bg: '#fff1f2' };
      default: return { name: 'checkbox-outline' as const, color: '#8b5cf6', bg: '#f5f3ff' };
    }
  };

  const getStatusStyle = (status: string) => {
    const key = status?.toLowerCase() || 'pending';
    return StatusColors[key] || StatusColors.pending;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Sidebar Component */}
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Follow-ups</Text>
        <Pressable style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['pending', 'completed', 'all'] as const).map((f) => {
          const active = filter === f;
          return (
            <Pressable key={f} style={[styles.filterTab, active && styles.filterTabActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={52} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No scheduled follow-ups</Text>
            <Text style={styles.emptyText}>Tasks matching &quot;{filter}&quot; will appear here</Text>
          </View>
        }
        renderItem={({ item }) => {
          const typeStyle = getTypeIcon(item.type);
          const statStyle = getStatusStyle(item.status);
          const scheduledDate = new Date(item.scheduledAt);

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.leadInfo}>
                  <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg }]}>
                    <Ionicons name={typeStyle.name} size={16} color={typeStyle.color} />
                  </View>
                  <View>
                    <Text style={styles.leadName}>{item.leadName || item.lead?.clientName || 'Unnamed Lead'}</Text>
                    <Text style={styles.typeText}>{item.type?.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statStyle.bg, borderColor: statStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statStyle.text }]}>{item.status?.toUpperCase()}</Text>
                </View>
              </View>

              {item.notes ? (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesText} numberOfLines={3}>&quot;{item.notes}&quot;</Text>
                </View>
              ) : null}

              <View style={styles.cardFooter}>
                <View style={styles.timeContainer}>
                  <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.timeText}>
                    {scheduledDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                    {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {item.status === 'pending' ? (
                  <Pressable style={({ pressed }) => [styles.completeBtn, pressed && styles.completeBtnPressed]} onPress={() => handleComplete(item)}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.completeBtnText}>Complete</Text>
                  </Pressable>
                ) : (
                  item.completedAt && (
                    <View style={styles.completedAtContainer}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                      <Text style={styles.completedAtText}>Done</Text>
                    </View>
                  )
                )}
              </View>
            </View>
          );
        }}
      />

      {/* ── Add Follow-up Modal ── */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Follow-up</Text>
              <Pressable onPress={() => setAddModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>LEAD / CLIENT NAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. MEHRA KARAN"
                  placeholderTextColor={Colors.textLight}
                  value={newFollowUp.lead_name}
                  onChangeText={(val) => setNewFollowUp({ ...newFollowUp, lead_name: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>FOLLOW-UP TYPE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. call, whatsapp, visit"
                  placeholderTextColor={Colors.textLight}
                  value={newFollowUp.type}
                  onChangeText={(val) => setNewFollowUp({ ...newFollowUp, type: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>SCHEDULE DATE & TIME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2026-06-15T10:00:00Z"
                  placeholderTextColor={Colors.textLight}
                  value={newFollowUp.scheduled_at}
                  onChangeText={(val) => setNewFollowUp({ ...newFollowUp, scheduled_at: val })}
                />
                <Text style={styles.hint}>Format: YYYY-MM-DDTHH:MM:SSZ</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>NOTES / REMARKS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Add details of the follow-up..."
                  placeholderTextColor={Colors.textLight}
                  value={newFollowUp.notes}
                  onChangeText={(val) => setNewFollowUp({ ...newFollowUp, notes: val })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleAddFollowUp} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Schedule</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AppFooter active="follow-ups" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: '#FFFFFF', gap: Spacing.md },
  menuBtn: { padding: Spacing.xs },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  filterContainer: { flexDirection: 'row', backgroundColor: '#F8FAFC', marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: BorderRadius.xl, padding: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  filterTab: { flex: 1, paddingVertical: Spacing.md - 2, alignItems: 'center', borderRadius: BorderRadius.lg },
  filterTabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  filterText: { fontSize: FontSize.sm - 1, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5 },
  filterTextActive: { color: Colors.primary, fontWeight: '800' },
  listContent: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xl + 40 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  leadInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  typeBadge: { width: 36, height: 36, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  leadName: { fontSize: FontSize.lg - 1, fontWeight: '800', color: Colors.text },
  typeText: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, marginTop: 1 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.sm, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: '800' },
  notesContainer: { backgroundColor: '#F8FAFC', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  notesText: { fontSize: FontSize.sm, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: Spacing.md },
  timeContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  timeText: { fontSize: FontSize.sm - 1, color: Colors.textMuted, fontWeight: '600' },
  completeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.success, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.md, gap: Spacing.xs },
  completeBtnPressed: { opacity: 0.8 },
  completeBtnText: { color: '#FFFFFF', fontSize: FontSize.xs + 1, fontWeight: '800' },
  completedAtContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  completedAtText: { fontSize: FontSize.xs + 1, color: Colors.success, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '75%', padding: Spacing.lg },
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
