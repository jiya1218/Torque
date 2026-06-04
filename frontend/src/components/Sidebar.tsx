import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated, Dimensions, ScrollView, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../utils/theme';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

export default function Sidebar({ visible, onClose }: SidebarProps) {
  const router = useRouter();
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

  if (!visible) return null;

  const MENU_GROUPS = [
    {
      label: 'OVERVIEW',
      items: [
        { name: 'Dashboard', icon: 'home-outline', route: '/(protected)/dashboard' },
        { name: 'Reports', icon: 'bar-chart-outline', route: '/(protected)/reports' },
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
        { name: 'Fitness', icon: 'fitness-outline', route: '/(protected)/fitness' },
      ]
    },
    {
      label: 'MANAGEMENT',
      items: [
        { name: 'Users', icon: 'person-outline', route: '/(protected)/users' },
        { name: 'Onboarding Approvals', icon: 'checkmark-circle-outline', route: '/(protected)/onboarding-approvals' },
        { name: 'Roles & Permissions', icon: 'ribbon-outline', route: '/(protected)/roles' },
        { name: 'Data Approvals', icon: 'checkbox-outline', route: '/(protected)/data-approvals' },
        { name: 'Finance', icon: 'wallet-outline', route: '/(protected)/finance' },
        { name: 'HR', icon: 'people-circle-outline', route: '/(protected)/hr' },
        { name: 'Lead Responses', icon: 'chatbubble-ellipses-outline', route: '/(protected)/responses' },
        { name: 'Settings', icon: 'settings-outline', route: '/(protected)/settings' },
      ]
    }
  ];

  const handleNavigate = (route: string) => {
    onClose();
    router.push(route as any);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <View style={styles.container}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Drawer Content */}
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoWrap}>
              <Image 
                source={require('../../assets/images/logo.png')} 
                style={styles.logoImage} 
                resizeMode="contain"
              />
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>

          {/* Navigation Links */}
          <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
            {MENU_GROUPS.map((group) => (
              <View key={group.label} style={styles.group}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                {group.items.map((item) => (
                  <Pressable
                    key={item.name}
                    style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                    onPress={() => handleNavigate(item.route)}
                  >
                    <Ionicons name={item.icon as any} size={20} color={Colors.primary} style={styles.menuIcon} />
                    <Text style={styles.menuText}>{item.name}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.userLabel}>Logged in as</Text>
            <Text style={styles.userName} numberOfLines={1}>{user?.full_name || user?.name || 'User'}</Text>
            <Text style={styles.userRole}>{user?.role || 'Executive'}</Text>
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
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  drawer: { 
    width: DRAWER_WIDTH, 
    height: '100%', 
    backgroundColor: Colors.background, 
    borderTopRightRadius: BorderRadius.lg, 
    borderBottomRightRadius: BorderRadius.lg, 
    shadowColor: '#000', 
    shadowOffset: { width: 4, height: 0 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 10, 
    elevation: 16 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'flex-start',
    paddingLeft: Spacing.xs, 
    paddingRight: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 55 : 45, 
    paddingBottom: Spacing.md, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.border, 
    backgroundColor: 'transparent',
    position: 'relative'
  },
  logoWrap: { 
    backgroundColor: 'transparent',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%'
  },
  logoImage: { 
    width: 220, 
    height: 60,
    marginLeft: -10,
    backgroundColor: 'transparent'
  },
  closeBtn: { 
    position: 'absolute',
    right: Spacing.md,
    top: Platform.OS === 'ios' ? 55 : 45,
    padding: Spacing.xs
  },
  menu: { flex: 1, padding: Spacing.md },
  group: { marginBottom: Spacing.lg },
  groupLabel: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: Spacing.sm, paddingHorizontal: Spacing.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.md, marginBottom: 2 },
  menuItemPressed: { backgroundColor: Colors.surfaceMuted },
  menuIcon: { marginRight: Spacing.md },
  menuText: { fontSize: FontSize.md - 1, fontWeight: '600', color: Colors.text },
  footer: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: 'transparent' },
  userLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  userName: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginTop: 2 },
  userRole: { fontSize: 10, fontWeight: '600', color: Colors.primary, marginTop: 1, textTransform: 'uppercase' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md, paddingVertical: Spacing.sm },
  logoutText: { color: Colors.error, fontSize: FontSize.sm, fontWeight: '700' },
});
