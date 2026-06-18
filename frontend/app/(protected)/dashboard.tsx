import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Dimensions, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { useCacheStore } from '../../src/store/cacheStore';
import AppFooter from '../../src/components/AppFooter';
import Sidebar from '../../src/components/Sidebar';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - (Spacing.lg * 2) - Spacing.md) / 2;

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { cache, setCache, loadCache } = useCacheStore();
  
  const [stats, setStats] = useState<any>(
    cache['/dashboard/stats']?.stats || { leads: 0, revenue: 0, pending: 0, claims: 0 }
  );
  const [items, setItems] = useState<any[]>(
    cache['/dashboard/stats']?.items || []
  );
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Hydrate cache on mount
  React.useEffect(() => {
    loadCache().then(() => {
      const cached = cache['/dashboard/stats'];
      if (cached) {
        if (cached.stats) setStats(cached.stats);
        if (cached.items) setItems(cached.items);
      }
    });
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [sData, nData] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/notifications?limit=5')
      ]);
      
      let leads = 0;
      let revenue = 0;
      let pending = 0;
      let claims = 0;

      if (sData) {
        if (sData.view === 'admin') {
          leads = sData.total_leads || 0;
          pending = sData.pending_followups || 0;
          claims = sData.active_claims || 0;
          revenue = sData.revenue_trend?.reduce((acc: number, item: any) => acc + (Number(item._sum?.amount) || 0), 0) || 0;
        } else if (sData.view === 'manager') {
          leads = sData.total_leads || 0;
          pending = sData.pending_followups || 0;
          claims = sData.active_claims || 0;
        } else if (sData.view === 'agent') {
          leads = sData.my_leads || 0;
          pending = sData.pending_followups || 0;
        } else {
          leads = sData.leads || 0;
          revenue = sData.revenue || 0;
          pending = sData.pending || 0;
          claims = sData.claims || 0;
        }
      }

      const newStats = { ...sData, leads, revenue, pending, claims };
      const newItems = nData.notifications || [];

      setStats(newStats);
      setItems(newItems);
      setCache('/dashboard/stats', { stats: newStats, items: newItems, timestamp: Date.now() });
    } catch (e) {
      console.warn('Dashboard load error:', e);
    }
  }, [setCache]);

  useFocusEffect(
    useCallback(() => {
      const cached = cache['/dashboard/stats'];
      const lastFetched = cached?.timestamp;
      if (!lastFetched || Date.now() - lastFetched > 30000) {
        loadData();
      }
    }, [loadData, cache])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const isAdmin = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'SUPER ADMIN';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Sidebar Modal Component */}
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.greeting}>Welcome back,</Text>
            {!user?.is_active && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>Pending</Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>{user?.full_name || user?.name || 'Admin'}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/(protected)/notifications')} style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
            <View style={styles.notifDot} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {!user?.is_active && (
          <View style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={20} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingBannerTitle}>Profile Pending Approval</Text>
              <Text style={styles.pendingBannerText}>
                Your onboarding profile has been submitted and is currently awaiting admin verification.
              </Text>
            </View>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {isAdmin ? (
            <>
              <StatCard icon="people"           value={stats.total_leads ?? 0}    label="Total Leads"   color="#3b82f6" onPress={() => router.push('/(protected)/leads')} />
              <StatCard icon="people-circle"    value={stats.total_employees ?? 0} label="Total Staff"   color="#ec4899" onPress={() => router.push('/(protected)/users')} />
              <StatCard icon="shield-checkmark" value={stats.active_policies ?? 0} label="Active Policies" color="#10b981" onPress={() => router.push('/(protected)/policies')} />
              <StatCard icon="document-text"    value={stats.active_claims ?? 0}   label="Active Claims"  color="#ef4444" onPress={() => router.push('/(protected)/claims')} />
              <StatCard icon="car"              value={stats.pending_rto ?? 0}     label="Pending RTO"    color="#f59e0b" onPress={() => router.push('/(protected)/rto')} />
              <StatCard icon="fitness"          value={stats.pending_fitness ?? 0} label="Pending Fitness" color="#06b6d4" onPress={() => router.push('/(protected)/fitness')} />
              <StatCard icon="cash"             value={stats.active_loans ?? 0}    label="Active Loans"   color="#84cc16" onPress={() => router.push('/(protected)/loans')} />
              <StatCard icon="person-add"       value={stats.total_customers ?? 0} label="Customers"      color="#8b5cf6" onPress={() => router.push('/(protected)/users')} />
              <StatCard icon="location"         value={stats.today_visits ?? 0}    label="Today's Visits" color="#f43f5e" onPress={() => router.push('/(protected)/visits')} />
            </>
          ) : (
            <>
              <StatCard icon="people"           value={stats.leads}              label="Leads"   color="#3b82f6" onPress={() => router.push('/(protected)/leads')} />
              <StatCard icon="trending-up"      value={`₹${stats.revenue ?? 0}`} label="Revenue" color="#10b981" />
              <StatCard icon="time"             value={stats.pending}            label="Pending" color="#f59e0b" onPress={() => router.push('/(protected)/follow-ups')} />
              <StatCard icon="shield-checkmark" value={stats.claims}             label="Claims"  color="#ef4444" onPress={() => router.push('/(protected)/claims')} />
            </>
          )}
        </View>

        {/* Quick Info text */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.infoBannerText}>Swipe from the left edge or tap the menu to view all modules.</Text>
        </View>

        {/* Recent Updates */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Updates</Text>
          <Pressable onPress={() => router.push('/(protected)/notifications')}>
            <Text style={styles.seeAll}>View All</Text>
          </Pressable>
        </View>
        <View style={styles.activityList}>
          {items.length === 0 ? (
            <View style={styles.noActivity}>
              <Ionicons name="flash-outline" size={32} color={Colors.textLight} />
              <Text style={styles.noActivityText}>No recent updates</Text>
            </View>
          ) : (
            items.slice(0, 4).map((item, i) => (
              <View key={i} style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: Colors.primary + '12' }]}>
                  <Ionicons name="flash" size={16} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityText} numberOfLines={1}>{item.title || 'New activity'}</Text>
                  <Text style={styles.activityTime}>{timeAgo(item.createdAt)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Sticky Footer */}
      <AppFooter active="home" />
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label, color, onPress }: any) {
  const CardContent = (
    <>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable 
        onPress={onPress} 
        style={({ pressed }) => [
          styles.statCard, 
          { borderLeftColor: color },
          { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }
        ]}
      >
        {CardContent}
      </Pressable>
    );
  }

  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      {CardContent}
    </View>
  );
}

function timeAgo(dt: string) {
  if (!dt) return 'Just now';
  const diff = Date.now() - new Date(dt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuBtn: {
    padding: Spacing.xs,
    marginRight: Spacing.sm
  },
  headerTitleWrap: {
    flex: 1
  },
  greeting:      { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '500' },
  userName:      { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  notifDot: {
    position: 'absolute', top: 9, right: 9, width: 8, height: 8,
    borderRadius: 4, backgroundColor: Colors.error,
    borderWidth: 2, borderColor: '#FFFFFF',
  },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg,
  },
  statCard: {
    width: CARD_WIDTH, backgroundColor: Colors.surface,
    padding: Spacing.lg, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 4, gap: 2,
  },
  statValue: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text, marginTop: 4 },
  statLabel: { fontSize: FontSize.xs - 1, color: Colors.textLight, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primaryLight, padding: Spacing.md,
    borderRadius: BorderRadius.md, marginHorizontal: Spacing.lg, marginTop: Spacing.xl
  },
  infoBannerText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600', flex: 1 },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, marginTop: Spacing.xl, marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  seeAll:       { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },

  activityList: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  activityItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, padding: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border,
  },
  activityIcon:    { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  activityText:    { fontSize: FontSize.md - 1, fontWeight: '600', color: Colors.text },
  activityTime:    { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  noActivity:      { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  noActivityText:  { fontSize: FontSize.sm, color: Colors.textLight },
  pendingBadge: {
    backgroundColor: Colors.warningBg,
    borderColor: Colors.warning + '80',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  pendingBadgeText: {
    color: Colors.warning,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warningBg,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  pendingBannerTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.warning,
  },
  pendingBannerText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
});
