import React, { useState, useCallback } from 'react';
import { StatusBar, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar, View, Text, StyleSheet, FlatList, Pressable, TextInput, RefreshControl, Linking } from 'react-native';
import { StatusBar, useRouter, useFocusEffect } from 'expo-router';
import { StatusBar, api } from '../../src/utils/api';
import { StatusBar, Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { StatusBar, Ionicons } from '@expo/vector-icons';

export default function CRMScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/crm');
      const arr = Array.isArray(data) ? data : (data as any).items || [];
      setItems(arr);
      setTotal(arr.length);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.text} /></Pressable>
        <Text style={styles.title}>CRM / Customers</Text>
        <Text style={styles.count}>{total}</Text>
      </View>
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput testID="crm-search" style={styles.searchInput} placeholder="Search customers..." placeholderTextColor={Colors.textLight} value={search} onChangeText={setSearch} onSubmitEditing={load} returnKeyType="search" />
        </View>
      </View>
      <FlatList data={items} keyExtractor={i => i.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-circle-outline" size={48} color={Colors.textLight} /><Text style={styles.emptyText}>No customers</Text></View>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.name?.charAt(0)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardMeta}>{item.phone} · {item.email}</Text>
                <Text style={styles.cardMeta}>{item.address}</Text>
                
                {/* Revenue & Activity Tracking */}
                <View style={styles.revenueRow}>
                  <View style={styles.revenueBadge}>
                    <Ionicons name="cash-outline" size={12} color={Colors.success} />
                    <Text style={styles.revenueText}>₹{item.totalRevenue || 0}</Text>
                  </View>
                  <View style={styles.activityBadge}>
                    <Ionicons name="shield-checkmark-outline" size={12} color={Colors.primary} />
                    <Text style={styles.activityText}>{item.policyCount || 0} Policies</Text>
                  </View>
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable testID={`call-${item.id}`} style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                  <Ionicons name="call" size={18} color={Colors.success} />
                </Pressable>
                <Pressable testID={`whatsapp-${item.id}`} style={styles.actionBtn} onPress={() => Linking.openURL(`https://wa.me/91${item.phone?.replace(/\D/g, '')}?text=Hi ${item.name}`)}>
                  <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                </Pressable>
              </View>
            </View>
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
  count: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary, backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.md, paddingVertical: 2, borderRadius: BorderRadius.sm },
  searchRow: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: FontSize.md, color: Colors.text },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#A21CAF15', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: FontSize.lg, fontWeight: '900', color: '#A21CAF' },
  cardName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  revenueRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  revenueBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.success + '10', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, gap: 4, borderWidth: 1, borderColor: Colors.success + '20' },
  revenueText: { fontSize: 10, fontWeight: '700', color: Colors.success },
  activityBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary + '10', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, gap: 4, borderWidth: 1, borderColor: Colors.primary + '20' },
  activityText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  cardVehicles: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600', marginTop: 4 },
  actions: { gap: Spacing.sm },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
});
