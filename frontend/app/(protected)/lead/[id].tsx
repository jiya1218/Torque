import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/context/AuthContext';
import { usersService } from '../../../src/services/users';

interface DropdownProps {
  label: string;
  placeholder: string;
  options: { label: string; value: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
  searchable?: boolean;
  onOpen?: () => void;
  loading?: boolean;
}

function DropdownSelector({ label, placeholder, options, selectedValue, onSelect, searchable = false, onOpen, loading = false }: DropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const selectedOption = options.find(o => o.value === selectedValue);
  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <View style={styles.dropdownField}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Pressable 
        style={styles.dropdownTrigger} 
        onPress={() => {
          setSearchQuery('');
          setModalVisible(true);
          if (onOpen) onOpen();
        }}
      >
        <Text style={[styles.dropdownTriggerText, !selectedOption && styles.placeholderText]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
        )}
      </Pressable>
      
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dropdownModalContent}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>{label}</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            
            {searchable && (
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.textLight} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  placeholderTextColor={Colors.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                    <Ionicons name="close-circle" size={16} color={Colors.textLight} />
                  </Pressable>
                )}
              </View>
            )}
            
            <ScrollView style={styles.optionsList} keyboardShouldPersistTaps="handled">
              {filteredOptions.length === 0 ? (
                <Text style={styles.noOptionsText}>No options found</Text>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === selectedValue;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[styles.optionItem, isSelected && styles.optionItemActive]}
                      onPress={() => {
                        onSelect(opt.value);
                        setModalVisible(false);
                      }}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                        {opt.label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const roleUpper = user?.role?.toUpperCase() || '';
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN';

  const [lead, setLead] = useState<any>(null);
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWhatsAppModalVisible, setIsWhatsAppModalVisible] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [savingSuggestion, setSavingSuggestion] = useState(false);
  const [correctionField, setCorrectionField] = useState<'clientPhone' | 'vehicleNo'>('clientPhone');
  const [correctionValue, setCorrectionValue] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // Edit Modal States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [updatingLead, setUpdatingLead] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editVehicleNo, setEditVehicleNo] = useState('');
  const [editGvw, setEditGvw] = useState('');
  const [editExistingAgent, setEditExistingAgent] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');

  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await usersService.list({ limit: 100 });
      setUsersList(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleDeleteLead = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this lead? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/leads/${id}`);
              Alert.alert('Success', 'Lead deleted successfully.', [
                { text: 'OK', onPress: () => router.replace('/(protected)/leads') }
              ]);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete lead');
            }
          }
        }
      ]
    );
  };

  const handleUpdateLead = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }
    setUpdatingLead(true);
    try {
      const res = await api.put(`/leads/${id}`, {
        clientName: editName.trim(),
        clientPhone: editPhone.trim() || null,
        clientEmail: editEmail.trim() || null,
        vehicleNo: editVehicleNo.trim() || null,
        gvw: editGvw.trim() || null,
        city: editCity.trim() || null,
        address: editAddress.trim() || null,
        status: editStatus,
        assignedTo: editAssignedTo || null,
      });
      setEditModalVisible(false);
      if (res && res.pendingApproval) {
        Alert.alert('Request Submitted', res.message || 'Changes submitted for Admin approval.');
      } else {
        Alert.alert('Success', 'Lead updated successfully!');
      }
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update lead');
    } finally {
      setUpdatingLead(false);
    }
  };

  const handleSaveSuggestion = async () => {
    if (!suggestion.trim()) {
      Alert.alert('Empty Text', 'Please type a suggestion first.');
      return;
    }
    setSavingSuggestion(true);
    try {
      await api.post(`/leads/${id}/suggestion`, { text: suggestion.trim() });
      Alert.alert('Success', 'Suggestion saved successfully.');
      setSuggestion('');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save suggestion');
    } finally {
      setSavingSuggestion(false);
    }
  };

  const handleSubmitCorrection = async () => {
    if (!correctionValue.trim()) {
      Alert.alert('Empty Value', 'Please enter a correction value.');
      return;
    }
    setSubmittingCorrection(true);
    try {
      const oldValue = correctionField === 'clientPhone' ? lead.phone : lead.vehicleNo;
      await api.post('/data/changes', {
        entityType: 'Lead',
        entityId: id,
        field: correctionField,
        oldValue: oldValue || '',
        newValue: correctionValue.trim(),
        reason: 'Sales representative correction request'
      });
      Alert.alert('Success', 'Correction request submitted for Admin approval.');
      setCorrectionValue('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit request');
    } finally {
      setSubmittingCorrection(false);
    }
  };

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
      // Log activity to backend independently
      try {
        await api.post(`/leads/${id}/whatsapp`, {});
      } catch (err) {
        console.warn('Failed to log WhatsApp activity:', err);
      }

      try {
        let cleanPhone = lead.phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
          cleanPhone = cleanPhone.substring(1);
        }
        if (!(cleanPhone.length === 12 && cleanPhone.startsWith('91'))) {
          if (cleanPhone.length === 10) {
            cleanPhone = '91' + cleanPhone;
          }
        }

        const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(whatsAppMessage)}`;
        try {
          await Linking.openURL(whatsappUrl);
        } catch (e) {
          const webUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsAppMessage)}`;
          await Linking.openURL(webUrl).catch(() => {
            Alert.alert('Error', 'Could not open WhatsApp. Please check if the app is installed.');
          });
        }
      } catch (err) {
        console.error('WhatsApp launch error:', err);
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

        <View style={[styles.actionsRow, { borderTopWidth: 0, paddingTop: 0, marginTop: -Spacing.sm }]}>
          <Pressable 
            style={[styles.actionBtn, { backgroundColor: Colors.primaryLight, borderColor: Colors.primary + '30' }]} 
            onPress={() => {
              setEditName(lead.name || '');
              setEditPhone(lead.phone || '');
              setEditEmail(lead.email || '');
              setEditVehicleNo(lead.vehicleNo || lead.vehicle_number || '');
              setEditGvw(lead.gvw || '');
              setEditExistingAgent(lead.existingAgent || '');
              setEditCity(lead.city || '');
              setEditAddress(lead.address || '');
              setEditStatus(lead.status || '');
              setEditAssignedTo(lead.assignedTo || '');
              setEditModalVisible(true);
              fetchUsers();
            }}
          >
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
            <Text style={[styles.actionLabel, { color: Colors.primary }]}>Edit Details</Text>
          </Pressable>
          {isAdmin && (
            <Pressable 
              style={[styles.actionBtn, { backgroundColor: Colors.error + '15', borderColor: Colors.error + '30' }]} 
              onPress={handleDeleteLead}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <Text style={[styles.actionLabel, { color: Colors.error }]}>Delete Lead</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionLabel}>VEHICLE & INSURANCE</Text>
          <InfoRow label="Assigned To" value={lead.assignee?.fullName || 'Unassigned'} />
          <InfoRow label="Vehicle No" value={lead.vehicleNo || lead.vehicle_number} />
          <InfoRow label="Expiry Date" value={lead.expiryDate ? new Date(lead.expiryDate).toLocaleDateString() : '-'} />
          <InfoRow label="Registration" value={lead.registrationDate ? new Date(lead.registrationDate).toLocaleDateString() : '-'} />
          <InfoRow label="GVW" value={lead.gvw} />
          <InfoRow label="Agent" value={lead.existingAgent} />
          <InfoRow label="City" value={lead.city} />
          <InfoRow label="Address" value={lead.address} />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionLabel}>SUGGESTIONS & NOTES</Text>
          <View style={styles.suggestionForm}>
            <TextInput
              style={styles.suggestionInput}
              placeholder="Add a suggestion or custom note..."
              placeholderTextColor={Colors.textLight}
              value={suggestion}
              onChangeText={setSuggestion}
              multiline={true}
              numberOfLines={2}
            />
            <Pressable 
              style={[styles.saveSuggestionBtn, savingSuggestion && { opacity: 0.7 }]} 
              onPress={handleSaveSuggestion}
              disabled={savingSuggestion}
            >
              {savingSuggestion ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color={Colors.white} />
                  <Text style={styles.saveSuggestionText}>Save Suggestion</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionLabel}>REQUEST DATA CORRECTION (ADMIN APPROVAL)</Text>
          <View style={styles.correctionRow}>
            <Pressable 
              style={[styles.selectorBtn, correctionField === 'clientPhone' && styles.selectorBtnActive]}
              onPress={() => { setCorrectionField('clientPhone'); setCorrectionValue(''); }}
            >
              <Text style={[styles.selectorText, correctionField === 'clientPhone' && styles.selectorTextActive]}>Mobile No</Text>
            </Pressable>
            <Pressable 
              style={[styles.selectorBtn, correctionField === 'vehicleNo' && styles.selectorBtnActive]}
              onPress={() => { setCorrectionField('vehicleNo'); setCorrectionValue(''); }}
            >
              <Text style={[styles.selectorText, correctionField === 'vehicleNo' && styles.selectorTextActive]}>Registration No</Text>
            </Pressable>
          </View>

          <Text style={styles.currentValLabel}>
            CURRENT VALUE: {correctionField === 'clientPhone' ? (lead.phone || 'None') : (lead.vehicleNo || 'None')}
          </Text>

          <View style={styles.correctionForm}>
            <TextInput
              style={styles.correctionInput}
              placeholder={correctionField === 'clientPhone' ? "Enter new correct mobile number..." : "Enter new registration number..."}
              placeholderTextColor={Colors.textLight}
              value={correctionValue}
              onChangeText={setCorrectionValue}
              keyboardType={correctionField === 'clientPhone' ? 'phone-pad' : 'default'}
              autoCapitalize={correctionField === 'vehicleNo' ? 'characters' : 'none'}
            />
            <Pressable 
              style={[styles.submitCorrectionBtn, submittingCorrection && { opacity: 0.7 }]} 
              onPress={handleSubmitCorrection}
              disabled={submittingCorrection}
            >
              {submittingCorrection ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={16} color={Colors.white} />
                  <Text style={styles.submitCorrectionText}>Request Change</Text>
                </>
              )}
            </Pressable>
          </View>
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

      {/* Edit Lead Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.bottomModalOverlay}>
          <View style={styles.bottomModalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{lead.name ? 'Edit Lead' : 'Lead Details'}</Text>
              <Pressable onPress={() => setEditModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.field}>
                <Text style={styles.label}>CLIENT NAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Client name"
                  placeholderTextColor={Colors.textLight}
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PHONE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Phone number"
                  placeholderTextColor={Colors.textLight}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>EMAIL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={Colors.textLight}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>VEHICLE NO</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Vehicle number"
                  placeholderTextColor={Colors.textLight}
                  value={editVehicleNo}
                  onChangeText={setEditVehicleNo}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>GVW</Text>
                <TextInput
                  style={styles.input}
                  placeholder="GVW"
                  placeholderTextColor={Colors.textLight}
                  value={editGvw}
                  onChangeText={setEditGvw}
                />
              </View>



              <View style={styles.field}>
                <Text style={styles.label}>CITY</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor={Colors.textLight}
                  value={editCity}
                  onChangeText={setEditCity}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>ADDRESS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Address"
                  placeholderTextColor={Colors.textLight}
                  value={editAddress}
                  onChangeText={setEditAddress}
                />
              </View>

              <DropdownSelector
                label="Status *"
                placeholder="Choose status"
                options={[
                  { label: 'New', value: 'New' },
                  { label: 'Contacted', value: 'Contacted' },
                  { label: 'Interested', value: 'Interested' },
                  { label: 'Closed', value: 'Closed' },
                  { label: 'Lost', value: 'Lost' }
                ]}
                selectedValue={editStatus}
                onSelect={setEditStatus}
              />

              <DropdownSelector
                label="Assign To"
                placeholder="Choose assignee"
                options={[
                  { label: 'Unassigned', value: '' },
                  ...usersList.map(u => ({ label: `${u.fullName || u.full_name || u.email} (${u.role?.name || 'Staff'})`, value: u.id }))
                ]}
                selectedValue={editAssignedTo}
                onSelect={setEditAssignedTo}
                loading={loadingUsers}
              />

              <Pressable style={styles.submitBtn} onPress={handleUpdateLead} disabled={updatingLead}>
                {updatingLead ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Save Changes</Text>
                )}
              </Pressable>
            </ScrollView>
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
  suggestionForm: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  suggestionInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.background,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  saveSuggestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    height: 44,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  saveSuggestionText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  correctionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  selectorBtn: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  selectorBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  selectorText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  selectorTextActive: {
    fontWeight: '700',
    color: Colors.primary,
  },
  currentValLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  correctionForm: {
    gap: Spacing.sm,
  },
  correctionInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    height: 48,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  submitCorrectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    height: 44,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  submitCorrectionText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  bottomModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  bottomModalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    height: '85%',
    padding: Spacing.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  modalBody: {
    flex: 1,
    marginTop: Spacing.lg,
  },
  field: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    height: 50,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  dropdownField: {
    marginBottom: Spacing.md,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    height: 50,
    paddingHorizontal: Spacing.md,
    marginTop: 4,
  },
  dropdownTriggerText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  placeholderText: {
    color: Colors.textLight,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dropdownModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownModalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  modalCloseBtn: {
    padding: Spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted || '#F1F5F9',
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    height: '100%',
  },
  searchClearBtn: {
    padding: Spacing.xs,
  },
  optionsList: {
    paddingHorizontal: Spacing.lg,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceMuted || '#F1F5F9',
  },
  optionItemActive: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  optionText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  optionTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  noOptionsText: {
    textAlign: 'center',
    color: Colors.textLight,
    paddingVertical: Spacing.xl,
    fontSize: FontSize.sm,
  },
});
