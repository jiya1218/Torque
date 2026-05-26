import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, RefreshControl, Linking, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import AppFooter from '../../../src/components/AppFooter';

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>My Leads</Text>
        <Pressable style={styles.addBtn} onPress={() => router.push('/lead/new')}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Search */}
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
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textLight} />
            </Pressable>
          )}
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filteredItems.length}</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredItems}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.lg }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={52} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No leads found</Text>
            <Text style={styles.emptyText}>
              {search ? 'Try a different search term' : 'No leads assigned to you yet'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = StatusColors[(item.status || 'New').toLowerCase()] || StatusColors.new;
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              onPress={() => router.push(`/lead/${item.id}`)}
            >
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.avatarText, { color: sc.text }]}>
                    {item.clientName?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.clientName}</Text>
                  <Text style={styles.cardMeta}>{item.clientPhone || 'No phone'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.cardMiddle}>
                <View style={styles.metaRow}>
                  <Ionicons name="car-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.metaText}>{item.vehicleNo || 'No vehicle'}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.metaText}>
                    Exp: {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <Pressable
                  style={[styles.btn, { backgroundColor: Colors.success + '15' }]}
                  onPress={() => handleCall(item.clientPhone)}
                >
                  <Ionicons name="call" size={16} color={Colors.success} />
                  <Text style={[styles.btnText, { color: Colors.success }]}>Call</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, { backgroundColor: '#25D36615' }]}
                  onPress={() => handleWhatsApp(item.id, item.clientPhone, item.clientName, item.vehicleNo, item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '')}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                  <Text style={[styles.btnText, { color: '#25D366' }]}>WhatsApp</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, { backgroundColor: Colors.primaryLight }]}
                  onPress={() => router.push({ pathname: '/call-log', params: { leadId: item.id, leadName: item.clientName } })}
                >
                  <Ionicons name="create" size={16} color={Colors.primary} />
                  <Text style={[styles.btnText, { color: Colors.primary }]}>Log</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />

      {/* Sticky Footer */}
      <AppFooter active="leads" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: '#FFFFFF', gap: Spacing.md,
  },
  backBtn:  { padding: Spacing.xs },
  title:    { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  addBtn:   { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  searchRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, backgroundColor: '#FFFFFF' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, height: 44, gap: Spacing.sm },
  searchInput:    { flex: 1, fontSize: FontSize.md, color: Colors.text },
  countBadge:     { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.md, minWidth: 36, alignItems: 'center' },
  countText:      { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },
  card: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar:     { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: FontSize.lg, fontWeight: '900' },
  cardName:   { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardMeta:   { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  badge:      { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.sm },
  badgeText:  { fontSize: 10, fontWeight: '700' },
  cardMiddle: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border + '80' },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:   { fontSize: FontSize.xs, color: Colors.textMuted },
  cardActions:{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  btn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: BorderRadius.md },
  btnText:    { fontSize: FontSize.xs, fontWeight: '700' },
  empty:      { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  emptyText:  { fontSize: FontSize.sm, color: Colors.textMuted },
});
