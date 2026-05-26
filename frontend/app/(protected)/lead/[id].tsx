import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWhatsAppModalVisible, setIsWhatsAppModalVisible] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');

  const loadData = useCallback(async () => {
    try {
      const leadData = await api.get<any>(`/leads/${id}`);
      // Map DB field names to what the UI expects
      const mappedLead = {
        ...leadData,
        name: leadData.clientName || leadData.client_name,
        phone: leadData.clientPhone || leadData.client_phone,
        email: leadData.clientEmail || leadData.client_email,
      };
      setLead(mappedLead);
      setCalls(leadData.calls || []);
    } catch (e) {
      console.error('Failed to load lead details:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const makeCall = () => { 
    if (lead?.phone) {
      Linking.openURL(`tel:${lead.phone}`); 
    }
  };

  const triggerWhatsAppModal = () => {
    if (lead?.phone) {
      const defaultMsg = `Hello ${lead.name || 'Customer'},\n\nYour vehicle ${lead.vehicleNo || lead.vehicle_number || ''} insurance expires on ${lead.expiryDate ? new Date(lead.expiryDate).toLocaleDateString() : 'soon'}.\n\nRenew today with Torque Auto Advisor.`;
      setWhatsAppMessage(defaultMsg);
      setIsWhatsAppModalVisible(true);
    }
  };

  const sendWhatsApp = async () => {
    setIsWhatsAppModalVisible(false);
    if (lead?.phone) {
      try {
        // Log to backend
        await api.post(`/leads/${id}/whatsapp`, {});
        Linking.openURL(`https://wa.me/91${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsAppMessage)}`);
      } catch (err) {
        console.error('Failed to log WhatsApp:', err);
      }
    }
  };

  if (loading) return <View style={styles.loadingView}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!lead) return <View style={styles.loadingView}><Text style={styles.errorText}>Lead not found</Text></View>;

  const sc = StatusColors[lead.status] || StatusColors.new;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Lead Details</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scroll}>
        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <View style={[styles.avatarLg, { backgroundColor: sc.bg }]}>
              <Text style={[styles.avatarLgText, { color: sc.text }]}>{lead.name?.charAt(0)}</Text>
            </View>
            <View style={styles.nameInfo}>
              <Text style={styles.leadName}>{lead.name}</Text>
              <Text style={styles.leadPhone}>{lead.phone}</Text>
              {lead.email ? <Text style={styles.leadEmail}>{lead.email}</Text> : null}
            </View>
          </View>
          <View style={[styles.statusBadgeLg, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusTextLg, { color: sc.text }]}>{lead.status}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={[styles.actionBtn, { backgroundColor: Colors.success + '15', borderColor: Colors.success + '30' }]} onPress={makeCall}>
            <Ionicons name="call" size={18} color={Colors.success} />
            <Text style={[styles.actionLabel, { color: Colors.success }]}>Call</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, { backgroundColor: '#25D36615', borderColor: '#25D36630' }]} onPress={triggerWhatsAppModal}>
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={[styles.actionLabel, { color: '#25D366' }]}>WhatsApp</Text>
          </Pressable>
          <Pressable 
            style={[styles.actionBtn, { backgroundColor: Colors.primaryLight, borderColor: Colors.primary + '30' }]} 
            onPress={() => router.push({ pathname: '/call-log', params: { leadId: id, leadName: lead.name } })}
          >
            <Ionicons name="create" size={18} color={Colors.primary} />
            <Text style={[styles.actionLabel, { color: Colors.primary }]}>Response</Text>
          </Pressable>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionLabel}>VEHICLE & INSURANCE</Text>
          <InfoRow label="Vehicle No" value={lead.vehicleNo || lead.vehicle_number} />
          <InfoRow label="Expiry Date" value={lead.expiryDate ? new Date(lead.expiryDate).toLocaleDateString() : '-'} />
          <InfoRow label="Registration" value={lead.registrationDate ? new Date(lead.registrationDate).toLocaleDateString() : '-'} />
          <InfoRow label="GVW" value={lead.gvw} />
          <InfoRow label="Agent" value={lead.existingAgent} />
          <InfoRow label="City" value={lead.city} />
          <InfoRow label="Address" value={lead.address} />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionLabel}>STATUS HISTORY</Text>
          {lead.statusHistories?.length > 0 ? lead.statusHistories.map((h: any, i: number) => (
            <View key={i} style={styles.callItem}>
              <View style={styles.callInfo}>
                <Text style={styles.callBy}>{h.newStatus}</Text>
                <Text style={styles.callNote}>{new Date(h.changedAt).toLocaleString()} - {h.notes || 'No notes'}</Text>
              </View>
            </View>
          )) : (
            <Text style={styles.errorText}>No history yet</Text>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Premium WhatsApp Message Editor Modal */}
      <Modal
        visible={isWhatsAppModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsWhatsAppModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBg}>
                <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              </View>
              <Text style={styles.modalTitle}>Customize Message</Text>
            </View>
            
            <Text style={styles.modalLabel}>RECIPIENT: {lead?.name} ({lead?.phone})</Text>
            
            <TextInput
              style={styles.modalInput}
              value={whatsAppMessage}
              onChangeText={setWhatsAppMessage}
              multiline={true}
              numberOfLines={6}
              textAlignVertical="top"
              placeholder="Type your WhatsApp message..."
              placeholderTextColor={Colors.textLight}
            />

            <View style={styles.modalFooter}>
              <Pressable 
                style={styles.modalCancelBtn} 
                onPress={() => setIsWhatsAppModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={styles.modalSendBtn} 
                onPress={sendWhatsApp}
              >
                <Ionicons name="send" size={14} color={Colors.white} style={{ marginRight: 6 }} />
                <Text style={styles.modalSendText}>Send</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  loadingView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  errorText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', padding: 20 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: Spacing.sm },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  scroll: { flex: 1 },
  nameSection: { padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  avatarLg: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarLgText: { fontSize: FontSize.xxl, fontWeight: '900' },
  nameInfo: { flex: 1 },
  leadName: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  leadPhone: { fontSize: FontSize.md, color: Colors.textMuted },
  leadEmail: { fontSize: FontSize.sm, color: Colors.textLight },
  statusBadgeLg: { alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  statusTextLg: { fontSize: FontSize.sm, fontWeight: '700' },
  actionsRow: { 
    flexDirection: 'row', 
    padding: Spacing.lg, 
    gap: Spacing.md, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  actionBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: 48,
    borderRadius: BorderRadius.sm, 
    gap: 6,
    borderWidth: 1,
  },
  actionLabel: { 
    fontSize: FontSize.xs, 
    fontWeight: '700',
  },
  infoCard: { padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: Spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.surfaceMuted },
  infoLabel: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '500' },
  infoValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  callItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.surfaceMuted, gap: Spacing.sm },
  callInfo: { flex: 1 },
  callBy: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  callNote: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  modalIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#25D36615',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  modalLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.background,
    minHeight: 120,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  modalSendBtn: {
    flex: 2,
    flexDirection: 'row',
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSendText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
});
