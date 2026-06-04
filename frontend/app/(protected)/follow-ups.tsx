import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert, StatusBar, Modal, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import AppFooter from '../../src/components/AppFooter';
import Sidebar from '../../src/components/Sidebar';
import { useCacheStore } from '../../src/store/cacheStore';

export default function FollowUpsScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<any[]>(cache[`/follow-ups?status=${cache.lastFollowupFilter || 'pending'}`] || []);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  // Add Follow-up Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    lead_name: '',
    type: 'call',
    scheduled_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16).replace('T', ' '), // Tomorrow default
    notes: ''
  });

  useEffect(() => {
    loadCache().then(() => {
      const storedFilter = cache.lastFollowupFilter || 'pending';
      setFilter(storedFilter);
      if (cache[`/follow-ups?status=${storedFilter}`]) {
        setItems(cache[`/follow-ups?status=${storedFilter}`]);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>(`/follow-ups?status=${filter}`);
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);
      setCache(`/follow-ups?status=${filter}`, arr);
      setCache('lastFollowupFilter', filter);
    } catch {
      console.error('[FollowUpsScreen] Failed to load follow-ups');
    }
  }, [filter, setCache]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

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

  const handleCreate = async () => {
    if (!form.lead_name) {
      Alert.alert('Error', 'Lead name is required.');
      return;
    }
    const scheduledDate = new Date(form.scheduled_at);
    if (isNaN(scheduledDate.getTime())) {
      Alert.alert('Error', 'Please enter a valid date format YYYY-MM-DD HH:MM');
      return;
    }

    setSaving(true);
    try {
      await api.post('/follow-ups', {
        lead_name: form.lead_name,
        type: form.type,
        scheduled_at: scheduledDate.toISOString(),
        notes: form.notes
      });
      setModalOpen(false);
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
      case 'call':
        return { name: 'call-outline' as const, color: '#3b82f6', bg: '#eff6ff' };
      case 'whatsapp':
        return { name: 'logo-whatsapp' as const, color: '#10b981', bg: '#ecfdf5' };
      case 'visit':
        return { name: 'location-outline' as const, color: '#ef4444', bg: '#fff1f2' };
      default:
        return { name: 'checkbox-outline' as const, color: '#8b5cf6', bg: '#f5f3ff' };
    }
  };

  const getStatusStyle = (status: string) => {
    const key = status?.toLowerCase() || 'pending';
    return StatusColors[key] || StatusColors.pending;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Follow-ups</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{items.length}</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => {
          setForm({
            lead_name: '',
            type: 'call',
            scheduled_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16).replace('T', ' '),
            notes: ''
          });
          setModalOpen(true);
        }}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['pending', 'completed', 'all'] as const).map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              style={[
                styles.filterTab,
                active && styles.filterTabActive,
              ]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  active && styles.filterTextActive,
                ]}
              >
                {f.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id || Math.random().toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
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
                    <Text style={styles.leadName}>
                      {item.leadName || item.lead?.clientName || 'Unnamed Lead'}
                    </Text>
                    <Text style={styles.typeText}>{item.type?.toUpperCase()}</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statStyle.bg, borderColor: statStyle.bg },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statStyle.text }]}>
                    {item.status?.toUpperCase()}
                  </Text>
                </View>
              </View>

              {item.notes ? (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesText} numberOfLines={3}>
                    &quot;{item.notes}&quot;
                  </Text>
                </View>
              ) : null}

              <View style={styles.cardFooter}>
                <View style={styles.timeContainer}>
                  <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.timeText}>
                    {scheduledDate.toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    at{' '}
                    {scheduledDate.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                {item.status === 'pending' ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.completeBtn,
                      pressed && styles.completeBtnPressed,
                    ]}
                    onPress={() => handleComplete(item)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.completeBtnText}>Complete</Text>
                  </Pressable>
                ) : (
                  item.completedAt && (
                    <View style={styles.completedAtContainer}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={Colors.success}
                      />
                      <Text style={styles.completedAtText}>Done</Text>
                    </View>
                  )
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Add Follow-up Modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Follow-up</Text>
              <Pressable onPress={() => setModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>LEAD / CLIENT NAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ramesh Patel"
                  value={form.lead_name}
                  onChangeText={v => setForm({ ...form, lead_name: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>FOLLOW-UP TYPE</Text>
                <View style={styles.typeSelector}>
                  {['call', 'whatsapp', 'visit'].map(t => (
                    <Pressable
                      key={t}
                      style={[styles.typeOption, form.type === t && styles.typeOptionActive]}
                      onPress={() => setForm({ ...form, type: t })}
                    >
                      <Text style={[styles.typeOptionText, form.type === t && styles.typeOptionTextActive]}>
                        {t}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>SCHEDULE DATE & TIME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD HH:MM (e.g. 2026-06-05 14:30)"
                  value={form.scheduled_at}
                  onChangeText={v => setForm({ ...form, scheduled_at: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>NOTES / DETAILS</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: Spacing.sm }]}
                  multiline
                  placeholder="Details of what to discuss..."
                  value={form.notes}
                  onChangeText={v => setForm({ ...form, notes: v })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleCreate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Schedule</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AppFooter active="follow-ups" />
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#FFFFFF',
    gap: Spacing.md,
  },
  menuBtn: { padding: Spacing.xs },
  title: {
    flex: 1,
    fontSize: FontSize.xxl,
    fontWeight: '900',
    color: Colors.text,
  },
  countBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    minWidth: 32,
    alignItems: 'center',
  },
  countText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.md - 2,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterText: {
    fontSize: FontSize.sm - 1,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  filterTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xl + 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  leadInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  typeBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadName: {
    fontSize: FontSize.lg - 1,
    fontWeight: '800',
    color: Colors.text,
  },
  typeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  notesContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  notesText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: Spacing.md,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeText: {
    fontSize: FontSize.sm - 1,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  completeBtnPressed: {
    opacity: 0.8,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs + 1,
    fontWeight: '800',
  },
  completedAtContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  completedAtText: {
    fontSize: FontSize.xs + 1,
    color: Colors.success,
    fontWeight: '800',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
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
  typeSelector: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, padding: 4 },
  typeOption: { flex: 1, height: 38, justifyContent: 'center', alignItems: 'center', borderRadius: BorderRadius.sm },
  typeOptionActive: { backgroundColor: Colors.primaryLight },
  typeOptionText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textLight, textTransform: 'capitalize' },
  typeOptionTextActive: { color: Colors.primary, fontWeight: '800' },
  submitBtn: { backgroundColor: Colors.primary, height: 48, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.xl },
  submitBtnText: { color: Colors.white, fontWeight: '800', fontSize: FontSize.md }
});

