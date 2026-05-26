import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar } from 'react-native';
import AppFooter from '../../src/components/AppFooter';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const sections = [
    { title: 'Account', items: [
      { label: 'Profile', icon: 'person-outline', desc: 'Manage your profile information' },
      { label: 'Change PIN', icon: 'keypad-outline', desc: 'Update your 4-digit PIN' },
      { label: 'Security', icon: 'shield-outline', desc: 'Password and authentication' },
    ]},
    { title: 'App Settings', items: [
      { label: 'Notifications', icon: 'notifications-outline', desc: 'Manage push notifications', onPress: () => router.push('/(protected)/notifications') },
      { label: 'Data & Storage', icon: 'cloud-outline', desc: 'Cache and data management' },
      { label: 'Language', icon: 'language-outline', desc: 'App language preferences' },
    ]},
    { title: 'About', items: [
      { label: 'Help & Support', icon: 'help-circle-outline', desc: 'Get help and FAQs' },
      { label: 'Terms of Service', icon: 'document-outline', desc: 'Terms and conditions' },
      { label: 'Privacy Policy', icon: 'lock-closed-outline', desc: 'How we handle your data' },
      { label: 'Version', icon: 'information-circle-outline', desc: 'Torque Auto Advisor v1.0.0' },
    ]},
  ];

  // Group permissions by module
  const permGroups: Record<string, string[]> = {};
  (user?.permissions || []).forEach(p => {
    const [mod, action] = p.split('.');
    if (!permGroups[mod]) permGroups[mod] = [];
    permGroups[mod].push(action);
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.scroll}>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || '?'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || user?.full_name || '—'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          {!user?.is_active && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Pending Approval</Text>
            </View>
          )}
        </View>

        {/* My Role Card */}
        <View style={styles.roleCard}>
          <View style={styles.roleHeader}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
            <Text style={styles.roleName}>{user?.role || 'No Role Assigned'}</Text>
          </View>

          {Object.keys(permGroups).length > 0 ? (
            <>
              <Text style={styles.roleSubtitle}>Your Permissions</Text>
              <View style={styles.permGrid}>
                {Object.entries(permGroups).map(([mod, actions]) => (
                  <View key={mod} style={styles.permModule}>
                    <Text style={styles.permModName}>{mod.toUpperCase()}</Text>
                    <View style={styles.permActions}>
                      {actions.map(a => (
                        <View key={a} style={styles.permChip}>
                          <Text style={styles.permChipText}>{a.replace(/_/g, ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.noPerms}>No permissions assigned. Contact your admin.</Text>
          )}
        </View>

        {/* Settings Sections */}
        {sections.map((sec, si) => (
          <View key={si}>
            <Text style={styles.sectionTitle}>{sec.title.toUpperCase()}</Text>
            {sec.items.map((item: any, ii) => (
              <Pressable
                key={ii}
                testID={`setting-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                style={styles.item}
                onPress={item.onPress}
              >
                <Ionicons name={item.icon as any} size={22} color={Colors.textMuted} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={styles.itemDesc}>{item.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
              </Pressable>
            ))}
          </View>
        ))}

        <Pressable
          testID="logout-btn"
          style={styles.logoutBtn}
          onPress={async () => { await logout(); router.replace('/'); }}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
        <View style={{ height: 40 }} />
      </ScrollView>
      <AppFooter active="settings" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border
  },
  title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text },
  scroll: { flex: 1 },

  profileCard: {
    backgroundColor: Colors.white, margin: Spacing.lg, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2
  },
  avatar: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center'
  },
  avatarText: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: '900' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  profileEmail: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  pendingBadge: {
    backgroundColor: Colors.warningBg, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full
  },
  pendingText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.warning },

  roleCard: {
    backgroundColor: Colors.white, marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    borderWidth: 1, borderColor: Colors.primaryLight
  },
  roleHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  roleName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  roleSubtitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight, letterSpacing: 1, marginBottom: Spacing.md },
  permGrid: { gap: Spacing.md },
  permModule: {},
  permModName: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.xs },
  permActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  permChip: {
    backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: BorderRadius.full
  },
  permChipText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
  noPerms: { fontSize: FontSize.sm, color: Colors.textLight, fontStyle: 'italic' },

  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight,
    letterSpacing: 1.2, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
    marginTop: Spacing.md
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceMuted
  },
  itemInfo: { flex: 1 },
  itemLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  itemDesc: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, margin: Spacing.xl,
    paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.errorBg, borderWidth: 1, borderColor: Colors.error + '30'
  },
  logoutText: { fontSize: FontSize.md, fontWeight: '800', color: Colors.error }
});
