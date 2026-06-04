import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import AppFooter from '../../src/components/AppFooter';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function ReportsScreen() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [previewType, setPreviewType] = useState<string>('');

  const REPORT_TYPES = [
    {
      id: 'revenue',
      title: 'Revenue Report',
      description: 'Income, expense, and net revenue for the period.',
      icon: 'cash-outline',
      color: Colors.success,
      bg: Colors.successBg,
    },
    {
      id: 'leads',
      title: 'Lead Report',
      description: 'Leads with status breakdown and agents.',
      icon: 'people-outline',
      color: Colors.primary,
      bg: Colors.primaryLight,
    },
    {
      id: 'hr',
      title: 'Employee Report',
      description: 'List of employees, roles, and status.',
      icon: 'ribbon-outline',
      color: '#8B5CF6',
      bg: '#F5F3FF',
    }
  ];

  const handlePreview = async (type: string) => {
    setLoading(type);
    setPreview(null);
    try {
      const data = await api.get(`/reports?type=${type}&from=${from}&to=${to}`);
      setPreview(data);
      setPreviewType(type);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load report preview');
    } finally {
      setLoading(null);
    }
  };

  const handleExportCSV = async (type: string) => {
    setLoading(type + '_csv');
    try {
      const data = await api.get(`/reports?type=${type}&from=${from}&to=${to}`);
      const records = data.records || [];
      if (records.length === 0) {
        Alert.alert('No Data', 'No records found for the selected period.');
        setLoading(null);
        return;
      }

      // Convert JSON records to CSV
      const headers = Object.keys(records[0]);
      const rows = records.map((r: any) =>
        headers.map(h => {
          let val = r[h];
          if (typeof val === 'object' && val !== null) {
            val = val.fullName || val.name || JSON.stringify(val);
          }
          return JSON.stringify(val ?? '');
        }).join(',')
      );
      const csvContent = [headers.join(','), ...rows].join('\n');

      const filename = `${type}_report_${from}_${to}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Export ${type.toUpperCase()} Report`,
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        Alert.alert('Success', `CSV saved to private storage:\n${fileUri}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to export CSV report');
    } finally {
      setLoading(null);
    }
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
        <Text style={styles.title}>Reports</Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Date Filter Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Select Period</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <Text style={styles.dateLabel}>FROM (YYYY-MM-DD)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textLight} />
                <TextInput
                  style={styles.dateInput}
                  value={from}
                  onChangeText={setFrom}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>
            <View style={styles.dateCol}>
              <Text style={styles.dateLabel}>TO (YYYY-MM-DD)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textLight} />
                <TextInput
                  style={styles.dateInput}
                  value={to}
                  onChangeText={setTo}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Report Types Grid */}
        <View style={styles.reportsGrid}>
          {REPORT_TYPES.map(report => (
            <View key={report.id} style={styles.reportCard}>
              <View style={[styles.iconBg, { backgroundColor: report.bg }]}>
                <Ionicons name={report.icon as any} size={22} color={report.color} />
              </View>
              <Text style={styles.reportTitle}>{report.title}</Text>
              <Text style={styles.reportDesc}>{report.description}</Text>

              <View style={styles.btnRow}>
                <Pressable
                  style={[styles.btn, styles.btnOutline]}
                  onPress={() => handlePreview(report.id)}
                  disabled={loading === report.id}
                >
                  {loading === report.id ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="eye-outline" size={14} color={Colors.primary} />
                      <Text style={[styles.btnText, { color: Colors.primary }]}>Preview</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  style={[styles.btn, { backgroundColor: report.color }]}
                  onPress={() => handleExportCSV(report.id)}
                  disabled={loading === report.id + '_csv'}
                >
                  {loading === report.id + '_csv' ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={14} color={Colors.white} />
                      <Text style={[styles.btnText, { color: Colors.white }]}>CSV</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Preview Section */}
        {preview && (
          <View style={[styles.card, { marginBottom: Spacing.xxl }]}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>
                {previewType.toUpperCase()} REPORT PREVIEW
              </Text>
              <View style={styles.statsRow}>
                {preview.total !== undefined && (
                  <Text style={styles.previewMeta}>Records: {preview.total}</Text>
                )}
                {preview.net !== undefined && (
                  <Text style={[styles.previewMeta, { color: Colors.success, fontWeight: '700' }]}>
                    Net: ₹{preview.net.toLocaleString()}
                  </Text>
                )}
              </View>
            </View>

            {(!preview.records || preview.records.length === 0) ? (
              <View style={styles.emptyPreview}>
                <Text style={styles.emptyText}>No data available for this range.</Text>
              </View>
            ) : (
              <View style={styles.previewList}>
                {preview.records.slice(0, 15).map((row: any, index: number) => (
                  <View key={index} style={styles.previewRow}>
                    {previewType === 'leads' && (
                      <View style={styles.rowContent}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowMainText}>{row.clientName || '—'}</Text>
                          <Text style={styles.rowSubText}>{row.vehicleNo || 'No vehicle'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <View style={[styles.miniBadge, { backgroundColor: Colors.primaryLight }]}>
                            <Text style={[styles.miniBadgeText, { color: Colors.primary }]}>
                              {row.status}
                            </Text>
                          </View>
                          <Text style={styles.rowSubText}>
                            {row.assignee?.fullName || row.assignee?.full_name || 'Unassigned'}
                          </Text>
                        </View>
                      </View>
                    )}

                    {previewType === 'revenue' && (
                      <View style={styles.rowContent}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowMainText}>{row.category || '—'}</Text>
                          <Text style={styles.rowSubText}>
                            {row.date ? new Date(row.date).toLocaleDateString() : '—'} • {row.paymentMethod || '—'}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text
                            style={[
                              styles.rowMainText,
                              { color: row.type === 'income' ? Colors.success : Colors.error }
                            ]}
                          >
                            {row.type === 'income' ? '+' : '-'}₹{Number(row.amount).toLocaleString()}
                          </Text>
                          <Text style={styles.rowSubText}>{row.type?.toUpperCase()}</Text>
                        </View>
                      </View>
                    )}

                    {previewType === 'hr' && (
                      <View style={styles.rowContent}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowMainText}>{row.fullName || row.full_name || '—'}</Text>
                          <Text style={styles.rowSubText}>{row.email || '—'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <View
                            style={[
                              styles.miniBadge,
                              { backgroundColor: row.isActive ? Colors.successBg : Colors.errorBg }
                            ]}
                          >
                            <Text
                              style={[
                                styles.miniBadgeText,
                                { color: row.isActive ? Colors.success : Colors.error }
                              ]}
                            >
                              {row.isActive ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                          <Text style={styles.rowSubText}>{row.role?.name || 'No Role'}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                ))}

                {preview.records.length > 15 && (
                  <Text style={styles.previewFooterText}>
                    Showing top 15 of {preview.records.length} records. Export CSV to view all.
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <AppFooter />
    </SafeAreaView>
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
  container: { flex: 1, padding: Spacing.md },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: Spacing.md
  },
  cardHeader: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.md
  },
  dateRow: { flexDirection: 'row', gap: Spacing.md },
  dateCol: { flex: 1 },
  dateLabel: {
    fontSize: FontSize.xs - 1,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: Spacing.xs
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm,
    height: 40,
    gap: Spacing.xs
  },
  dateInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    padding: 0
  },
  reportsGrid: {
    flexDirection: 'column',
    gap: Spacing.md,
    marginBottom: Spacing.md
  },
  reportCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm
  },
  reportTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs
  },
  reportDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.lg
  },
  btnRow: { flexDirection: 'row', gap: Spacing.sm },
  btn: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background
  },
  btnText: { fontSize: FontSize.xs, fontWeight: '700' },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md
  },
  previewTitle: {
    fontSize: FontSize.xs,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: 1
  },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  previewMeta: { fontSize: FontSize.xs, color: Colors.textMuted },
  emptyPreview: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted, fontStyle: 'italic' },
  previewList: { gap: Spacing.xs },
  previewRow: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceMuted
  },
  rowContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  rowMainText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  rowSubText: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  miniBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginBottom: 2
  },
  miniBadgeText: { fontSize: 10, fontWeight: '800' },
  previewFooterText: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textLight,
    paddingVertical: Spacing.md
  }
});
