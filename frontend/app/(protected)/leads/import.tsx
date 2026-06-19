import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/utils/theme';
import Sidebar from '../../../src/components/Sidebar';
import { supabase } from '../../../src/lib/supabase';

interface Mappings {
  clientName: string;
  clientPhone: string;
  vehicleNo: string;
  clientEmail?: string;
  expiryDate?: string;
  gvw?: string;
}

interface HeaderDropdownProps {
  label: string;
  placeholder: string;
  options: string[];
  selectedValue: string;
  onSelect: (val: string) => void;
  required?: boolean;
}

function HeaderDropdownSelector({ label, placeholder, options, selectedValue, onSelect, required = false }: HeaderDropdownProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.selectRow}>
      <Text style={styles.selectLabel}>{label} {required && '*'}</Text>
      <Pressable style={styles.dropdownTrigger} onPress={() => setVisible(true)}>
        <Text style={[styles.dropdownTriggerText, !selectedValue && styles.placeholderText]}>
          {selectedValue || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.dropdownModalContent}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>{label}</Text>
              <Pressable onPress={() => setVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.optionsList}>
              {!required && (
                <Pressable
                  style={[styles.optionItem, !selectedValue && styles.optionItemActive]}
                  onPress={() => {
                    onSelect('');
                    setVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, !selectedValue && styles.optionTextActive]}>(None / Not Mapped)</Text>
                </Pressable>
              )}
              {options.map((opt) => (
                <Pressable
                  key={opt}
                  style={[styles.optionItem, opt === selectedValue && styles.optionItemActive]}
                  onPress={() => {
                    onSelect(opt);
                    setVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, opt === selectedValue && styles.optionTextActive]}>{opt}</Text>
                  {opt === selectedValue && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function LeadImportScreen() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [importName, setImportName] = useState('');
  
  // Mapping UI states
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [parsingHeaders, setParsingHeaders] = useState(false);
  const [mapping, setMapping] = useState<Mappings>({
    clientName: '',
    clientPhone: '',
    vehicleNo: '',
    clientEmail: '',
    expiryDate: '',
    gvw: ''
  });
  const [showMappingForm, setShowMappingForm] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [importedList, setImportedList] = useState<any[]>([]);

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        const ext = file.name.toLowerCase().split('.').pop();
        if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
          Alert.alert('Unsupported Format', 'Please upload a CSV or Excel (.xlsx/.xls) file.');
          return;
        }

        setSelectedFile(file);
        setResults(null);
        setImportedList([]);
        setShowMappingForm(false);
        setFileHeaders([]);
        
        // Proactively parse headers
        parseFileHeaders(file);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const parseFileHeaders = async (file: DocumentPicker.DocumentPickerAsset) => {
    setParsingHeaders(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any);

      const response = await fetch('https://torque-alpha.vercel.app/api/v1/leads/import/parse', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse file headers');
      }

      setFileHeaders(data.headers || []);
      
      // Auto-fuzzy match headers
      const autoMatch: Mappings = { clientName: '', clientPhone: '', vehicleNo: '', clientEmail: '', expiryDate: '', gvw: '' };
      (data.headers || []).forEach((h: string) => {
        const norm = h.toLowerCase().replace(/[\s\.\-_]/g, '');
        if (['ownername', 'name', 'clientname'].includes(norm)) autoMatch.clientName = h;
        else if (['phonenumber', 'contactnumber', 'phone', 'contact'].includes(norm)) autoMatch.clientPhone = h;
        else if (['vehiclenumber', 'vehicleno', 'vehicle', 'regno'].includes(norm)) autoMatch.vehicleNo = h;
        else if (['email', 'clientemail'].includes(norm)) autoMatch.clientEmail = h;
        else if (['expirydate', 'expiry', 'insuranceexpirydate'].includes(norm)) autoMatch.expiryDate = h;
        else if (['gvw', 'grossweight'].includes(norm)) autoMatch.gvw = h;
      });
      setMapping(autoMatch);
      setShowMappingForm(true);

    } catch (err: any) {
      Alert.alert('Header Parsing Failed', err.message || 'Could not parse headers of the file.');
      setSelectedFile(null);
    } finally {
      setParsingHeaders(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first.');
      return;
    }
    if (!importName.trim()) {
      Alert.alert('Error', 'Please enter a sheet/import name first.');
      return;
    }
    if (!mapping.clientName || !mapping.clientPhone || !mapping.vehicleNo) {
      Alert.alert('Error', 'Please map the required fields: Owner Name, Phone, and Vehicle No.');
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }

      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/octet-stream',
      } as any);
      formData.append('importName', importName.trim());
      
      const cleanMapping: Record<string, string> = {
        clientName: mapping.clientName,
        clientPhone: mapping.clientPhone,
        vehicleNo: mapping.vehicleNo
      };
      if (mapping.clientEmail) cleanMapping.clientEmail = mapping.clientEmail;
      if (mapping.expiryDate) cleanMapping.expiryDate = mapping.expiryDate;
      if (mapping.gvw) cleanMapping.gvw = mapping.gvw;

      formData.append('mapping', JSON.stringify(cleanMapping));

      const response = await fetch('https://torque-alpha.vercel.app/api/v1/leads/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to import leads');
      }

      setResults(data.stats);
      setImportedList(data.importedLeads || []);
      setSelectedFile(null);
      setImportName('');
      setShowMappingForm(false);
      Alert.alert('Success', 'Leads imported and distributed successfully!');
    } catch (err: any) {
      Alert.alert('Import Failed', err.message || 'An error occurred.');
    } finally {
      setUploading(false);
    }
  };

  const updateMapping = (key: keyof Mappings, val: string) => {
    setMapping(prev => ({ ...prev, [key]: val }));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Import Leads</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Ionicons name="cloud-upload-outline" size={56} color={Colors.primary} style={styles.uploadIcon} />
          <Text style={styles.cardTitle}>Upload CSV or Excel File</Text>
          <Text style={styles.cardSubtitle}>
            Select a sheet to automatically import leads and assign them to active Sales Executives.
          </Text>

          <Text style={styles.inputLabel}>SHEET / IMPORT BATCH NAME *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Lead Campaign Jan 2026"
            placeholderTextColor={Colors.textLight}
            value={importName}
            onChangeText={setImportName}
          />

          <Pressable 
            style={({ pressed }) => [styles.pickBtn, pressed && styles.btnPressed]} 
            onPress={handlePickFile}
          >
            <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
            <Text style={styles.pickBtnText}>Choose File</Text>
          </Pressable>

          {parsingHeaders && (
            <View style={styles.loaderRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loaderText}>Parsing sheet columns...</Text>
            </View>
          )}

          {selectedFile && !parsingHeaders && (
            <View style={styles.fileDetails}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
            </View>
          )}
        </View>

        {/* Column Mapping Section */}
        {showMappingForm && fileHeaders.length > 0 && (
          <View style={styles.mappingCard}>
            <Text style={styles.mappingTitle}>Map Sheet Columns</Text>
            
            <HeaderDropdownSelector
              label="Owner Name"
              placeholder="Choose Name Column"
              options={fileHeaders}
              selectedValue={mapping.clientName}
              onSelect={(val) => updateMapping('clientName', val)}
              required
            />

            <HeaderDropdownSelector
              label="Contact Phone"
              placeholder="Choose Phone Column"
              options={fileHeaders}
              selectedValue={mapping.clientPhone}
              onSelect={(val) => updateMapping('clientPhone', val)}
              required
            />

            <HeaderDropdownSelector
              label="Vehicle Number"
              placeholder="Choose Vehicle No Column"
              options={fileHeaders}
              selectedValue={mapping.vehicleNo}
              onSelect={(val) => updateMapping('vehicleNo', val)}
              required
            />

            <Text style={styles.optionalDivider}>Optional Column Mappings</Text>

            <HeaderDropdownSelector
              label="Email Address"
              placeholder="Choose Email Column (Optional)"
              options={fileHeaders}
              selectedValue={mapping.clientEmail || ''}
              onSelect={(val) => updateMapping('clientEmail', val)}
            />

            <HeaderDropdownSelector
              label="Expiry Date"
              placeholder="Choose Expiry Date Column (Optional)"
              options={fileHeaders}
              selectedValue={mapping.expiryDate || ''}
              onSelect={(val) => updateMapping('expiryDate', val)}
            />

            <HeaderDropdownSelector
              label="GVW"
              placeholder="Choose GVW Column (Optional)"
              options={fileHeaders}
              selectedValue={mapping.gvw || ''}
              onSelect={(val) => updateMapping('gvw', val)}
            />

            <Pressable 
              style={[styles.uploadBtn, uploading && styles.disabledBtn]} 
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="rocket-outline" size={20} color={Colors.white} />
                  <Text style={styles.uploadBtnText}>Upload & Distribute</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Results Info */}
        {results && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Import Summary</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Total</Text>
                <Text style={[styles.statVal, { color: Colors.text }]}>{results.total}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Imported</Text>
                <Text style={[styles.statVal, { color: Colors.success }]}>{results.assignedCount}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Duplicates</Text>
                <Text style={[styles.statVal, { color: Colors.warning }]}>{results.duplicates}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Errors</Text>
                <Text style={[styles.statVal, { color: Colors.error }]}>{results.errors}</Text>
              </View>
            </View>

            {importedList.length > 0 && (
              <View style={{ marginTop: Spacing.lg }}>
                <Text style={styles.assignmentsHeading}>Lead Assignments Breakdown</Text>
                <View style={styles.assignmentsList}>
                  {importedList.map((lead, idx) => (
                    <View key={idx} style={styles.assignmentRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.leadNameVal}>{lead.clientName}</Text>
                        <Text style={styles.leadPlateVal}>{lead.vehicleNo}</Text>
                      </View>
                      <View style={styles.assignedBadge}>
                        <Text style={styles.assignedBadgeText}>{lead.assignedToName}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md, backgroundColor: '#FFFFFF' },
  menuBtn: { padding: Spacing.xs },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  container: { padding: Spacing.lg, gap: Spacing.lg },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  uploadIcon: { marginBottom: Spacing.md, alignSelf: 'center' },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs, textAlign: 'center' },
  cardSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },
  inputLabel: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1, marginBottom: 6 },
  textInput: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.lg, height: 48, fontSize: FontSize.md, color: Colors.text, marginBottom: Spacing.lg, width: '100%' },
  pickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.primaryLight, width: '100%' },
  btnPressed: { opacity: 0.8 },
  pickBtnText: { color: Colors.primary, fontWeight: '800', fontSize: FontSize.md },
  fileDetails: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.lg, padding: Spacing.md, backgroundColor: '#F8FAFC', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#E2E8F0', width: '100%', justifyContent: 'center' },
  fileName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, flexShrink: 1 },
  loaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md, justifyContent: 'center' },
  loaderText: { fontSize: FontSize.sm, color: Colors.textMuted },
  mappingCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.lg },
  mappingTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginBottom: Spacing.md },
  selectRow: { flexDirection: 'column', gap: 6, marginBottom: Spacing.md },
  selectLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted },
  pickerWrapper: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, backgroundColor: Colors.background },
  mappingInput: { paddingHorizontal: Spacing.md, height: 44, fontSize: FontSize.sm, color: Colors.text, backgroundColor: Colors.background, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  optionalDivider: { fontSize: 10, fontWeight: '800', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1.5, marginVertical: Spacing.md },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, width: '100%', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.lg },
  uploadBtnText: { color: Colors.white, fontWeight: '800', fontSize: FontSize.md },
  disabledBtn: { opacity: 0.6 },
  resultsCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.lg },
  resultsTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginBottom: Spacing.md },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  statBox: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  statLabel: { fontSize: 8, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statVal: { fontSize: FontSize.md, fontWeight: '900' },
  assignmentsHeading: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.text, marginVertical: Spacing.md },
  assignmentsList: { gap: Spacing.xs },
  assignmentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: BorderRadius.sm, padding: Spacing.md },
  leadNameVal: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  leadPlateVal: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  assignedBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  assignedBadgeText: { fontSize: 10, color: Colors.primary, fontWeight: '800' },
  
  // Dropdown styles
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, height: 48, paddingHorizontal: Spacing.md, marginTop: 4, marginBottom: Spacing.md },
  dropdownTriggerText: { fontSize: FontSize.md, color: Colors.text, fontWeight: '500' },
  placeholderText: { color: Colors.textLight },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dropdownModalContent: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '85%', paddingBottom: 30 },
  dropdownModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownModalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  modalCloseBtn: { padding: Spacing.xs },
  optionsList: { paddingHorizontal: Spacing.lg },
  optionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  optionItemActive: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.sm },
  optionText: { fontSize: FontSize.md, color: Colors.text },
  optionTextActive: { color: Colors.primary, fontWeight: '600' }
});
