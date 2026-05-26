/**
 * AppFooter – shared sticky bottom tab bar used on all main screens.
 * Handles Android bottom padding automatically via useSafeAreaInsets.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';

const TABS = [
  { label: 'Home',       icon: 'home',             iconOutline: 'home-outline',     route: '/(protected)/dashboard' },
  { label: 'Leads',      icon: 'people',            iconOutline: 'people-outline',   route: '/(protected)/leads'     },
  { label: 'Follow-ups', icon: 'calendar',          iconOutline: 'calendar-outline', route: '/(protected)/follow-ups' },
  { label: 'Settings',   icon: 'settings',          iconOutline: 'settings-outline', route: '/(protected)/settings'  },
];

interface Props {
  active?: 'home' | 'leads' | 'follow-ups' | 'settings';
}

export default function AppFooter({ active }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const insets   = useSafeAreaInsets();

  const isActive = (route: string) => {
    if (active) {
      const map: Record<string, string> = {
        home: '/(protected)/dashboard',
        leads: '/(protected)/leads',
        'follow-ups': '/(protected)/follow-ups',
        settings: '/(protected)/settings',
      };
      return map[active] === route;
    }
    return pathname.startsWith(route.replace('/(protected)', ''));
  };

  return (
    <View
      style={[
        styles.footer,
        // On Android, insets.bottom is 0 — use a fixed baseline padding
        { paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8 },
      ]}
    >
      {TABS.map((tab) => {
        const active = isActive(tab.route);
        return (
          <Pressable
            key={tab.label}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            onPress={() => router.push(tab.route as any)}
          >
            <Ionicons
              name={(active ? tab.icon : tab.iconOutline) as any}
              size={24}
              color={active ? Colors.primary : '#94a3b8'}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </Text>
            {active && <View style={styles.activeDot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
    position: 'relative',
  },
  tabPressed: { opacity: 0.7 },
  label: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  activeDot: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -12,
    width: 24,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
});
