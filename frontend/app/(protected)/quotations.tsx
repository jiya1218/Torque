import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { quotationsService, Quotation } from '../../src/services/quotations';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import Sidebar from '../../src/components/Sidebar';
import { useCacheStore } from '../../src/store/cacheStore';
import * as FileSystem from 'expo-file-system/build/legacy';
import * as Sharing from 'expo-sharing';

export default function QuotationsScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<Quotation[]>(cache['/quotations'] || []);
  const [total, setTotal] = useState(items.length);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    loadCache().then(() => {
      if (cache['/quotations']) {
        setItems(cache['/quotations']);
        setTotal(cache['/quotations'].length);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await quotationsService.list({ limit: 100 });
      const arr = data || [];
      setItems(arr);
      setTotal(arr.length);
      setCache('/quotations', arr);
    } catch (e) {
      console.error('[QuotationsScreen] Failed to load quotations', e);
    }
  }, [setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleDownload = async (item: Quotation) => {
    setDownloadingId(item.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }
      
      // Use proxy or direct URL
      const url = `https://torque-alpha.vercel.app/api/v1/quotations/${item.id}/pdf?token=${token}`;
      const customerName = item.details?.customer_name ?? item.details?.client_name ?? 'Quotation';
      const safeName = customerName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${safeName}_quotation_${item.id.substring(0, 5)}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      const result = await FileSystem.downloadAsync(url, fileUri);
      
      if (result.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri);
        } else {
          Alert.alert('Success', `Saved to ${result.uri}`);
        }
      } else {
        Alert.alert('Error', 'Failed to generate quotation PDF.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to download and share quotation PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Quotations</Text>
        <Text style={styles.count}>{total}</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id || Math.random().toString()}
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
          const isDownloading = downloadingId === item.id;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>
                    {item.details?.customer_name ?? item.details?.client_name ?? 'Quotation'}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {item.details?.vehicle_type ?? ''}
                    {item.details?.vehicle_number ? ` · ${item.details.vehicle_number}` : ''}
                    {item.details?.insurance_type ? ` · ${item.details.insurance_type.replace(/_/g, ' ')}` : ''}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.lbl}>Amount</Text>
                  <Text style={styles.val}>₹{Number(item.amount || 0).toLocaleString()}</Text>
                </View>
                <View>
                  <Text style={styles.lbl}>Status</Text>
                  <Text style={styles.val}>{item.status}</Text>
                </View>
                <View>
                  <Text style={styles.lbl}>Lead ID</Text>
                  <Text style={styles.val}>{item.lead_id ? item.lead_id.substring(0, 8) + '…' : '—'}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.lbl}>Download</Text>
                  <Pressable
                    style={[styles.pdfBtn, isDownloading && { opacity: 0.6 }]}
                    onPress={() => handleDownload(item)}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Ionicons name="download-outline" size={16} color={Colors.primary} />
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />
      <Pressable testID="new-quotation-fab" style={styles.fab} onPress={() => router.push('/quotation-new')}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </Pressable>

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
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.lg },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2, textTransform: 'capitalize' },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, alignItems: 'center' },
  lbl: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '700', textTransform: 'uppercase' },
  val: { fontSize: FontSize.md, fontWeight: '900', color: Colors.text, marginTop: 2 },
  pdfBtn: { marginTop: 2, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm, backgroundColor: Colors.primaryLight, width: 36, height: 26, justifyContent: 'center', alignItems: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, fontWeight: '600' },
});

