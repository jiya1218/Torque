import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCacheStore } from '../../src/store/cacheStore';
import Sidebar from '../../src/components/Sidebar';

export default function DataApprovalsScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();

  const [requests, setRequests] = useState<any[]>(cache['/data/changes']?.items || []);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filter, setFilter] = useState('pending');

  // Modal review state
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load cache on mount
  useEffect(() => {
    loadCache().then(() => {
      const cached = cache['/data/changes'];
      if (cached && cached.items) {
        setRequests(cached.items);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const data = await api.get<any[]>(`/data/changes${statusParam}`);
      const arr = Array.isArray(data) ? data : [];
      setRequests(arr);
      setCache('/data/changes', { items: arr });
    } catch (e) {
      console.error('[DataApprovalsScreen] Failed to load data changes', e);
    }
  }, [filter, setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleReviewTrigger = (req: any, action: 'approve' | 'reject') => {
    setSelectedRequest(req);
    setReviewAction(action);
    setReviewNote('');
    setReviewModalVisible(true);
  };

  const handleSaveReview = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      await api.patch(`/data/changes/${selectedRequest.id}`, {
        action: reviewAction,
        reviewNote: reviewNote.trim() || null
      });
      setReviewModalVisible(false);
      Alert.alert('Success', `Request has been ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully.`);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to review request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Sidebar Component */}
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Data Approvals</Text>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {['pending', 'approved', 'rejected', 'all'].map(s => (
          <Pressable key={s} style={[styles.chip, filter === s && styles.chipActive]} onPress={() => setFilter(s)}>
            <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      <FlatList 
        data={requests} 
        keyExtractor={i => i.id} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkbox-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No change requests found</Text>
          </View>
        }
        renderItem={({ item }) => {
          let statusColor = Colors.primary;
          if (item.status === 'approved') statusColor = Colors.success;
          if (item.status === 'rejected') statusColor = Colors.error;

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.entityTitle}>{item.entityType.toUpperCase()} ({item.entityId.substring(0, 8)}…)</Text>
                  <Text style={styles.requester}>Requested by {item.requester?.fullName || item.requester?.email || 'Staff'}</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: statusColor + '20', backgroundColor: statusColor + '10' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
                </View>
              </View>

              {item.leadDetails && (
                <View style={styles.leadDetailsContainer}>
                  <Text style={styles.leadDetailsTitle}>Lead Info</Text>
                  <View style={styles.leadDetailsRow}>
                    <View style={styles.leadDetailsCol}>
                      <Text style={styles.leadDetailsLabel}>Name</Text>
                      <Text style={styles.leadDetailsText}>{item.leadDetails.clientName || '—'}</Text>
                    </View>
                    <View style={styles.leadDetailsCol}>
                      <Text style={styles.leadDetailsLabel}>Phone</Text>
                      <Text style={styles.leadDetailsText}>{item.leadDetails.contactNo || '—'}</Text>
                    </View>
                    <View style={styles.leadDetailsCol}>
                      <Text style={styles.leadDetailsLabel}>Vehicle</Text>
                      <Text style={styles.leadDetailsText}>{item.leadDetails.vehicleNo || '—'}</Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.changeDetails}>
                <Text style={styles.fieldLabel}>Field: <Text style={{ color: Colors.text, fontWeight: '700' }}>{item.field}</Text></Text>
                <View style={styles.valuesRow}>
                  <View style={styles.valueBox}>
                    <Text style={styles.boxTitle}>Old Value</Text>
                    <Text style={styles.boxVal}>{item.oldValue || '—'}</Text>
                  </View>
                  <Ionicons name="arrow-forward-outline" size={16} color={Colors.textLight} style={{ marginHorizontal: 4 }} />
                  <View style={styles.valueBox}>
                    <Text style={styles.boxTitle}>New Value</Text>
                    <Text style={[styles.boxVal, { color: Colors.success, fontWeight: '700' }]}>{item.newValue}</Text>
                  </View>
                </View>
              </View>

              {item.reason ? (
                <Text style={styles.reasonText}>Reason: &quot;{item.reason}&quot;</Text>
              ) : null}

              {item.status === 'pending' ? (
                <View style={styles.actions}>
                  <Pressable 
                    style={[styles.btn, styles.approveBtn]} 
                    onPress={() => handleReviewTrigger(item, 'approve')}
                  >
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                    <Text style={styles.btnText}>Approve</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.btn, styles.rejectBtn]} 
                    onPress={() => handleReviewTrigger(item, 'reject')}
                  >
                    <Ionicons name="close" size={16} color={Colors.white} />
                    <Text style={styles.btnText}>Reject</Text>
                  </Pressable>
                </View>
              ) : (
                item.reviewNote && (
                  <View style={styles.reviewNoteBox}>
                    <Text style={styles.reviewNoteTitle}>Review Note</Text>
                    <Text style={styles.reviewNoteText}>{item.reviewNote}</Text>
                  </View>
                )
              )}
            </View>
          );
        }}
      />

      {/* ── Action Review Modal ── */}
      <Modal
        visible={reviewModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {reviewAction === 'approve' ? 'Approve' : 'Reject'} Change Request
              </Text>
              <Pressable onPress={() => setReviewModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.descText}>
                Are you sure you want to {reviewAction} this data change? Any approved change will overwrite the current live value.
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>REVIEW NOTE / COMMENTS (OPTIONAL)</Text>
                <TextInput
                  style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: Spacing.sm }]}
                  placeholder="Explain why this request is approved or rejected..."
                  placeholderTextColor={Colors.textLight}
                  multiline
                  numberOfLines={4}
                  value={reviewNote}
                  onChangeText={setReviewNote}
                />
              </View>

              <Pressable 
                style={[
                  styles.submitBtn, 
                  reviewAction === 'approve' ? { backgroundColor: Colors.success } : { backgroundColor: Colors.error }
                ]} 
                onPress={handleSaveReview} 
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>
                    Confirm {reviewAction === 'approve' ? 'Approval' : 'Rejection'}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md, backgroundColor: '#FFFFFF' },
  menuBtn: { padding: Spacing.xs },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingVertical: Spacing.sm, backgroundColor: '#FFFFFF' },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted, textTransform: 'capitalize' },
  chipTextActive: { color: Colors.white },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.sm, marginBottom: Spacing.sm },
  entityTitle: { fontSize: FontSize.md - 1, fontWeight: '800', color: Colors.text },
  requester: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, borderWidth: 1 },
  statusText: { fontSize: FontSize.xs - 1, fontWeight: '700' },
  changeDetails: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.xs },
  valuesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.xs, marginTop: Spacing.xs },
  valueBox: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: Spacing.md, borderRadius: BorderRadius.sm },
  boxTitle: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 2 },
  boxVal: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '500' },
  reasonText: { fontSize: FontSize.xs, fontStyle: 'italic', color: Colors.textLight, marginBottom: Spacing.md },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  btn: { flex: 1, flexDirection: 'row', height: 40, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', gap: Spacing.xs },
  btnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  approveBtn: { backgroundColor: Colors.success },
  rejectBtn: { backgroundColor: Colors.error },
  reviewNoteBox: { backgroundColor: '#F8FAFC', padding: Spacing.md, borderRadius: BorderRadius.sm, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  reviewNoteTitle: { fontSize: FontSize.xs - 1, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase' },
  reviewNoteText: { fontSize: FontSize.xs, color: Colors.text, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '60%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  closeBtn: { padding: Spacing.xs },
  modalBody: { flex: 1, marginTop: Spacing.lg },
  descText: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 20, marginBottom: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  submitBtn: { height: 52, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl },
  submitBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  leadDetailsContainer: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.md },
  leadDetailsTitle: { fontSize: FontSize.xs - 1, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: Spacing.sm },
  leadDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  leadDetailsCol: { flex: 1 },
  leadDetailsLabel: { fontSize: 9, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase', marginBottom: 2 },
  leadDetailsText: { fontSize: FontSize.sm - 1, color: Colors.text, fontWeight: '500' },
});
