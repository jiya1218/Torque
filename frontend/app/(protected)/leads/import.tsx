import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../../src/lib/supabase';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/utils/theme';
import Sidebar from '../../../src/components/Sidebar';

const LIVE_BASE_URL = 'https://torque-alpha.vercel.app';
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || LIVE_BASE_URL + '/api/v1').replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

interface ImportStats {
  total: number;
  valid: number;
  duplicates: number;
  errors: number;
  assignedCount: number;
}

export default function ImportLeadsScreen() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [errors, setErrors] = useState<any[]>([]);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv', 
          'text/comma-separated-values',
          'application/csv',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
          'application/vnd.ms-excel'
        ],
        copyToCacheDirectory: true
      });

      if (!result.canceled) {
        setSelectedFile(result.assets[0]);
        setStats(null);
        setErrors([]);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a CSV or Excel file first.');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      // On mobile react-native, FormData file append requires shape: { uri, name, type }
      const fileData = {
        uri: Platform.OS === 'ios' ? selectedFile.uri.replace('file://', '') : selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'text/csv',
      };
      
      formData.append('file', fileData as any);

      const res = await fetch(`${BASE_URL}/api/v1/leads/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setStats(data.stats);
        setSelectedFile(null);
        Alert.alert('Success', `Import completed! Assigned ${data.stats.assignedCount} leads.`);
      } else {
        if (data.stats) setStats(data.stats);
        if (data.errorDetails) setErrors(data.errorDetails);
        Alert.alert('Import Failed', data.error || 'Failed to import leads');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Import Leads</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Ionicons name="cloud-upload" size={48} color={Colors.primary} style={styles.uploadIcon} />
          <Text style={styles.cardTitle}>Upload CSV / Excel File</Text>
          <Text style={styles.cardDesc}>
            Import lead records directly. The system will automatically run validation, filter duplicates, and assign leads in round-robin to active Sales Executives.
          </Text>

          <Pressable style={styles.pickBtn} onPress={pickFile}>
            <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
            <Text style={styles.pickBtnText}>
              {selectedFile ? 'Change File' : 'Choose File'}
            </Text>
          </Pressable>

          {selectedFile && (
            <View style={styles.fileDetails}>
              <Ionicons name="attach" size={16} color={Colors.success} />
              <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
            </View>
          )}

          <Pressable 
            style={[styles.uploadBtn, (!selectedFile || loading) && styles.uploadBtnDisabled]} 
            onPress={handleUpload}
            disabled={!selectedFile || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.uploadBtnText}>Start Import</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </Pressable>
        </View>

        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Import Results Summary</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total Rows</Text>
              </View>
              <View style={[styles.statBox, { borderLeftColor: Colors.success }]}>
                <Text style={[styles.statVal, { color: Colors.success }]}>{stats.valid}</Text>
                <Text style={styles.statLabel}>Valid Leads</Text>
              </View>
              <View style={[styles.statBox, { borderLeftColor: Colors.primary }]}>
                <Text style={[styles.statVal, { color: Colors.primary }]}>{stats.assignedCount}</Text>
                <Text style={styles.statLabel}>Assigned</Text>
              </View>
              <View style={[styles.statBox, { borderLeftColor: Colors.error }]}>
                <Text style={[styles.statVal, { color: Colors.error }]}>{stats.errors}</Text>
                <Text style={styles.statLabel}>Errors</Text>
              </View>
            </View>
          </View>
        )}

        {errors.length > 0 && (
          <View style={styles.errorsCard}>
            <Text style={[styles.sectionTitle, { color: Colors.error }]}>Error Details (First 10 rows)</Text>
            {errors.map((err, idx) => (
              <View key={idx} style={styles.errorRow}>
                <Text style={styles.errorRowNo}>Row {err.row}:</Text>
                <Text style={styles.errorRowText}>{err.error}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: '#FFFFFF', gap: Spacing.md },
  menuBtn: { padding: Spacing.xs },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  content: { padding: Spacing.md, gap: Spacing.md },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center' },
  uploadIcon: { marginBottom: Spacing.md },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs },
  cardDesc: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.primaryLight },
  pickBtnText: { color: Colors.primary, fontWeight: '700', fontSize: FontSize.md },
  fileDetails: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md },
  fileName: { fontSize: FontSize.sm, color: Colors.success, fontWeight: '600', maxWidth: 200 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, width: '100%', height: 50, borderRadius: BorderRadius.md, marginTop: Spacing.xl },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: FontSize.md },
  statsCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.lg },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginBottom: Spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statBox: { flex: 1, minWidth: '45%', backgroundColor: Colors.background, borderLeftWidth: 3, borderLeftColor: Colors.textMuted, padding: Spacing.md, borderRadius: BorderRadius.sm, gap: 2 },
  statVal: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  errorsCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.lg },
  errorRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border + '50' },
  errorRowNo: { fontWeight: '700', color: Colors.error, fontSize: FontSize.sm },
  errorRowText: { flex: 1, color: Colors.text, fontSize: FontSize.sm }
});
