import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  RefreshControl, Modal, ScrollView, Linking, Alert, ActivityIndicator
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { usersService, User, Document } from '../../src/services/users';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';

export default function UsersScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [items, setItems] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [remarkVisible, setRemarkVisible] = useState(false);
  const [remarkText, setRemarkText] = useState('');

  const roleUpper = currentUser?.role?.toUpperCase();
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN' || roleUpper === 'HR';

  const load = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await usersService.list({ limit: 100 });
      // Client-side search filter
      const filtered = search
        ? data.filter(u =>
            u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase())
          )
        : data;
      setItems(filtered);
      setTotal(filtered.length);

      // If a user detail was open, refresh their data too
      if (selectedUser) {
        const updated = filtered.find(u => u.id === selectedUser.id);
        if (updated) setSelectedUser(updated);
      }
    } catch (e) {
      console.error('[UsersScreen] Failed to load users', e);
    }
  }, [search, isAdmin, selectedUser]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  
  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleApprove = async (userId: string) => {
    setActionLoading(true);
    try {
      await usersService.update(userId, { is_active: true });
      Alert.alert('Success', 'User profile approved and activated.');
      setDetailVisible(false);
      setSelectedUser(null);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to approve application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = (userId: string) => {
    Alert.alert(
      'Reject Application',
      'Are you sure you want to permanently delete this application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject & Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await usersService.delete(userId, true);
              Alert.alert('Deleted', 'Application rejected and deleted.');
              setDetailVisible(false);
              setSelectedUser(null);
              load();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete application');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSendRevision = async () => {
    if (!remarkText.trim() || !selectedUser) return;
    setActionLoading(true);
    try {
      await usersService.update(selectedUser.id, { onboardingRemark: remarkText });
      Alert.alert('Sent', 'Revision requested from applicant.');
      setRemarkVisible(false);
      setRemarkText('');
      setDetailVisible(false);
      setSelectedUser(null);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit revision request');
    } finally {
      setActionLoading(false);
    }
  };

  const getDocLabel = (fileName: string) => {
    const docDisplayNames: Record<string, string> = {
      ADHAR: 'Aadhaar Card',
      PAN: 'PAN Card',
      SSC: 'SSC Marksheet',
      QUALIFICATION: 'Highest Degree Cert',
      LEAVING: 'Leaving Certificate',
      PHOTO: 'Passport Photo'
    };
    return docDisplayNames[fileName.toUpperCase()] || fileName;
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.title}>Access Denied</Text>
        </View>
        <View style={styles.empty}>
          <Ionicons name="lock-closed" size={48} color={Colors.error} />
          <Text style={styles.emptyText}>You do not have permission to view this screen.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Users</Text>
        <Text style={styles.count}>{total}</Text>
      </View>

      {/* Search Row */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            testID="user-search"
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={load}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Users List */}
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isPending = !item.is_active;
          const isResubmitted = item.onboardingUpdated;
          const hasRevision = !!item.onboardingRemark;

          return (
            <Pressable
              style={styles.card}
              onPress={() => {
                setSelectedUser(item);
                setDetailVisible(true);
              }}
            >
              <View style={styles.cardRow}>
                <View style={[
                  styles.avatar,
                  { backgroundColor: item.is_active ? Colors.primaryLight : Colors.warningBg }
                ]}>
                  <Text style={[
                    styles.avatarText,
                    { color: item.is_active ? Colors.primary : Colors.warning }
                  ]}>
                    {item.full_name?.charAt(0)?.toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.cardName}>{item.full_name}</Text>
                    {isResubmitted && (
                      <View style={styles.resubmittedBadge}>
                        <Text style={styles.resubmittedText}>Resubmitted</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardMeta}>{item.email}</Text>
                  
                  {isPending && (
                    <Text style={[
                      styles.pendingStatus,
                      { color: hasRevision ? Colors.error : Colors.warning }
                    ]}>
                      {hasRevision ? '⚠️ Revision Requested' : '🕒 Pending Onboarding'}
                    </Text>
                  )}
                </View>

                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{item.role?.name?.replace(/_/g, ' ') ?? 'No role'}</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {/* ── Details Drawer/Modal ── */}
      <Modal
        visible={detailVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Applicant File</Text>
              <Pressable onPress={() => setDetailVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            {selectedUser && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <View style={styles.modalProfileHeader}>
                  <View style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarText}>
                      {selectedUser.full_name?.charAt(0)?.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.modalName}>{selectedUser.full_name}</Text>
                  <Text style={styles.modalEmail}>{selectedUser.email}</Text>
                </View>

                {/* Revision Remark Warning */}
                {selectedUser.onboardingRemark ? (
                  <View style={styles.remarkBox}>
                    <Ionicons name="warning-outline" size={20} color={Colors.error} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.remarkTitle}>Revision Instructions:</Text>
                      <Text style={styles.remarkText}>{selectedUser.onboardingRemark}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Profile Details List */}
                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>PERSONAL DETAILS</Text>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="shield-outline" size={16} color={Colors.primary} />
                    <View>
                      <Text style={styles.detailLabel}>Requested Role</Text>
                      <Text style={styles.detailVal}>{selectedUser.role?.name?.replace(/_/g, ' ') || 'Unassigned'}</Text>
                    </View>
                  </View>

                  {selectedUser.personalMobile ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="call-outline" size={16} color={Colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailLabel}>Mobile Number</Text>
                        <Text style={styles.detailVal}>{selectedUser.personalMobile}</Text>
                      </View>
                      <View style={styles.actionRowInline}>
                        <Pressable 
                          style={styles.circleBtn} 
                          onPress={() => Linking.openURL(`tel:${selectedUser.personalMobile}`)}
                        >
                          <Ionicons name="call" size={14} color={Colors.success} />
                        </Pressable>
                        <Pressable 
                          style={styles.circleBtn} 
                          onPress={() => Linking.openURL(`https://wa.me/91${selectedUser.personalMobile?.replace(/\D/g, '')}?text=Hi ${selectedUser.full_name}`)}
                        >
                          <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                        </Pressable>
                      </View>
                    </View>
                  ) : null}

                  {selectedUser.highestQualification ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="school-outline" size={16} color={Colors.primary} />
                      <View>
                        <Text style={styles.detailLabel}>Highest Qualification</Text>
                        <Text style={styles.detailVal}>{selectedUser.highestQualification}</Text>
                      </View>
                    </View>
                  ) : null}

                  {selectedUser.dateOfBirth ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                      <View>
                        <Text style={styles.detailLabel}>Date of Birth</Text>
                        <Text style={styles.detailVal}>{new Date(selectedUser.dateOfBirth).toLocaleDateString()}</Text>
                      </View>
                    </View>
                  ) : null}

                  {selectedUser.joiningDate ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={16} color={Colors.primary} />
                      <View>
                        <Text style={styles.detailLabel}>Requested Joining Date</Text>
                        <Text style={styles.detailVal}>{new Date(selectedUser.joiningDate).toLocaleDateString()}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* Documents Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>UPLOADED DOCUMENTS</Text>
                  
                  {selectedUser.documents && selectedUser.documents.length > 0 ? (
                    selectedUser.documents.map((doc) => (
                      <View key={doc.id} style={styles.docItem}>
                        <View style={styles.docItemLeft}>
                          <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
                          <Text style={styles.docName} numberOfLines={1}>
                            {getDocLabel(doc.fileName)}
                          </Text>
                        </View>
                        <View style={styles.docItemActions}>
                          <Pressable 
                            style={styles.iconButton}
                            onPress={() => Linking.openURL(doc.filePath)}
                          >
                            <Ionicons name="eye-outline" size={16} color={Colors.primary} />
                          </Pressable>
                          <Pressable 
                            style={styles.iconButton}
                            onPress={() => Linking.openURL(doc.filePath)}
                          >
                            <Ionicons name="download-outline" size={16} color={Colors.primary} />
                          </Pressable>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyDocsText}>No documents uploaded yet.</Text>
                  )}
                </View>

                {/* Controls (visible to admin for inactive users) */}
                {!selectedUser.is_active && (
                  <View style={styles.modalControls}>
                    {actionLoading ? (
                      <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: Spacing.md }} />
                    ) : (
                      <>
                        <Pressable 
                          style={styles.approveBtn} 
                          onPress={() => handleApprove(selectedUser.id)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
                          <Text style={styles.approveBtnText}>Approve & Activate</Text>
                        </Pressable>

                        <Pressable 
                          style={styles.revisionBtn} 
                          onPress={() => setRemarkVisible(true)}
                        >
                          <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.white} />
                          <Text style={styles.revisionBtnText}>Request Revision</Text>
                        </Pressable>

                        <Pressable 
                          style={styles.rejectBtn} 
                          onPress={() => handleReject(selectedUser.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color={Colors.error} />
                          <Text style={styles.rejectBtnText}>Reject & Delete</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                )}
                
                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Revision Remark Input Modal ── */}
      <Modal
        visible={remarkVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRemarkVisible(false)}
      >
        <View style={styles.remarkOverlay}>
          <View style={styles.remarkContent}>
            <Text style={styles.remarkModalTitle}>Request Revision</Text>
            <Text style={styles.remarkModalDesc}>Specify what detail or document needs to be corrected by the applicant.</Text>

            <TextInput
              style={styles.textArea}
              placeholder="e.g. Aadhaar Card copy is blurry. Please scan and upload a high-resolution PDF or clear photo."
              placeholderTextColor={Colors.textLight}
              value={remarkText}
              onChangeText={setRemarkText}
              multiline
              numberOfLines={4}
            />

            <View style={styles.remarkBtnRow}>
              <Pressable 
                style={styles.remarkCancelBtn} 
                onPress={() => { setRemarkVisible(false); setRemarkText(''); }}
              >
                <Text style={styles.remarkCancelText}>Cancel</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.remarkSendBtn, !remarkText.trim() && styles.remarkSendBtnDisabled]}
                onPress={handleSendRevision}
                disabled={!remarkText.trim() || actionLoading}
              >
                <Text style={styles.remarkSendText}>Send Request</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
  backBtn: { padding: Spacing.xs },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  count: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary, backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.md, paddingVertical: 2, borderRadius: BorderRadius.sm },
  searchRow: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: FontSize.md, color: Colors.text },
  
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: FontSize.lg, fontWeight: '900' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardName: { fontSize: FontSize.lg - 1, fontWeight: '700', color: Colors.text },
  resubmittedBadge: { backgroundColor: Colors.successBg, borderWidth: 1, borderColor: Colors.success + '30', paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.sm },
  resubmittedText: { fontSize: 8, fontWeight: '800', color: Colors.success, textTransform: 'uppercase' },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  pendingStatus: { fontSize: FontSize.xs, fontWeight: '700', marginTop: 4 },
  roleBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  roleText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, textTransform: 'capitalize' },
  
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '85%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  closeBtn: { padding: Spacing.xs },
  modalBody: { flex: 1, marginTop: Spacing.lg },
  
  modalProfileHeader: { alignItems: 'center', marginVertical: Spacing.lg },
  modalAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  modalAvatarText: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.white },
  modalName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginTop: Spacing.md },
  modalEmail: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  
  remarkBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.errorBg, borderWidth: 1, borderColor: Colors.error + '30', padding: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.sm, marginBottom: Spacing.lg },
  remarkTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.error },
  remarkText: { fontSize: FontSize.sm - 1, color: Colors.error, marginTop: 2, lineHeight: 18 },

  section: { marginBottom: Spacing.xl },
  sectionHeader: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textLight, letterSpacing: 1.5, marginBottom: Spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.surfaceMuted },
  detailLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  detailVal: { fontSize: FontSize.md - 1, color: Colors.text, fontWeight: '700', marginTop: 1 },
  actionRowInline: { flexDirection: 'row', gap: Spacing.sm },
  circleBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },

  // Docs list
  docItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  docItemLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  docName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, flex: 1 },
  docItemActions: { flexDirection: 'row', gap: Spacing.xs },
  iconButton: { padding: Spacing.sm, borderRadius: BorderRadius.sm, backgroundColor: Colors.primaryLight },
  emptyDocsText: { fontSize: FontSize.sm, color: Colors.textLight, fontStyle: 'italic' },

  // Controls
  modalControls: { gap: Spacing.sm, marginTop: Spacing.lg },
  approveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.success, height: 50, borderRadius: BorderRadius.md },
  approveBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '800', textTransform: 'uppercase' },
  revisionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.warning, height: 50, borderRadius: BorderRadius.md },
  revisionBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '800', textTransform: 'uppercase' },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.error + '40', height: 50, borderRadius: BorderRadius.md },
  rejectBtnText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '800', textTransform: 'uppercase' },

  // Revision modal
  remarkOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  remarkContent: { backgroundColor: Colors.background, borderRadius: BorderRadius.xl, width: '90%', padding: Spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  remarkModalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs },
  remarkModalDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.lg },
  textArea: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, padding: Spacing.md, fontSize: FontSize.sm, color: Colors.text, textAlignVertical: 'top', height: 100, marginBottom: Spacing.lg },
  remarkBtnRow: { flexDirection: 'row', gap: Spacing.md },
  remarkCancelBtn: { flex: 1, height: 46, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  remarkCancelText: { color: Colors.textMuted, fontWeight: '700', fontSize: FontSize.sm },
  remarkSendBtn: { flex: 1, height: 46, borderRadius: BorderRadius.md, backgroundColor: Colors.warning, justifyContent: 'center', alignItems: 'center' },
  remarkSendBtnDisabled: { opacity: 0.5 },
  remarkSendText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm }
});
