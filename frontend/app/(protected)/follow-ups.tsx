import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert, StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import AppFooter from '../../src/components/AppFooter';

export default function FollowUpsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>(`/follow-ups?status=${filter}`);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      console.error('[FollowUpsScreen] Failed to load follow-ups');
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleComplete = async (item: any) => {
    Alert.alert(
      'Complete Task',
      `Are you sure you want to mark follow-up for ${item.leadName || item.lead?.clientName || 'this lead'} as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: async () => {
            try {
              await api.patch(`/follow-ups/${item.id}`, { status: 'completed' });
              Alert.alert('Success', 'Follow-up marked as completed.');
              load();
            } catch {
              Alert.alert('Error', 'Failed to update follow-up status.');
            }
          },
        },
      ]
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'call':
        return { name: 'call-outline' as const, color: '#3b82f6', bg: '#eff6ff' };
      case 'whatsapp':
        return { name: 'logo-whatsapp' as const, color: '#10b981', bg: '#ecfdf5' };
      case 'visit':
        return { name: 'location-outline' as const, color: '#ef4444', bg: '#fff1f2' };
      default:
        return { name: 'checkbox-outline' as const, color: '#8b5cf6', bg: '#f5f3ff' };
    }
  };

  const getStatusStyle = (status: string) => {
    const key = status?.toLowerCase() || 'pending';
    return StatusColors[key] || StatusColors.pending;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Follow-ups</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{items.length}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['pending', 'completed', 'all'] as const).map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              style={[
                styles.filterTab,
                active && styles.filterTabActive,
              ]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  active && styles.filterTextActive,
                ]}
              >
                {f.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={52} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No scheduled follow-ups</Text>
            <Text style={styles.emptyText}>Tasks matching "{filter}" will appear here</Text>
          </View>
        }
        renderItem={({ item }) => {
          const typeStyle = getTypeIcon(item.type);
          const statStyle = getStatusStyle(item.status);
          const scheduledDate = new Date(item.scheduledAt);

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.leadInfo}>
                  <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg }]}>
                    <Ionicons name={typeStyle.name} size={16} color={typeStyle.color} />
                  </View>
                  <View>
                    <Text style={styles.leadName}>
                      {item.leadName || item.lead?.clientName || 'Unnamed Lead'}
                    </Text>
                    <Text style={styles.typeText}>{item.type?.toUpperCase()}</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statStyle.bg, borderColor: statStyle.bg },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statStyle.text }]}>
                    {item.status?.toUpperCase()}
                  </Text>
                </View>
              </View>

              {item.notes ? (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesText} numberOfLines={3}>
                    "{item.notes}"
                  </Text>
                </View>
              ) : null}

              <View style={styles.cardFooter}>
                <View style={styles.timeContainer}>
                  <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.timeText}>
                    {scheduledDate.toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    at{' '}
                    {scheduledDate.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                {item.status === 'pending' ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.completeBtn,
                      pressed && styles.completeBtnPressed,
                    ]}
                    onPress={() => handleComplete(item)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.completeBtnText}>Complete</Text>
                  </Pressable>
                ) : (
                  item.completedAt && (
                    <View style={styles.completedAtContainer}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={Colors.success}
                      />
                      <Text style={styles.completedAtText}>Done</Text>
                    </View>
                  )
                )}
              </View>
            </View>
          );
        }}
      />

      <AppFooter active="follow-ups" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#FFFFFF',
    gap: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  title: {
    flex: 1,
    fontSize: FontSize.xxl,
    fontWeight: '900',
    color: Colors.text,
  },
  countBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    minWidth: 32,
    alignItems: 'center',
  },
  countText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.md - 2,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterText: {
    fontSize: FontSize.sm - 1,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  filterTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xl + 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  leadInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  typeBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadName: {
    fontSize: FontSize.lg - 1,
    fontWeight: '800',
    color: Colors.text,
  },
  typeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  notesContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  notesText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: Spacing.md,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeText: {
    fontSize: FontSize.sm - 1,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  completeBtnPressed: {
    opacity: 0.8,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs + 1,
    fontWeight: '800',
  },
  completedAtContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  completedAtText: {
    fontSize: FontSize.xs + 1,
    color: Colors.success,
    fontWeight: '800',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});
