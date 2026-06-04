import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, StatusBar } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import { useCacheStore } from '../../src/store/cacheStore';

export default function RolesScreen() {
  const { cache, setCache } = useCacheStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<any[]>(cache['/roles'] || []);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/roles');
      setItems(data || []);
      setCache('/roles', data || []);
    } catch (e) {
      console.error('[RolesScreen] Failed to load roles', e);
    }
  }, [setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  
  const onRefresh = async () => { 
    setRefreshing(true); 
    await load(); 
    setRefreshing(false); 
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Roles & Permissions</Text>
      </View>

      <FlatList 
        data={items} 
        keyExtractor={i => i.id} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="lock-closed-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No roles found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                <Ionicons name="ribbon" size={20} color={Colors.primary} />
                <Text style={styles.cardName}>{item.name?.replace(/_/g, ' ')}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item._count?.users || 0} users</Text>
              </View>
            </View>
            
            <Text style={styles.sectionLabel}>PERMISSIONS DEFINED ({item.permissions?.length || 0})</Text>
            <View style={styles.chipsContainer}>
              {item.permissions?.map((p: any, idx: number) => (
                <View key={idx} style={styles.chip}>
                  <Text style={styles.chipText}>{p.name}</Text>
                </View>
              ))}
              {(!item.permissions || item.permissions.length === 0) && (
                <Text style={styles.noPerms}>No special permissions assigned.</Text>
              )}
            </View>
          </View>
        )}
      />

      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: '#FFFFFF', gap: Spacing.md },
  menuBtn: { padding: Spacing.xs },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.lg, marginHorizontal: Spacing.xs },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  badge: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.md },
  badgeText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },
  sectionLabel: { fontSize: 9, fontWeight: '800', color: Colors.textLight, letterSpacing: 1.5, marginBottom: Spacing.sm },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  chipText: { fontSize: 10, fontWeight: '600', color: '#475569' },
  noPerms: { fontSize: FontSize.sm, color: Colors.textMuted, fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
});
