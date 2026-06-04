import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/utils/theme';
import Sidebar from '../../../src/components/Sidebar';
import { supabase } from '../../../src/lib/supabase';

export default function LeadImportScreen() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        copyToCacheDirectory: true
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setSelectedFile(res.assets[0]);
        setResults(null);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a CSV or Excel file first.');
      return;
    }

    setUploading(true);
    setResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'text/csv',
      } as any);

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
        throw new Error(data.error || 'Failed to upload leads');
      }

      setResults(data.stats);
      setSelectedFile(null);
      Alert.alert('Success', 'Leads imported and distributed successfully!');
    } catch (err: any) {
      Alert.alert('Import Failed', err.message || 'An error occurred during import.');
    } finally {
      setUploading(false);
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
        <Text style={styles.title}>Import Leads</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Ionicons name="cloud-upload-outline" size={56} color={Colors.primary} style={styles.uploadIcon} />
          <Text style={styles.cardTitle}>Upload CSV or Excel File</Text>
          <Text style={styles.cardSubtitle}>
            Select a sheet to automatically import leads and assign them to active Sales Executives in a round-robin format.
          </Text>

          <Pressable 
            style={({ pressed }) => [styles.pickBtn, pressed && styles.btnPressed]} 
            onPress={handlePickFile}
          >
            <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
            <Text style={styles.pickBtnText}>Choose File</Text>
          </Pressable>

          {selectedFile && (
            <View style={styles.fileDetails}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
              <Text style={styles.fileSize}>({(selectedFile.size ? selectedFile.size / 1024 : 0).toFixed(1)} KB)</Text>
            </View>
          )}

          {selectedFile && (
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
                  <Text style={styles.uploadBtnText}>Upload & Process</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        {/* Results Info */}
        {results && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Import Summary</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Total Rows</Text>
                <Text style={[styles.statVal, { color: Colors.text }]}>{results.total}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Valid Leads</Text>
                <Text style={[styles.statVal, { color: Colors.success }]}>{results.valid}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Assigned</Text>
                <Text style={[styles.statVal, { color: Colors.primary }]}>{results.assignedCount}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Errors</Text>
                <Text style={[styles.statVal, { color: Colors.error }]}>{results.errors}</Text>
              </View>
            </View>

            <View style={styles.infoBanner}>
              <Ionicons name="checkmark-done-circle" size={20} color={Colors.success} />
              <Text style={styles.infoBannerText}>
                All valid leads have been round-robin distributed to sales staff.
              </Text>
            </View>
          </View>
        )}

        {/* Specifications */}
        <View style={styles.specsCard}>
          <Text style={styles.specsTitle}>CSV Format Requirements</Text>
          <Text style={styles.specsText}>• The file must contain a header row.</Text>
          <Text style={styles.specsText}>• Required columns: <Text style={{ fontWeight: '700' }}>Owner Name</Text>, <Text style={{ fontWeight: '700' }}>Contact Number</Text>, <Text style={{ fontWeight: '700' }}>Vehicle No</Text>.</Text>
          <Text style={styles.specsText}>• Optional columns: <Text style={{ fontWeight: '700' }}>Insurance Expiry Date</Text>, <Text style={{ fontWeight: '700' }}>Email</Text>.</Text>
          <Text style={styles.specsText}>• Duplicates of vehicle registration numbers already in the system will be automatically skipped.</Text>
        </View>

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
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  uploadIcon: { marginBottom: Spacing.md },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs },
  cardSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },
  pickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.primaryLight },
  btnPressed: { opacity: 0.8 },
  pickBtnText: { color: Colors.primary, fontWeight: '800', fontSize: FontSize.md },
  fileDetails: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.lg, padding: Spacing.md, backgroundColor: '#F8FAFC', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#E2E8F0', width: '100%', justifyContent: 'center' },
  fileName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, flexShrink: 1 },
  fileSize: { fontSize: FontSize.xs, color: Colors.textMuted },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, width: '100%', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.lg },
  uploadBtnText: { color: Colors.white, fontWeight: '800', fontSize: FontSize.md },
  disabledBtn: { opacity: 0.6 },
  resultsCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.lg },
  resultsTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginBottom: Spacing.md },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  statBox: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statVal: { fontSize: FontSize.lg, fontWeight: '900' },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#ECFDF5', padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.md, borderWidth: 1, borderColor: '#10B98120' },
  infoBannerText: { fontSize: FontSize.xs, color: '#047857', fontWeight: '600', flex: 1 },
  specsCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.lg },
  specsTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
  specsText: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 22, marginBottom: 4 },
});
