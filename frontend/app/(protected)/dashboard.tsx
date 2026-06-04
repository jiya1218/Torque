import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Dimensions, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import AppFooter from '../../src/components/AppFooter';
import Sidebar from '../../src/components/Sidebar';
import { useCacheStore } from '../../src/store/cacheStore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - (Spacing.lg * 2) - Spacing.md) / 2;

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { cache, setCache, loadCache } = useCacheStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<any>(cache['/dashboard/stats'] || { leads: 0, revenue: 0, pending: 0, claims: 0 });
  const [items, setItems] = useState<any[]>(cache['/notifications'] || []);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCache().then(() => {
      if (cache['/dashboard/stats']) setStats(cache['/dashboard/stats']);
      if (cache['/notifications']) setItems(cache['/notifications']);
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

      const freshStats = { leads, revenue, pending, claims };
      const freshItems = nData.notifications || [];
      
      setStats(freshStats);
      setItems(freshItems);
      setCache('/dashboard/stats', freshStats);
      setCache('/notifications', freshItems);
    } catch {
      // Keep cached data on failure
    }
  }, [setCache]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const allModules = [
    { name: 'Leads',      icon: 'people',           color: '#3b82f6', route: '/(protected)/leads',      permission: 'lead.view' },
    { name: 'Finance',    icon: 'wallet',            color: '#10b981', route: '/(protected)/finance',    permission: 'accounts.view' },
    { name: 'CRM',        icon: 'person-add',        color: '#8b5cf6', route: '/(protected)/crm',        permission: 'crm.view' },
    { name: 'Claims',     icon: 'document-text',     color: '#f59e0b', route: '/(protected)/claims',     permission: 'claims.view' },
    { name: 'Visits',     icon: 'location',          color: '#f43f5e', route: '/(protected)/visits',     permission: 'visit.view' },
    { name: 'RTO',        icon: 'car',               color: '#ef4444', route: '/(protected)/rto',        permission: 'rto.view' },
    { name: 'Fitness',    icon: 'fitness',           color: '#06b6d4', route: '/(protected)/fitness',    permission: 'fitness.view' },
    { name: 'Quotations', icon: 'clipboard',         color: '#6366f1', route: '/(protected)/quotations',  permission: 'quotation.view' },
    { name: 'HR',         icon: 'people-circle',     color: '#ec4899', route: '/(protected)/hr',         permission: 'hr.view' },
    { name: 'Loans',      icon: 'cash',              color: '#84cc16', route: '/(protected)/loans',      permission: 'loan.view' },
    { name: 'Users',      icon: 'person',            color: '#14b8a6', route: '/(protected)/users',      permission: 'users.view' },
    { name: 'Settings',   icon: 'settings',          color: '#94a3b8', route: '/(protected)/settings' },
    { name: 'Alerts',     icon: 'notifications',     color: '#f97316', route: '/(protected)/notifications' },
  ];

  const modules = allModules.filter(m => {
    if (!m.permission) return true;
    const roleUpper = user?.role?.toUpperCase();
    if (roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN') return true;
    return user?.permissions?.includes(m.permission);
  });

  return (
    // edges={['top']} — footer handles bottom safe area itself
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => setSidebarOpen(true)} style={{ paddingRight: Spacing.md, justifyContent: 'center' }}>
            <Ionicons name="menu-outline" size={28} color={Colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.full_name || user?.name || 'Admin'}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/(protected)/notifications')} style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={22} color={Colors.text} />
              <View style={styles.notifDot} />
            </Pressable>
            <Pressable onPress={logout} style={[styles.iconBtn, { backgroundColor: Colors.errorBg }]}>
              <Ionicons name="log-out-outline" size={22} color={Colors.error} />
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard icon="people"           value={stats.leads}              label="Leads"   color="#3b82f6" />
          <StatCard icon="trending-up"      value={`₹${stats.revenue ?? 0}`} label="Revenue" color="#10b981" />
          <StatCard icon="time"             value={stats.pending}            label="Pending" color="#f59e0b" />
          <StatCard icon="shield-checkmark" value={stats.claims}             label="Claims"  color="#ef4444" />
        </View>

        {/* Modules */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Main Modules</Text>
        </View>
        <View style={styles.moduleGrid}>
          {modules.map((m) => (
            <Pressable
              key={m.name}
              style={({ pressed }) => [styles.moduleCard, pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}
              onPress={() => router.push(m.route as any)}
            >
              <View style={[styles.moduleIcon, { backgroundColor: m.color + '18' }]}>
                <Ionicons name={m.icon as any} size={26} color={m.color} />
              </View>
              <Text style={styles.moduleName}>{m.name}</Text>
            </Pressable>
          ))}
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

      {/* Sliding Sidebar */}
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label, color }: any) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  greeting:      { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '500' },
  userName:      { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width: 42, height: 42, borderRadius: 12,
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
  statLabel: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, marginTop: Spacing.xxl, marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  seeAll:       { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },

  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: Spacing.md },
  moduleCard: {
    width: CARD_WIDTH, backgroundColor: Colors.surface,
    paddingVertical: Spacing.xl, borderRadius: BorderRadius.xl,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  moduleIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  moduleName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },

  activityList: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  activityItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, padding: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border,
  },
  activityIcon:    { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  activityText:    { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  activityTime:    { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  noActivity:      { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  noActivityText:  { fontSize: FontSize.sm, color: Colors.textLight },
});
