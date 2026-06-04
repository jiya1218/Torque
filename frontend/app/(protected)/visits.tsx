import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert, StatusBar, Modal, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AppFooter from '../../src/components/AppFooter';
import Sidebar from '../../src/components/Sidebar';
import { useCacheStore } from '../../src/store/cacheStore';

export default function VisitsScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<any[]>(cache['/visits'] || []);
  const [refreshing, setRefreshing] = useState(false);

  // Add/Schedule Visit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    purpose: '',
    location: '',
    scheduledAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16).replace('T', ' ') // Tomorrow default
  });

  useEffect(() => {
    loadCache().then(() => {
      if (cache['/visits']) {
        setItems(cache['/visits']);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/visits');
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);
      setCache('/visits', arr);
    } catch {
      console.error('[VisitsScreen] Failed to load visits');
    }
  }, [setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleVisitAction = async (visit: any, action: 'check_in' | 'check_out') => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for field visits.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = location.coords;
      await api.patch(`/visits/${visit.id}`, { action, lat, lng, location: `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      Alert.alert('Success', `Field visit ${action.replace('_', ' ')} successful.`);
      load();
    } catch {
      Alert.alert('Error', 'Failed to update visit status.');
    }
  };

  const handleCreate = async () => {
    if (!form.purpose || !form.location || !form.scheduledAt) {
      Alert.alert('Error', 'Purpose, Location, and Scheduled Date/Time are required.');
      return;
    }
    const schedDate = new Date(form.scheduledAt);
    if (isNaN(schedDate.getTime())) {
      Alert.alert('Error', 'Please enter a valid date format YYYY-MM-DD HH:MM');
      return;
    }

    setSaving(true);
    try {
      await api.post('/visits', {
        purpose: form.purpose,
        location: form.location,
        scheduledAt: schedDate.toISOString()
      });
      setModalOpen(false);
      Alert.alert('Success', 'Field visit scheduled successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to schedule field visit');
    } finally {
      setSaving(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':   return { bg: '#ECFDF5', text: '#047857', border: '#10B98130' };
      case 'in_progress': return { bg: '#FDF4FF', text: '#A21CAF', border: '#D946EF30' };
      default:            return { bg: '#EFF6FF', text: '#1D4ED8', border: '#3B82F630' };
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Field Visits</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{items.length}</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => {
          setForm({
            purpose: '',
            location: '',
            scheduledAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16).replace('T', ' ')
          });
          setModalOpen(true);
        }}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id || Math.random().toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.lg }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={52} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No scheduled visits</Text>
            <Text style={styles.emptyText}>Your field visits will appear here</Text>
          </View>
        }
        renderItem={({ item }) => {
          const ss = getStatusStyle(item.status);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: ss.bg, borderColor: ss.border }]}>
                  <Text style={[styles.statusText, { color: ss.text }]}>
                    {(item.status || 'scheduled').replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.time}>
                  {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <Text style={styles.purpose}>{item.purpose}</Text>

              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.metaText}>
                  {item.customer?.name || item.lead?.clientName || 'Unnamed Entity'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.location || 'No location set'}
                </Text>
              </View>

              {item.status === 'scheduled' && (
                <Pressable style={[styles.btn, { backgroundColor: Colors.primary }]} onPress={() => handleVisitAction(item, 'check_in')}>
                  <Ionicons name="log-in-outline" size={18} color="#fff" />
                  <Text style={styles.btnText}>Check In (GPS)</Text>
                </Pressable>
              )}
              {item.status === 'in_progress' && (
                <Pressable style={[styles.btn, { backgroundColor: Colors.success }]} onPress={() => handleVisitAction(item, 'check_out')}>
                  <Ionicons name="log-out-outline" size={18} color="#fff" />
                  <Text style={styles.btnText}>Check Out (GPS)</Text>
                </Pressable>
              )}
              {item.status === 'completed' && item.distanceKm !== null && (
                <View style={styles.completedMeta}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.distanceText}>Total Distance: {item.distanceKm} km</Text>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Schedule Visit Modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Field Visit</Text>
              <Pressable onPress={() => setModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>PURPOSE OF VISIT *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Policy Renewal Discussion"
                  value={form.purpose}
                  onChangeText={v => setForm({ ...form, purpose: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>LOCATION / ADDRESS *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Office Suite 4B, CG Road, Ahmedabad"
                  value={form.location}
                  onChangeText={v => setForm({ ...form, location: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>SCHEDULE DATE & TIME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD HH:MM (e.g. 2026-06-05 14:30)"
                  value={form.scheduledAt}
                  onChangeText={v => setForm({ ...form, scheduledAt: v })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleCreate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Schedule Visit</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AppFooter />
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: '#FFFFFF', gap: Spacing.md,
  },
  menuBtn:    { padding: Spacing.xs },
  title:      { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  countBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.md, minWidth: 32, alignItems: 'center' },
  countText:  { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  statusBadge:  { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.sm, borderWidth: 1 },
  statusText:   { fontSize: 10, fontWeight: '800' },
  time:         { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  purpose:      { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
  metaText:     { fontSize: FontSize.sm, color: Colors.textMuted, flex: 1 },
  btn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, marginTop: Spacing.md },
  btnText:      { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  completedMeta:{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  distanceText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '700' },
  empty:        { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyTitle:   { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  emptyText:    { fontSize: FontSize.sm, color: Colors.textMuted },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '65%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  closeBtn: { padding: Spacing.xs },
  modalBody: { flex: 1, marginTop: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight, letterSpacing: 1, marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, height: 48, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  submitBtn: { backgroundColor: Colors.primary, height: 48, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.xl },
  submitBtnText: { color: Colors.white, fontWeight: '800', fontSize: FontSize.md }
});

