import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - (Spacing.lg * 2) - Spacing.md) / 2;

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>({ leads: 0, revenue: 0, pending: 0, claims: 0 });
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sData, nData] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/notifications?limit=5')
      ]);
      setStats(sData);
      setItems(nData.notifications || []);
    } catch {
      setStats({ leads: 0, revenue: 0, pending: 0, claims: 0 });
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const modules = [
    { name: 'Leads', icon: 'people', color: '#3b82f6', route: '/(protected)/leads' },
    { name: 'Finance', icon: 'wallet', color: '#10b981', route: '/(protected)/finance' },
    { name: 'CRM', icon: 'person-add', color: '#8b5cf6', route: '/(protected)/crm' },
    { name: 'Claims', icon: 'document-text', color: '#f59e0b', route: '/(protected)/claims' },
    { name: 'Visits', icon: 'location', color: '#f43f5e', route: '/(protected)/visits' },
    { name: 'RTO', icon: 'car', color: '#ef4444', route: '/(protected)/rto' },
    { name: 'Fitness', icon: 'fitness', color: '#06b6d4', route: '/(protected)/fitness' },
    { name: 'Quotations', icon: 'clipboard', color: '#6366f1', route: '/(protected)/quotations' },
    { name: 'HR', icon: 'people-circle', color: '#ec4899', route: '/(protected)/hr' },
    { name: 'Loans', icon: 'cash', color: '#84cc16', route: '/(protected)/loans' },
    { name: 'Users', icon: 'person', color: '#14b8a6', route: '/(protected)/users' },
    { name: 'Settings', icon: 'settings', color: '#94a3b8', route: '/(protected)/settings' },
    { name: 'Alerts', icon: 'notifications', color: '#f97316', route: '/(protected)/notifications' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.full_name || 'Admin'}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable 
              onPress={() => router.push('/(protected)/notifications')} 
              style={styles.iconBtn}
            >
              <Ionicons name="notifications-outline" size={24} color={Colors.text} />
              <View style={styles.notifDot} />
            </Pressable>
            <Pressable onPress={logout} style={[styles.iconBtn, { backgroundColor: Colors.errorBg }]}>
              <Ionicons name="log-out-outline" size={24} color={Colors.error} />
            </Pressable>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <StatCard icon="people" value={stats.leads} label="Leads" color="#3b82f6" />
            <StatCard icon="trending-up" value={`₹${stats.revenue ?? 0}`} label="Revenue" color="#10b981" />
            <StatCard icon="time" value={stats.pending} label="Pending" color="#f59e0b" />
            <StatCard icon="shield-checkmark" value={stats.claims} label="Claims" color="#ef4444" />
          </View>
        </View>

        {/* Modules Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Main Modules</Text>
        </View>
        <View style={styles.moduleGrid}>
          {modules.map((m) => (
            <Pressable 
              key={m.name} 
              style={styles.moduleCard}
              onPress={() => router.push(m.route as any)}
            >
              <View style={[styles.moduleIcon, { backgroundColor: m.color + '15' }]}>
                <Ionicons name={m.icon as any} size={26} color={m.color} />
              </View>
              <Text style={styles.moduleName}>{m.name}</Text>
            </Pressable>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Updates</Text>
          <Pressable onPress={() => router.push('/(protected)/notifications')}>
            <Text style={styles.seeAll}>View All</Text>
          </Pressable>
        </View>
        <View style={styles.activityList}>
          {items.slice(0, 3).map((item, i) => (
            <View key={i} style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: Colors.primary + '10' }]}>
                <Ionicons name="flash" size={16} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityText} numberOfLines={1}>{item.title || 'New activity logged'}</Text>
                <Text style={styles.activityTime}>{timeAgo(item.createdAt)}</Text>
              </View>
            </View>
          ))}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
      {/* Sticky Bottom Footer Navigation */}
      <View style={styles.footer}>
        <Pressable style={styles.footerTab} onPress={() => router.push('/(protected)/dashboard')}>
          <Ionicons name="home" size={22} color={Colors.primary} />
          <Text style={[styles.footerText, { color: Colors.primary, fontWeight: '700' }]}>Home</Text>
        </Pressable>
        <Pressable style={styles.footerTab} onPress={() => router.push('/(protected)/leads')}>
          <Ionicons name="people-outline" size={22} color={Colors.textMuted} />
          <Text style={styles.footerText}>Leads</Text>
        </Pressable>
        <Pressable style={styles.footerTab} onPress={() => router.push('/(protected)/visits')}>
          <Ionicons name="location-outline" size={22} color={Colors.textMuted} />
          <Text style={styles.footerText}>Visits</Text>
        </Pressable>
        <Pressable style={styles.footerTab} onPress={() => router.push('/(protected)/settings')}>
          <Ionicons name="settings-outline" size={22} color={Colors.textMuted} />
          <Text style={styles.footerText}>Settings</Text>
        </Pressable>
      </View>
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
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  greeting: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '500' },
  userName: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  notifDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error, borderWidth: 2, borderColor: Colors.surface },
  
  statsSection: { paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  statCard: { 
    width: CARD_WIDTH, 
    backgroundColor: Colors.surface, 
    padding: Spacing.lg, 
    borderRadius: BorderRadius.lg, 
    borderWidth: 1, 
    borderColor: Colors.border,
    borderLeftWidth: 4,
    gap: 2
  },
  statValue: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text, marginTop: 4 },
  statLabel: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, marginTop: Spacing.xxl, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  seeAll: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: Spacing.md },
  moduleCard: { width: CARD_WIDTH, backgroundColor: Colors.surface, paddingVertical: Spacing.xl, borderRadius: BorderRadius.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  moduleIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  moduleName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  activityList: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border },
  activityIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  activityText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  activityTime: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 12 : 0,
  },
  footerTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    width: 60,
  },
  footerText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
});
