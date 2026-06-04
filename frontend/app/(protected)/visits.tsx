import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert, StatusBar, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCacheStore } from '../../src/store/cacheStore';
import Sidebar from '../../src/components/Sidebar';
import AppFooter from '../../src/components/AppFooter';

export default function VisitsScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();

  const [items, setItems] = useState<any[]>(cache['/visits']?.items || []);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Add Visit Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newVisit, setNewVisit] = useState({
    purpose: '',
    location: '',
    scheduledAt: '',
    customerId: '',
    leadId: ''
  });

  // Customers/Leads for selection
  const [customers, setCustomers] = useState<any[]>(cache['/crm']?.items || []);
  const [leads, setLeads] = useState<any[]>(cache['/leads']?.items || []);

  // Load cache on mount
  useEffect(() => {
    loadCache().then(() => {
      const cachedVisits = cache['/visits'];
      if (cachedVisits && cachedVisits.items) {
        setItems(cachedVisits.items);
      }
      const cachedCrm = cache['/crm'];
      if (cachedCrm && cachedCrm.items) {
        setCustomers(cachedCrm.items);
      }
      const cachedLeads = cache['/leads'];
      if (cachedLeads && cachedLeads.items) {
        setLeads(cachedLeads.items);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const [vData, cData, lData] = await Promise.all([
        api.get<any[]>('/visits'),
        api.get<any>('/crm').catch(() => null),
        api.get<any>('/leads').catch(() => null)
      ]);

      const visitsArr = Array.isArray(vData) ? vData : [];
      setItems(visitsArr);
      setCache('/visits', { items: visitsArr });

      if (cData) {
        const crmArr = Array.isArray(cData) ? cData : cData.items || [];
        setCustomers(crmArr);
        setCache('/crm', { items: crmArr });
      }

      if (lData) {
        const leadsArr = Array.isArray(lData) ? lData : lData.items || [];
        setLeads(leadsArr);
        setCache('/leads', { items: leadsArr });
      }
    } catch (e) {
      console.error('[VisitsScreen] Failed to load visits data', e);
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

  const handleAddVisit = async () => {
    if (!newVisit.purpose.trim() || !newVisit.scheduledAt.trim()) {
      Alert.alert('Error', 'Purpose and Scheduled Date & Time are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/visits', {
        purpose: newVisit.purpose.trim(),
        location: newVisit.location.trim() || null,
        scheduledAt: new Date(newVisit.scheduledAt).toISOString(),
        customerId: newVisit.customerId || null,
        leadId: newVisit.leadId || null
      });
      setAddModalVisible(false);
      setNewVisit({ purpose: '', location: '', scheduledAt: '', customerId: '', leadId: '' });
      Alert.alert('Success', 'Visit scheduled successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to schedule visit');
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

      {/* Sidebar Component */}
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Field Visits</Text>
        <Pressable style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={i => i.id}
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

      {/* ── Add Visit Modal ── */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Visit</Text>
              <Pressable onPress={() => setAddModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>PURPOSE OF VISIT *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Document Collection, Policy Discussion"
                  placeholderTextColor={Colors.textLight}
                  value={newVisit.purpose}
                  onChangeText={(val) => setNewVisit({ ...newVisit, purpose: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>LOCATION / ADDRESS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Office address or home details"
                  placeholderTextColor={Colors.textLight}
                  value={newVisit.location}
                  onChangeText={(val) => setNewVisit({ ...newVisit, location: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>SCHEDULE DATE & TIME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2026-06-15T14:30:00Z"
                  placeholderTextColor={Colors.textLight}
                  value={newVisit.scheduledAt}
                  onChangeText={(val) => setNewVisit({ ...newVisit, scheduledAt: val })}
                />
                <Text style={styles.hint}>Format: YYYY-MM-DDTHH:MM:SSZ</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>LINK TO CUSTOMER (OPTIONAL ID)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Paste Customer UUID if any"
                  placeholderTextColor={Colors.textLight}
                  value={newVisit.customerId}
                  onChangeText={(val) => setNewVisit({ ...newVisit, customerId: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>LINK TO LEAD (OPTIONAL ID)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Paste Lead UUID if any"
                  placeholderTextColor={Colors.textLight}
                  value={newVisit.leadId}
                  onChangeText={(val) => setNewVisit({ ...newVisit, leadId: val })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleAddVisit} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Schedule Visit</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AppFooter />
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
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm
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
