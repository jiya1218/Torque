import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { quotationsService, Quotation } from '../../src/services/quotations';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useCacheStore } from '../../src/store/cacheStore';
import Sidebar from '../../src/components/Sidebar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../src/context/AuthContext';

export default function QuotationsScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { cache, setCache, loadCache } = useCacheStore();

  const [items, setItems] = useState<Quotation[]>(cache['/quotations']?.items || []);
  const [total, setTotal] = useState(cache['/quotations']?.items?.length || 0);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const roleUpper = currentUser?.role?.toUpperCase() || '';
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN';

  // Load cache on mount
  useEffect(() => {
    loadCache().then(() => {
      const cached = cache['/quotations'];
      if (cached && cached.items) {
        setItems(cached.items);
        setTotal(cached.items.length);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await quotationsService.list({ limit: 100 });
      setItems(data);
      setTotal(data.length);
      setCache('/quotations', { items: data });
    } catch (e) {
      console.error('[QuotationsScreen] Failed to load quotations', e);
    }
  }, [setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleDownloadPDF = async (item: Quotation) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }
      const url = `https://torque-alpha.vercel.app/api/v1/quotations/${item.id}/pdf?token=${token}`;
      const filename = `Quotation_${item.id.substring(0, 8)}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      Alert.alert('Downloading', 'Please wait while the PDF is downloading...');

      const result = await FileSystem.downloadAsync(url, fileUri);

      if (result.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Open Quotation PDF',
            UTI: 'com.adobe.pdf'
          });
        } else {
          Alert.alert('Success', 'PDF downloaded successfully to: ' + result.uri);
        }
      } else {
        Alert.alert('Error', `Failed to download PDF (Server status: ${result.status})`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to download PDF');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Sidebar Component */}
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Quotations</Text>
        <View style={styles.headerRight}>
          <View style={styles.countBadge}><Text style={styles.countText}>{total}</Text></View>
        </View>
      </View>

      {/* List */}
      <FlatList 
        data={items} 
        keyExtractor={i => i.id} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No quotations</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = StatusColors[item.status] || StatusColors.draft;
          const leadIdVal = item.leadId ?? item.lead_id;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>
                    {item.lead?.clientName ?? item.details?.customer_name ?? item.details?.client_name ?? 'Quotation'}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {item.details?.vehicle_type ?? ''}
                    {item.details?.vehicle_number ? ` · ${item.details.vehicle_number}` : ''}
                    {item.details?.insurance_type ? ` · ${item.details.insurance_type.replace(/_/g, ' ')}` : ''}
                  </Text>
                  {(item.company?.name || item.details?.companyName) && (
                    <Text style={styles.cardMetaBlue}>
                      {item.company?.name || item.details?.companyName} · {item.category?.name || item.details?.categoryName || 'Insurance'}
                    </Text>
                  )}
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}><Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text></View>
              </View>
              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.lbl}>Rate</Text>
                  <Text style={styles.val}>
                    ₹{Number(item.rate !== undefined && item.rate !== null ? item.rate : (item.amount || 0)).toLocaleString()}
                  </Text>
                </View>
                {item.benefit !== undefined && item.benefit !== null && (
                  <View>
                    <Text style={styles.lbl}>Benefit</Text>
                    <Text style={[styles.val, { color: Colors.success }]}>
                      ₹{Number(item.benefit).toLocaleString()}
                    </Text>
                  </View>
                )}
                <View><Text style={styles.lbl}>Status</Text><Text style={styles.val}>{item.status}</Text></View>
                <View><Text style={styles.lbl}>Lead ID</Text><Text style={styles.val}>{leadIdVal ? leadIdVal.substring(0, 8) + '…' : '—'}</Text></View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.lbl}>Download</Text>
                  <Pressable 
                    style={styles.pdfBtn}
                    onPress={() => handleDownloadPDF(item)}
                  >
                    <Ionicons name="download-outline" size={16} color={Colors.primary} />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />
      {isAdmin && (
        <Pressable testID="new-quotation-fab" style={styles.fab} onPress={() => router.push('/quotation-new')}>
          <Ionicons name="add" size={28} color={Colors.white} />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md, backgroundColor: '#FFFFFF' },
  menuBtn: { padding: Spacing.xs },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  countBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.md, minWidth: 32, alignItems: 'center' },
  countText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: FontSize.lg - 2, fontWeight: '800', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  cardMetaBlue: { fontSize: FontSize.xs - 1, fontWeight: '700', color: Colors.primary, marginTop: 4, textTransform: 'uppercase' },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  lbl: { fontSize: FontSize.xs, color: Colors.textMuted },
  val: { fontSize: FontSize.md, fontWeight: '900', color: Colors.text, marginTop: 2 },
  pdfBtn: { marginTop: 2, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, backgroundColor: Colors.primaryLight },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
});
