import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import { useCacheStore } from '../../src/store/cacheStore';

export default function FitnessScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<any[]>(cache['/workflow/fitness'] || []);
  const [total, setTotal] = useState(items.length);
  const [refreshing, setRefreshing] = useState(false);

  // Add Fitness Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    vehicle_number: '',
    fees: '',
    test_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0] // 5 days from now default
  });

  useEffect(() => {
    loadCache().then(() => {
      if (cache['/workflow/fitness']) {
        setItems(cache['/workflow/fitness']);
        setTotal(cache['/workflow/fitness'].length);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/workflow/fitness');
      const arr = Array.isArray(data) ? data : (data as any).items || [];
      setItems(arr);
      setTotal(arr.length);
      setCache('/workflow/fitness', arr);
    } catch {}
  }, [setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleCreate = async () => {
    if (!form.customer_name || !form.vehicle_number || !form.fees) {
      Alert.alert('Error', 'Customer Name, Vehicle Number, and Fees are required.');
      return;
    }
    const amt = parseFloat(form.fees);
    if (isNaN(amt) || amt < 0) {
      Alert.alert('Error', 'Please enter a valid fees amount.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/workflow/fitness', {
        customer_name: form.customer_name,
        vehicle_number: form.vehicle_number,
        fees: amt,
        test_date: form.test_date
      });
      setModalOpen(false);
      Alert.alert('Success', 'Fitness work entry added successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add Fitness work');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Fitness Work</Text>
        <Text style={styles.count}>{total}</Text>
        <Pressable style={styles.addBtn} onPress={() => {
          setForm({
            customer_name: '',
            vehicle_number: '',
            fees: '',
            test_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0]
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
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="fitness-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No fitness work</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = StatusColors[item.status] || StatusColors.scheduled;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.customerName || item.customer_name}</Text>
                  <Text style={styles.cardMeta}>
                    {item.vehicleNumber || item.vehicle_number} · {item.vehicleType || item.vehicle_type || 'N/A'}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.badgeText, { color: sc.text }]}>{item.status?.replace(/_/g, ' ')}</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.cardDate}>{item.centerName || item.center_name || 'RTO Center'}</Text>
                <Text style={styles.cardDate}>
                  Test: {item.testDate || item.test_date ? (item.testDate || item.test_date).split('T')[0] : 'N/A'}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Add Fitness Modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Fitness Work</Text>
              <Pressable onPress={() => setModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>CUSTOMER NAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Suresh Patel"
                  value={form.customer_name}
                  onChangeText={v => setForm({ ...form, customer_name: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>VEHICLE NUMBER *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. GJ-01-XX-9999"
                  autoCapitalize="characters"
                  value={form.vehicle_number}
                  onChangeText={v => setForm({ ...form, vehicle_number: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>FEES (₹) *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 1200"
                  value={form.fees}
                  onChangeText={v => setForm({ ...form, fees: v })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>TEST DATE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={form.test_date}
                  onChangeText={v => setForm({ ...form, test_date: v })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleCreate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Add Fitness Entry</Text>}
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md, alignItems: 'center' },
  cardDate: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, fontWeight: '600' },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '70%', padding: Spacing.lg },
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

