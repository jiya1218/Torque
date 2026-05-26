import React, { useState, useCallback } from 'react';
import { StatusBar, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar, View, Text, StyleSheet, FlatList, Pressable, TextInput, RefreshControl } from 'react-native';
import { StatusBar, useRouter, useFocusEffect } from 'expo-router';
import { StatusBar, usersService, User } from '../../src/services/users';
import { StatusBar, Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { StatusBar, Ionicons } from '@expo/vector-icons';

const ALL_ROLES = ['super_admin','admin','manager','branch_manager','regional_manager','sales_executive','telecaller','field_executive','rto_executive','claims_executive','loan_executive','crm_executive','accountant','hr','auditor','data_entry','support','it_admin','viewer'];

export default function UsersScreen() {
  const router = useRouter();
  const [items, setItems] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await usersService.list({ limit: 100 });
      // Client-side search filter until backend supports search param
      const filtered = search
        ? data.filter(u =>
            u.full_name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
          )
        : data;
      setItems(filtered);
      setTotal(filtered.length);
    } catch (e) {
      console.error('[UsersScreen] Failed to load users', e);
    }
  }, [search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.text} /></Pressable>
        <Text style={styles.title}>Users</Text>
        <Text style={styles.count}>{total}</Text>
      </View>
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput testID="user-search" style={styles.searchInput} placeholder="Search users..." placeholderTextColor={Colors.textLight} value={search} onChangeText={setSearch} onSubmitEditing={load} returnKeyType="search" />
        </View>
      </View>
      <FlatList data={items} keyExtractor={i => i.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="settings-outline" size={48} color={Colors.textLight} /><Text style={styles.emptyText}>No users</Text></View>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={[styles.avatar, { backgroundColor: item.is_active ? Colors.primaryLight : Colors.errorBg }]}>
                <Text style={[styles.avatarText, { color: item.is_active ? Colors.primary : Colors.error }]}>{item.full_name?.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.full_name}</Text>
                <Text style={styles.cardMeta}>{item.email}</Text>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{item.role?.name?.replace(/_/g, ' ') ?? 'No role'}</Text>
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
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: FontSize.lg, fontWeight: '900' },
  cardName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  roleBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  roleText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
});
