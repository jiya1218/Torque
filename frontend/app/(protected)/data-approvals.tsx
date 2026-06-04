import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import { useCacheStore } from '../../src/store/cacheStore';

export default function DataApprovalsScreen() {
  const { cache, setCache } = useCacheStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<any[]>(cache['/data/changes'] || []);
  const [refreshing, setRefreshing] = useState(false);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/data/changes');
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);
      setCache('/data/changes', arr);
    } catch (e) {
      console.error('[DataApprovalsScreen] Failed to load changes', e);
    }
  }, [setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  
  const onRefresh = async () => { 
    setRefreshing(true); 
    await load(); 
    setRefreshing(false); 
  };

  const openReviewModal = (req: any, type: 'approve' | 'reject') => {
    setSelectedReq(req);
    setActionType(type);
    setReviewNote('');
    setReviewModalOpen(true);
  };

  const handleReview = async () => {
    if (!selectedReq) return;

    setSaving(true);
    try {
      await api.patch(`/data/changes/${selectedReq.id}`, {
        action: actionType,
        reviewNote
      });
      setReviewModalOpen(false);
      Alert.alert('Success', `Change request ${actionType}d successfully!`);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || `Failed to ${actionType} request`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Data Approvals</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{items.filter(r => r.status === 'pending').length} pending</Text>
        </View>
      </View>

      <FlatList 
        data={items} 
        keyExtractor={i => i.id} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkbox-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No data change requests</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = StatusColors[item.status] || StatusColors.pending;
          const isPending = item.status === 'pending';
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.requesterName}>{item.requester?.fullName || 'Requester'}</Text>
                  <Text style={styles.requestedAt}>{new Date(item.requestedAt).toLocaleString()}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.badgeText, { color: sc.text }]}>{item.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.changeDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Entity:</Text>
                  <Text style={styles.detailVal}>{item.entityType}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Field:</Text>
                  <Text style={[styles.detailVal, { color: Colors.primary, fontWeight: '700' }]}>{item.field}</Text>
                </View>
                <View style={styles.changeRow}>
                  <View style={styles.valBox}>
                    <Text style={styles.valTitle}>OLD VALUE</Text>
                    <Text style={styles.oldValText} numberOfLines={2}>{item.oldValue || '(empty)'}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={Colors.textLight} style={{ alignSelf: 'center' }} />
                  <View style={styles.valBox}>
                    <Text style={styles.valTitle}>NEW VALUE</Text>
                    <Text style={styles.newValText} numberOfLines={2}>{item.newValue}</Text>
                  </View>
                </View>
                {item.reason ? (
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonLabel}>Reason:</Text>
                    <Text style={styles.reasonText}>&quot;{item.reason}&quot;</Text>
                  </View>
                ) : null}
              </View>

              {isPending ? (
                <View style={styles.actions}>
                  <Pressable 
                    style={[styles.actionBtn, styles.rejectBtn]} 
                    onPress={() => openReviewModal(item, 'reject')}
                  >
                    <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
                    <Text style={styles.rejectText}>Reject</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.actionBtn, styles.approveBtn]} 
                    onPress={() => openReviewModal(item, 'approve')}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                    <Text style={styles.approveText}>Approve</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.reviewedByBox}>
                  <Text style={styles.reviewedByText}>
                    Reviewed by: {item.reviewer?.fullName || 'Reviewer'}
                  </Text>
                  {item.reviewNote ? (
                    <Text style={styles.reviewNote}>Note: &quot;{item.reviewNote}&quot;</Text>
                  ) : null}
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Review Modal */}
      <Modal visible={reviewModalOpen} transparent animationType="fade" onRequestClose={() => setReviewModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </Text>
            <Text style={styles.modalDesc}>
              Do you want to {actionType} this data modification? You can optionally add a note below.
            </Text>

            <TextInput 
              style={styles.textArea} 
              multiline
              numberOfLines={4}
              placeholder="Add optional note here..." 
              placeholderTextColor={Colors.textLight} 
              value={reviewNote}
              onChangeText={setReviewNote}
            />

            <View style={styles.modalBtnRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setReviewModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.submitBtn, actionType === 'approve' ? styles.submitApprove : styles.submitReject]} 
                onPress={handleReview}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {actionType === 'approve' ? 'Approve' : 'Reject'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: '#FFFFFF', gap: Spacing.md },
  menuBtn: { padding: Spacing.xs },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  countBadge: { backgroundColor: Colors.warning + '18', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.md },
  countText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.warning },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginHorizontal: Spacing.xs },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  requesterName: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  requestedAt: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: FontSize.xs - 1, fontWeight: '800' },
  changeDetails: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.xs, marginBottom: Spacing.md },
  detailRow: { flexDirection: 'row', gap: Spacing.xs },
  detailLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  detailVal: { fontSize: FontSize.xs, color: Colors.text, fontWeight: '700' },
  changeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border + '50' },
  valBox: { flex: 1, gap: 2 },
  valTitle: { fontSize: 8, fontWeight: '800', color: Colors.textLight, letterSpacing: 1 },
  oldValText: { fontSize: FontSize.sm - 1, color: Colors.textMuted, textDecorationLine: 'line-through' },
  newValText: { fontSize: FontSize.sm - 1, color: Colors.success, fontWeight: '800' },
  reasonBox: { marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border + '50', paddingTop: Spacing.sm },
  reasonLabel: { fontSize: 9, fontWeight: '800', color: Colors.textLight, textTransform: 'uppercase' },
  reasonText: { fontSize: FontSize.sm, color: Colors.textMuted, fontStyle: 'italic', marginTop: 1 },
  actions: { flexDirection: 'row', gap: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border + '50', paddingTop: Spacing.md },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, height: 40, borderRadius: BorderRadius.md },
  rejectBtn: { borderWidth: 1, borderColor: Colors.error + '40', backgroundColor: '#FFF5F5' },
  rejectText: { color: Colors.error, fontWeight: '700', fontSize: FontSize.sm },
  approveBtn: { backgroundColor: Colors.success },
  approveText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  reviewedByBox: { borderTopWidth: 1, borderTopColor: Colors.border + '50', paddingTop: Spacing.sm, gap: 2 },
  reviewedByText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  reviewNote: { fontSize: FontSize.sm - 1, color: Colors.textLight, fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: BorderRadius.lg, width: '85%', padding: Spacing.xl },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs },
  modalDesc: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.md, lineHeight: 18 },
  textArea: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.background, padding: Spacing.md, fontSize: FontSize.md, color: Colors.text, textAlignVertical: 'top', height: 100, marginBottom: Spacing.lg },
  modalBtnRow: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, height: 46, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { color: Colors.textMuted, fontWeight: '700', fontSize: FontSize.sm },
  submitBtn: { flex: 1, height: 46, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  submitApprove: { backgroundColor: Colors.success },
  submitReject: { backgroundColor: Colors.error },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: FontSize.sm }
});
