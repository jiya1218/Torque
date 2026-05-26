import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, SafeAreaView, RefreshControl, Linking } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LeadsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/leads');
      setItems(res.leads || []);
    } catch (e) {
      console.error('[LeadsScreen] Failed to load leads', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleCall = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = async (leadId: string, phone: string, name: string, vehicle: string, expiry: string) => {
    if (phone) {
      try {
        await api.post(`/leads/${leadId}/whatsapp`, {});
        const msg = `Hello ${name || 'Customer'},\nYour vehicle ${vehicle || ''} insurance expires on ${expiry || 'soon'}.\nRenew today with Torque Auto Advisor.`;
        Linking.openURL(`https://wa.me/91${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`);
      } catch (err) {}
    }
  };

  const filteredItems = items.filter(l => 
    l.clientName?.toLowerCase().includes(search.toLowerCase()) || 
    l.clientPhone?.includes(search) ||
    l.vehicleNo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.text} /></Pressable>
        <Text style={styles.title}>My Leads</Text>
        <Pressable style={styles.addBtn} onPress={() => router.push('/lead/new')}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search name, phone or vehicle..." 
            placeholderTextColor={Colors.textLight} 
            value={search} 
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList 
        data={filteredItems} 
        keyExtractor={i => i.id} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={48} color={Colors.textLight} /><Text style={styles.emptyText}>No leads assigned to you</Text></View>}
        renderItem={({ item }) => {
          const sc = StatusColors[(item.status || 'New').toLowerCase()] || StatusColors.new;
          return (
            <Pressable 
              style={styles.card} 
              onPress={() => router.push(`/lead/${item.id}`)}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.clientName}</Text>
                  <Text style={styles.cardMeta}>{item.clientPhone} · {item.city || 'N/A'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text>
                </View>
              </View>
              
              <View style={styles.cardMiddle}>
                <View style={styles.metaRow}>
                  <Ionicons name="car-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.metaText}>{item.vehicleNo || 'No vehicle'}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.metaText}>Exp: {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-'}</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <Pressable 
                  style={[styles.btn, {backgroundColor: Colors.success + '15'}]} 
                  onPress={() => handleCall(item.clientPhone)}
                >
                  <Ionicons name="call" size={18} color={Colors.success} />
                  <Text style={[styles.btnText, {color: Colors.success}]}>Call</Text>
                </Pressable>
                <Pressable 
                  style={[styles.btn, {backgroundColor: '#25D36615'}]} 
                  onPress={() => handleWhatsApp(item.id, item.clientPhone, item.clientName, item.vehicleNo, item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '')}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                  <Text style={[styles.btnText, {color: '#25D366'}]}>WhatsApp</Text>
                </Pressable>
                <Pressable 
                  style={[styles.btn, {backgroundColor: Colors.primaryLight}]} 
                  onPress={() => router.push({ pathname: '/call-log', params: { leadId: item.id, leadName: item.clientName } })}
                >
                  <Ionicons name="create" size={18} color={Colors.primary} />
                  <Text style={[styles.btnText, {color: Colors.primary}]}>Log</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  searchRow: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: FontSize.md, color: Colors.text },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.xs },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700' },
  cardMiddle: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm, paddingVertical: Spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.textMuted },
  cardActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: BorderRadius.sm },
  btnText: { fontSize: FontSize.xs, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
});
