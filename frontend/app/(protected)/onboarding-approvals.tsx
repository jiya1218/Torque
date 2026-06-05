import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  RefreshControl,
  Modal,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { usersService, User } from '../../src/services/users';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import AppFooter from '../../src/components/AppFooter';
import { useAuth } from '../../src/context/AuthContext';
import { useCacheStore } from '../../src/store/cacheStore';

export default function OnboardingApprovalsScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { cache, setCache, loadCache } = useCacheStore();

  const [items, setItems] = useState<User[]>(cache['/onboarding-pending']?.users || []);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal States
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [remarkVisible, setRemarkVisible] = useState(false);
  const [remarkText, setRemarkText] = useState('');

  const roleUpper = currentUser?.role?.toUpperCase();
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN' || roleUpper === 'HR';

  // Load cache on mount
  useEffect(() => {
    loadCache().then(() => {
      const cached = cache['/onboarding-pending'];
      if (cached && cached.users) {
        setItems(cached.users);
      }
    });
  }, []);

  const handleDownloadDoc = async (doc: any, forcePdf = false) => {
    try {
      const url = doc.filePath;
      const originalExt = url.split('.').pop()?.split('?')[0] || 'pdf';
      const displayName = getDocDisplayName(doc.fileName).replace(/\s+/g, '_');
      
      let ext = originalExt;
      if (forcePdf) {
        ext = 'pdf';
      }
      
      const localUri = FileSystem.documentDirectory + `${displayName}.${ext}`;
      
      Alert.alert('Downloading', `Downloading ${getDocDisplayName(doc.fileName)}...`);
      
      const { uri } = await FileSystem.downloadAsync(url, localUri);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Downloaded', `Saved to: ${uri}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to download file');
    }
  };

  const handleDownloadAll = async () => {
    if (!selectedUser || !selectedUser.documents || selectedUser.documents.length === 0) {
      Alert.alert('No Documents', 'There are no documents to download.');
      return;
    }
    
    try {
      Alert.alert('Downloading All', 'Starting download of all documents...');
      const userNameClean = (selectedUser.full_name || 'user').replace(/\s+/g, '_');
      const folderUri = FileSystem.documentDirectory + userNameClean + '_docs/';
      
      await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
      
      const downloadPromises = selectedUser.documents.map(async (doc: any) => {
        const url = doc.filePath;
        const ext = url.split('.').pop()?.split('?')[0] || 'pdf';
        const displayName = getDocDisplayName(doc.fileName).replace(/\s+/g, '_');
        const fileUri = folderUri + `${displayName}.${ext}`;
        
        await FileSystem.downloadAsync(url, fileUri);
        return fileUri;
      });
      
      const downloadedUris = await Promise.all(downloadPromises);
      
      Alert.alert(
        'Success',
        `All ${downloadedUris.length} documents have been saved locally to the folder:\n${folderUri}`,
        [
          { text: 'OK' },
          {
            text: 'Share All',
            onPress: async () => {
              if (await Sharing.isAvailableAsync()) {
                for (const uri of downloadedUris) {
                  await Sharing.shareAsync(uri);
                }
              }
            }
          }
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to download all files');
    }
  };

  const load = useCallback(async () => {
    try {
      const data = await usersService.list({ limit: 100, onboarding: true });
      // Filter pending/inactive users
      const pending = data.filter(u => !u.is_active);
      setItems(pending);
      setCache('/onboarding-pending', { users: pending });

      if (selectedUser) {
        const updated = pending.find(u => u.id === selectedUser.id);
        if (updated) setSelectedUser(updated);
      }
    } catch (e) {
      console.error('[OnboardingApprovalsScreen] Failed to load pending onboardings', e);
    }
  }, [selectedUser, setCache]);

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
              Alert.alert('Success', 'Application rejected and deleted.');
              setDetailVisible(false);
              setSelectedUser(null);
              load();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to reject application');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSendRemark = async () => {
    if (!remarkText.trim() || !selectedUser) return;
    setActionLoading(true);
    try {
      await usersService.update(selectedUser.id, { onboardingRemark: remarkText.trim() });
      Alert.alert('Success', 'Revision request sent to the applicant.');
      setRemarkVisible(false);
      setRemarkText('');
      setDetailVisible(false);
      setSelectedUser(null);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to request revision');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredItems = items.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getDocDisplayName = (filename: string) => {
    const docDisplayNames: Record<string, string> = {
      ADHAR: 'Aadhaar Card',
      PAN: 'PAN Card',
      SSC: 'SSC Marksheet',
      QUALIFICATION: 'Highest Degree Cert',
      LEAVING: 'Leaving Certificate',
      PHOTO: 'Passport Photo'
    };
    return docDisplayNames[filename.toUpperCase()] || filename;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Onboarding Approvals</Text>
      </View>

      {/* Search Row */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search applicants..."
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textLight} />
            </Pressable>
          )}
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filteredItems.length}</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredItems}
        keyExtractor={i => i.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={52} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No pending onboardings</Text>
            <Text style={styles.emptyText}>All employee onboarding applications have been processed</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
            onPress={async () => {
              setSelectedUser(item);
              setDetailVisible(true);
              try {
                const detailed = await usersService.getById(item.id);
                setSelectedUser(detailed);
              } catch (err: any) {
                console.error('[OnboardingApprovalsScreen] Failed to load detail', err);
                Alert.alert(
                  'Error Fetching Profile Details',
                  `Could not load full profile or documents for ${item.full_name || 'user'}.\n\nDetails: ${err.message || String(err)}`
                );
              }
            }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.full_name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.cardName}>{item.full_name}</Text>
                  {item.onboardingUpdated && (
                    <View style={styles.badgeResubmit}>
                      <Text style={styles.badgeResubmitText}>🔄 Re-submitted</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardEmail}>{item.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
            </View>

            <View style={styles.cardMeta}>
              <View style={styles.metaBadge}>
                <Ionicons name="shield-outline" size={11} color={Colors.textMuted} />
                <Text style={styles.metaBadgeText}>{item.role?.name || 'Pending Role'}</Text>
              </View>
              <Text style={styles.dateText}>
                Joined: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </Pressable>
        )}
      />

      {/* Applicant Detail Modal */}
      <Modal
        visible={detailVisible}
        animationType="slide"
        onRequestClose={() => setDetailVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setDetailVisible(false)} style={styles.modalBackBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
            <Text style={styles.modalHeaderTitle}>Application Details</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedUser && (
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Profile Card */}
              <View style={styles.modalProfileCard}>
                <View style={styles.avatarLg}>
                  <Text style={styles.avatarLgText}>
                    {selectedUser.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <Text style={styles.modalProfileName}>{selectedUser.full_name}</Text>
                <Text style={styles.modalProfileEmail}>{selectedUser.email}</Text>
                <View style={styles.modalRoleBadge}>
                  <Text style={styles.modalRoleBadgeText}>
                    {selectedUser.role?.name?.toUpperCase() || 'NO ROLE REQUESTED'}
                  </Text>
                </View>
              </View>

              {/* Basic Information */}
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>BASIC INFORMATION</Text>
                <InfoRow label="Mobile Number" value={selectedUser.personalMobile} />
                <InfoRow label="Alternative Mobile" value={selectedUser.homeMobile} />
                <InfoRow label="Qualifications" value={selectedUser.highestQualification} />
                <InfoRow label="Date of Birth" value={selectedUser.dateOfBirth ? new Date(selectedUser.dateOfBirth).toLocaleDateString() : null} />
                <InfoRow label="Joining Date" value={selectedUser.joiningDate ? new Date(selectedUser.joiningDate).toLocaleDateString() : null} />
                {selectedUser.onboardingRemark && (
                  <View style={styles.remarkContainer}>
                    <Text style={styles.remarkLabel}>LATEST AUDIT REMARK:</Text>
                    <Text style={styles.remarkText}>{selectedUser.onboardingRemark}</Text>
                  </View>
                )}
              </View>

              {/* Attachments Section */}
              <View style={styles.infoSection}>
                <View style={styles.attachmentsHeaderRow}>
                  <Text style={styles.sectionTitle}>DOCUMENT ATTACHMENTS</Text>
                  {selectedUser.documents && selectedUser.documents.length > 0 && (
                    <Pressable style={styles.downloadAllBtn} onPress={handleDownloadAll}>
                      <Ionicons name="cloud-download-outline" size={14} color={Colors.primary} />
                      <Text style={styles.downloadAllBtnText}>Download All</Text>
                    </Pressable>
                  )}
                </View>
                {selectedUser.documents && selectedUser.documents.length > 0 ? (
                  selectedUser.documents.map((doc: any) => (
                    <View key={doc.id} style={styles.docRow}>
                      <Ionicons name="document-text" size={24} color={Colors.primary} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docName}>{getDocDisplayName(doc.fileName)}</Text>
                      </View>
                      <View style={styles.docActions}>
                        <Pressable
                          style={styles.viewDocBtn}
                          onPress={() => Linking.openURL(doc.filePath).catch(() => Alert.alert('Error', 'Unable to open file link.'))}
                        >
                          <Ionicons name="eye-outline" size={12} color={Colors.primary} />
                          <Text style={styles.viewDocBtnText}>Open</Text>
                        </Pressable>
                        <Pressable
                          style={styles.viewDocBtn}
                          onPress={() => handleDownloadDoc(doc, false)}
                        >
                          <Ionicons name="download-outline" size={12} color={Colors.primary} />
                          <Text style={styles.viewDocBtnText}>Save</Text>
                        </Pressable>
                        <Pressable
                          style={styles.viewDocBtn}
                          onPress={() => handleDownloadDoc(doc, true)}
                        >
                          <Ionicons name="document-outline" size={12} color={Colors.primary} />
                          <Text style={styles.viewDocBtnText}>PDF</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyDocText}>No attachments uploaded by applicant.</Text>
                )}
              </View>

              {/* Admin Actions */}
              {isAdmin && (
                <View style={styles.actionsContainer}>
                  {actionLoading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: Spacing.md }} />
                  ) : (
                    <>
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: Colors.success }]}
                        onPress={() => handleApprove(selectedUser.id)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color={Colors.white} />
                        <Text style={styles.actionBtnText}>Approve & Activate</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: Colors.warning }]}
                        onPress={() => setRemarkVisible(true)}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.white} />
                        <Text style={styles.actionBtnText}>Request Revision</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: Colors.error }]}
                        onPress={() => handleReject(selectedUser.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color={Colors.white} />
                        <Text style={styles.actionBtnText}>Reject & Delete</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}
              <View style={{ height: Spacing.xxl }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Revision Remarks Modal */}
      <Modal
        visible={remarkVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRemarkVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Revision Remarks</Text>
              <Pressable onPress={() => setRemarkVisible(false)}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </Pressable>
            </View>

            <Text style={styles.modalDesc}>
              Specify details to be corrected (e.g. blurry documents).
            </Text>

            <TextInput
              style={styles.modalInput}
              value={remarkText}
              onChangeText={setRemarkText}
              placeholder="e.g. Please upload clear scan of PAN Card..."
              placeholderTextColor={Colors.textLight}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalBtnRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => { setRemarkVisible(false); setRemarkText(''); }}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={handleSendRemark}
                disabled={actionLoading || !remarkText.trim()}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalBtnSubmitText}>Request</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <AppFooter />
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md
  },
  menuBtn: { padding: Spacing.xs },
  title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm
  },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text, padding: 0 },
  countBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    minWidth: 36,
    alignItems: 'center'
  },
  countText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xxl
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '900' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  cardName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  badgeResubmit: {
    backgroundColor: Colors.successBg,
    borderWidth: 1,
    borderColor: Colors.success + '30',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 2
  },
  badgeResubmitText: { fontSize: 8, fontWeight: '800', color: Colors.success },
  cardEmail: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceMuted
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border
  },
  metaBadgeText: { fontSize: FontSize.xs - 1, fontWeight: '700', color: Colors.textMuted },
  dateText: { fontSize: FontSize.xs - 1, color: Colors.textLight },

  // Modal styling
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  modalBackBtn: { padding: Spacing.xs },
  modalHeaderTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  modalScroll: { flex: 1, padding: Spacing.lg },
  modalProfileCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  avatarLg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3
  },
  avatarLgText: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: '900' },
  modalProfileName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  modalProfileEmail: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  modalRoleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md
  },
  modalRoleBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.primary, letterSpacing: 0.5 },
  infoSection: { paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textLight,
    letterSpacing: 1,
    marginBottom: Spacing.md
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceMuted
  },
  infoLabel: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '500' },
  infoValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  remarkContainer: {
    backgroundColor: Colors.warningBg,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md
  },
  remarkLabel: { fontSize: 10, fontWeight: '900', color: Colors.warning },
  remarkText: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: '600', marginTop: 2 },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    gap: Spacing.md
  },
  docName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  viewDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md
  },
  viewDocBtnText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  emptyDocText: { fontSize: FontSize.xs, color: Colors.textMuted, fontStyle: 'italic' },
  actionsContainer: { paddingVertical: Spacing.lg, gap: Spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs
  },
  actionBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '800' },

  // Remark Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl
  },
  modalContainer: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  modalDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.md },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
    minHeight: 100,
    lineHeight: 20,
    marginBottom: Spacing.lg
  },
  modalBtnRow: { flexDirection: 'row', gap: Spacing.md },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalBtnCancel: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  modalBtnCancelText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textMuted },
  modalBtnSubmit: { backgroundColor: Colors.warning },
  modalBtnSubmitText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
  attachmentsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  downloadAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryLight,
  },
  downloadAllBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primary,
  },
  docActions: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: '65%',
  },
});
