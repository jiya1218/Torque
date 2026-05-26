import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

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

      await api.patch(`/visits/${visit.id}`, {
        action,
        lat,
        lng,
        location: `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`
      });

      Alert.alert('Success', `Field visit ${action.replace('_', ' ')} successful.`);
      load();
    } catch {
      Alert.alert('Error', 'Failed to update visit status.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.text} /></Pressable>
        <Text style={styles.title}>Field Work / Visits</Text>
      </View>

      <FlatList 
        data={items} 
        keyExtractor={i => i.id} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="map-outline" size={48} color={Colors.textLight} /><Text style={styles.emptyText}>No scheduled visits</Text></View>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{
                backgroundColor: item.status === 'completed' ? Colors.success + '15' : item.status === 'in_progress' ? '#A21CAF15' : Colors.primary + '15',
                paddingHorizontal: Spacing.sm,
                paddingVertical: 2,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: item.status === 'completed' ? Colors.success + '30' : item.status === 'in_progress' ? '#A21CAF30' : Colors.primary + '30'
              }}>
                <Text style={styles.statusText}>{(item.status || 'scheduled').toUpperCase()}</Text>
              </View>
              <Text style={styles.time}>{new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>

            <Text style={styles.purpose}>{item.purpose}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.customer?.name || item.lead?.clientName || 'Unnamed Entity'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>{item.location || 'No location set'}</Text>
            </View>

            {item.status === 'scheduled' && (
              <Pressable 
                style={[styles.btn, { backgroundColor: Colors.primary }]} 
                onPress={() => handleVisitAction(item, 'check_in')}
              >
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <Text style={styles.btnText}>Check In (GPS)</Text>
              </Pressable>
            )}

            {item.status === 'in_progress' && (
              <Pressable 
                style={[styles.btn, { backgroundColor: Colors.success }]} 
                onPress={() => handleVisitAction(item, 'check_out')}
              >
                <Ionicons name="log-out-outline" size={18} color="#fff" />
                <Text style={styles.btnText}>Check Out (GPS)</Text>
              </Pressable>
            )}

            {item.status === 'completed' && item.distanceKm !== null && (
              <View style={styles.completedMeta}>
                <Text style={styles.distanceText}>Total Distance: {item.distanceKm} km</Text>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  statusText: { fontSize: 10, fontWeight: '900', color: Colors.text },
  time: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  purpose: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
  metaText: { fontSize: FontSize.sm, color: Colors.textMuted },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, marginTop: Spacing.md },
  btnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  completedMeta: { marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  distanceText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
});
