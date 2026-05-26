import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';

export default function QuotationNewScreen() {
  const router = useRouter();
  const [form, setForm] = useState({ customer_name: '', vehicle_type: 'Car', vehicle_number: '', insurance_type: 'comprehensive', premium_amount: '', idv: '', ncb: '0%', coverage_details: '' });
  const [loading, setLoading] = useState(false);
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.customer_name || !form.premium_amount) { Alert.alert('Error', 'Customer name and premium required'); return; }
    setLoading(true);
    try {
      await api.post('/quotations/', {
        amount: Number(form.premium_amount) || 0,
        status: 'Draft',
        details: {
          customer_name: form.customer_name,
          vehicle_type: form.vehicle_type,
          vehicle_number: form.vehicle_number,
          insurance_type: form.insurance_type,
          premium_amount: Number(form.premium_amount),
          idv: Number(form.idv),
          ncb: form.ncb,
          coverage_details: form.coverage_details,
        },
      });
      router.back();
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
        <Text style={styles.headerTitle}>New Quotation</Text>
        <Pressable testID="save-quotation-btn" onPress={submit} disabled={loading} style={styles.saveBtn}><Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save'}</Text></Pressable>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.label}>CUSTOMER NAME *</Text>
          <TextInput testID="q-customer" style={styles.input} placeholder="Customer name" placeholderTextColor={Colors.textLight} value={form.customer_name} onChangeText={v => update('customer_name', v)} />
          <Text style={styles.label}>VEHICLE TYPE</Text>
          <View style={styles.chipRow}>
            {['Car', 'Two Wheeler', 'Truck', 'Commercial'].map(t => (
              <Pressable key={t} style={[styles.chip, form.vehicle_type === t && styles.chipActive]} onPress={() => update('vehicle_type', t)}>
                <Text style={[styles.chipText, form.vehicle_type === t && styles.chipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>VEHICLE NUMBER</Text>
          <TextInput style={styles.input} placeholder="MH01AB1234" placeholderTextColor={Colors.textLight} value={form.vehicle_number} onChangeText={v => update('vehicle_number', v)} autoCapitalize="characters" />
          <Text style={styles.label}>INSURANCE TYPE</Text>
          <View style={styles.chipRow}>
            {['comprehensive', 'third_party', 'commercial'].map(t => (
              <Pressable key={t} style={[styles.chip, form.insurance_type === t && styles.chipActive]} onPress={() => update('insurance_type', t)}>
                <Text style={[styles.chipText, form.insurance_type === t && styles.chipTextActive]}>{t.replace(/_/g, ' ')}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>PREMIUM AMOUNT (₹) *</Text>
          <TextInput testID="q-premium" style={styles.input} placeholder="e.g., 15000" placeholderTextColor={Colors.textLight} value={form.premium_amount} onChangeText={v => update('premium_amount', v)} keyboardType="numeric" />
          <Text style={styles.label}>IDV (₹)</Text>
          <TextInput style={styles.input} placeholder="Insured Declared Value" placeholderTextColor={Colors.textLight} value={form.idv} onChangeText={v => update('idv', v)} keyboardType="numeric" />
          <Text style={styles.label}>NCB %</Text>
          <View style={styles.chipRow}>
            {['0%', '20%', '25%', '35%', '45%', '50%'].map(t => (
              <Pressable key={t} style={[styles.chip, form.ncb === t && styles.chipActive]} onPress={() => update('ncb', t)}>
                <Text style={[styles.chipText, form.ncb === t && styles.chipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>COVERAGE DETAILS</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Coverage details..." placeholderTextColor={Colors.textLight} value={form.coverage_details} onChangeText={v => update('coverage_details', v)} multiline numberOfLines={3} />
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: Spacing.sm },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, height: 48, fontSize: FontSize.md, color: Colors.text },
  textArea: { height: 80, paddingTop: Spacing.md, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted, textTransform: 'capitalize' },
  chipTextActive: { color: Colors.white },
});
