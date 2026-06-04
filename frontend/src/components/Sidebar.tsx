import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated, Dimensions, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../utils/theme';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.78;

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

export default function Sidebar({ visible, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const MENU_GROUPS = [
    {
      label: 'OVERVIEW',
      items: [
        { name: 'Dashboard', icon: 'home-outline', route: '/(protected)/dashboard' },
      ]
    },
    {
      label: 'SALES',
      items: [
        { name: 'Leads', icon: 'people-outline', route: '/(protected)/leads' },
        { name: 'Import Leads', icon: 'cloud-upload-outline', route: '/(protected)/leads/import' },
        { name: 'CRM', icon: 'person-add-outline', route: '/(protected)/crm' },
        { name: 'Quotations', icon: 'clipboard-outline', route: '/(protected)/quotations' },
        { name: 'Policies', icon: 'shield-checkmark-outline', route: '/(protected)/policies' },
        { name: 'Follow-ups', icon: 'calendar-outline', route: '/(protected)/follow-ups' },
      ]
    },
    {
      label: 'OPERATIONS',
      items: [
        { name: 'Claims', icon: 'document-text-outline', route: '/(protected)/claims' },
        { name: 'Loans', icon: 'cash-outline', route: '/(protected)/loans' },
        { name: 'RTO Work', icon: 'car-outline', route: '/(protected)/rto' },
        { name: 'Fitness', icon: 'analytics-outline', route: '/(protected)/fitness' },
      ]
    },
    {
      label: 'MANAGEMENT',
      items: [
        { name: 'Users', icon: 'people-circle-outline', route: '/(protected)/users' },
        { name: 'Roles & Permissions', icon: 'lock-closed-outline', route: '/(protected)/roles' },
        { name: 'Data Approvals', icon: 'checkbox-outline', route: '/(protected)/data-approvals' },
        { name: 'Finance', icon: 'wallet-outline', route: '/(protected)/finance' },
        { name: 'HR', icon: 'ribbon-outline', route: '/(protected)/hr' },
        { name: 'Lead Responses', icon: 'chatbox-ellipses-outline', route: '/(protected)/lead-responses' },
        { name: 'Settings', icon: 'settings-outline', route: '/(protected)/settings' },
      ]
    }
  ];

  const role = (user?.role || 'EXECUTIVE').toUpperCase();
  const isExecutive = role.endsWith('EXECUTIVE') || role === 'VIEWER';

  const filteredGroups = MENU_GROUPS.map(group => {
    let items = [...group.items];

    if (isExecutive) {
      if (group.label === 'MANAGEMENT') return null;
      if (group.label === 'OPERATIONS') {
        items = items.filter(i => ['Claims', 'Loans'].includes(i.name));
      }
      items = items.filter(i => !['CRM'].includes(i.name));
    } else if (role === 'MANAGER') {
      if (group.label === 'OPERATIONS') return null;
      if (group.label === 'SALES') {
        items = items.filter(i => ['Leads', 'CRM', 'Quotations', 'Follow-ups'].includes(i.name));
      }
      if (group.label === 'MANAGEMENT') {
        items = items.filter(i => ['Users', 'Settings'].includes(i.name));
      }
    }

    return { ...group, items };
  }).filter(Boolean) as typeof MENU_GROUPS;

  const handleNavigate = (route: string) => {
    onClose();
    // Prevent navigating to the exact same screen
    if (pathname !== route) {
      router.push(route as any);
    }
  };

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <Ionicons name="compass" size={26} color={Colors.primary} />
              <Text style={styles.appName}>TORQUE</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
            {filteredGroups.map((group) => (
              <View key={group.label} style={styles.group}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                {group.items.map((item) => {
                  const isActive = pathname.startsWith(item.route.replace('/(protected)', ''));
                  return (
                    <Pressable
                      key={item.name}
                      style={[styles.menuItem, isActive && styles.menuItemActive]}
                      onPress={() => handleNavigate(item.route)}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color={isActive ? Colors.primary : Colors.textLight}
                        style={styles.menuIcon}
                      />
                      <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
                        {item.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
          <View style={styles.footer}>
            <View style={styles.userInfo}>
              <Text style={styles.userLabel}>Logged in as</Text>
              <Text style={styles.userName} numberOfLines={1}>{user?.full_name || user?.name || 'User'}</Text>
              <Text style={styles.userRole}>{user?.role || 'Executive'}</Text>
            </View>
            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color={Colors.error} />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 20
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl + 10,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  appName: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.primary, letterSpacing: 1.5 },
  closeBtn: { padding: Spacing.xs },
  menu: { flex: 1, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm },
  group: { marginBottom: Spacing.md },
  groupLabel: { fontSize: 10, fontWeight: '800', color: Colors.textLight, letterSpacing: 1.5, marginBottom: Spacing.xs, paddingHorizontal: Spacing.md },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: 2
  },
  menuItemActive: { backgroundColor: Colors.primaryLight },
  menuIcon: { marginRight: Spacing.md },
  menuText: { fontSize: FontSize.sm + 1, fontWeight: '600', color: Colors.text },
  menuTextActive: { color: Colors.primary, fontWeight: '800' },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: '#FAFAFA'
  },
  userInfo: { marginBottom: Spacing.md },
  userLabel: { fontSize: 9, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase' },
  userName: { fontSize: FontSize.md - 1, fontWeight: '800', color: Colors.text, marginTop: 1 },
  userRole: { fontSize: 10, fontWeight: '600', color: Colors.primary, marginTop: 1, textTransform: 'uppercase' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  logoutText: { color: Colors.error, fontSize: FontSize.sm, fontWeight: '700' },
});
