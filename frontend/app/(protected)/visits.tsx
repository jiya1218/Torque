import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert, StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AppFooter from '../../src/components/AppFooter';

export default function VisitsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/visits');
      setItems(Array.isArray(data) ? data : []);
    } catch {
      console.error('[VisitsScreen] Failed to load visits');
    }
  }, []);

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
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Field Visits</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{items.length}</Text>
        </View>
      </View>

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

      <AppFooter active="visits" />
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
  backBtn:    { padding: Spacing.xs },
  title:      { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  countBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.md, minWidth: 32, alignItems: 'center' },
  countText:  { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },
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
});
