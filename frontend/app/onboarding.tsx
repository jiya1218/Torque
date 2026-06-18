import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/context/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/utils/theme';

const LIVE_BASE_URL = 'https://torque-alpha.vercel.app';

const getBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return 'http://localhost:3000';
  }
  return (process.env.EXPO_PUBLIC_API_URL || LIVE_BASE_URL + '/api/v1').replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
};

const BASE_URL = getBaseUrl();

import DatePickerSelector from '../src/components/DatePickerSelector';

interface OnboardingDoc {
  type: string;
  uri: string;
  name: string;
  url?: string;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    highestQualification: '',
    dateOfBirth: '',
    joiningDate: '',
    personalMobile: '',
    homeMobile: ''
  });

  const [docs, setDocs] = useState<Record<string, OnboardingDoc | null>>({
    adhar: null,
    pan: null,
    ssc: null,
    qualification: null,
    leaving: null,
    photo: null
  });

  // Pre-fill form from user profile if it already has values (useful for revision workflow)
  const [isPrefilled, setIsPrefilled] = useState(false);

  useEffect(() => {
    if (user && !isPrefilled) {
      setForm({
        highestQualification: user.highestQualification || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        joiningDate: user.joiningDate ? new Date(user.joiningDate).toISOString().split('T')[0] : '',
        personalMobile: user.phone || '',
        homeMobile: user.homeMobile || ''
      });
      setIsPrefilled(true);
    }
  }, [user, isPrefilled]);

  const pickDocument = async (type: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setDocs(prev => ({
          ...prev,
          [type]: { type, uri: asset.uri, name: asset.name }
        }));
      }
    } catch {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const pickImage = async (type: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setDocs(prev => ({
        ...prev,
        [type]: { type, uri: asset.uri, name: asset.fileName || 'photo.jpg' }
      }));
    }
  };

  const decodeBase64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) {
      lookup[chars.charCodeAt(i)] = i;
    }
    
    let bufferLength = base64.length * 0.75;
    if (base64[base64.length - 1] === '=') {
      bufferLength--;
      if (base64[base64.length - 2] === '=') {
        bufferLength--;
      }
    }

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const bytes = new Uint8Array(arrayBuffer);

    let p = 0;
    for (let i = 0; i < base64.length; i += 4) {
      const base64Val1 = lookup[base64.charCodeAt(i)];
      const base64Val2 = lookup[base64.charCodeAt(i + 1)];
      const base64Val3 = lookup[base64.charCodeAt(i + 2)];
      const base64Val4 = lookup[base64.charCodeAt(i + 3)];

      bytes[p++] = (base64Val1 << 2) | (base64Val2 >> 4);
      if (p < bufferLength) {
        bytes[p++] = ((base64Val2 & 15) << 4) | (base64Val3 >> 2);
      }
      if (p < bufferLength) {
        bytes[p++] = ((base64Val3 & 3) << 6) | (base64Val4 & 63);
      }
    }

    return arrayBuffer;
  };

  const uploadFile = async (doc: OnboardingDoc): Promise<string | null> => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        console.error('Upload Error: No auth token');
        return null;
      }

      const fileExt = doc.name.split('.').pop()?.toLowerCase() || 'jpg';
      let contentType = 'application/octet-stream';
      if (fileExt === 'pdf') contentType = 'application/pdf';
      else if (fileExt === 'jpg' || fileExt === 'jpeg') contentType = 'image/jpeg';
      else if (fileExt === 'png') contentType = 'image/png';
      else if (fileExt === 'webp') contentType = 'image/webp';
      else if (fileExt === 'avif') contentType = 'image/avif';

      // React Native FormData: pass file as {uri, name, type} object
      const formData = new FormData();
      formData.append('file', {
        uri: doc.uri,
        name: `${doc.type}.${fileExt}`,
        type: contentType,
      } as any);
      formData.append('docType', doc.type);

      // Upload via server API (uses service role key, bypasses RLS)
      const uploadUrl = `${BASE_URL}/api/v1/onboarding/upload`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('Upload Error:', errData.error || response.status);
        return null;
      }

      const result = await response.json();
      return result.url;
    } catch (error) {
      console.error('Upload Error:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!form.highestQualification || !form.dateOfBirth || !form.personalMobile) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        Alert.alert('Error', 'Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      // 1. Upload all selected documents
      const uploadedDocs: { type: string, url: string }[] = [];
      const failedDocs: string[] = [];
      const docEntries = Object.entries(docs);
      const selectedCount = docEntries.filter(([, doc]) => doc !== null).length;

      for (const [key, doc] of docEntries) {
        if (doc) {
          const url = await uploadFile(doc);
          if (url) {
            uploadedDocs.push({ type: key.toUpperCase(), url });
          } else {
            failedDocs.push(key.toUpperCase());
          }
        }
      }

      // If some docs failed to upload, warn the user
      if (failedDocs.length > 0) {
        setLoading(false);
        Alert.alert(
          'Upload Failed',
          `Failed to upload: ${failedDocs.join(', ')}. Please check your internet connection and try again.`
        );
        return;
      }

      // 2. Submit data to API
      const SUBMIT_API = `${BASE_URL}/api/v1/onboarding/submit-form`;
      const response = await fetch(SUBMIT_API, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          ...form, 
          documents: uploadedDocs 
        })
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success',
          'Your application has been submitted! Our team will review your profile and activate your account soon.',
          [{ text: 'OK', onPress: () => refreshUser() }]
        );
      } else {
        Alert.alert('Submission Failed', result.error || 'Something went wrong');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const renderDocRow = (label: string, type: string, isImage = false) => {
    const doc = docs[type];
    return (
      <View style={styles.docRow}>
        <View style={styles.docInfo}>
          <Text style={styles.docLabel}>{label}</Text>
          {doc && <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>}
        </View>
        <Pressable 
          style={[styles.uploadBtn, doc && styles.uploadBtnDone]} 
          onPress={() => isImage ? pickImage(type) : pickDocument(type)}
        >
          <Ionicons name={doc ? "checkmark-circle" : "cloud-upload"} size={20} color={doc ? Colors.success : Colors.primary} />
          <Text style={[styles.uploadBtnText, doc && styles.uploadBtnTextDone]}>
            {doc ? 'Attached' : 'Upload'}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Profile Onboarding</Text>
              <Text style={styles.subtitle}>Complete your profile details to unlock access</Text>
            </View>
            <Pressable onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={22} color={Colors.error} />
            </Pressable>
          </View>

          {/* Admin revision remark banner */}
          {user?.onboardingRemark ? (
            <View style={styles.remarkBox}>
              <Ionicons name="alert-circle" size={24} color={Colors.error} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.remarkTitle}>Revision Requested by Admin:</Text>
                <Text style={styles.remarkText}>{user.onboardingRemark}</Text>
              </View>
            </View>
          ) : null}

          {/* Progress */}
          <View style={styles.progressWrap}>
            <View style={[styles.progressBar, { width: `${(step / 2) * 100}%` }]} />
          </View>

          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.sectionTitle}>Professional Info</Text>

              <View style={styles.field}>
                <Text style={styles.label}>HIGHEST QUALIFICATION *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. MBA, B.Tech"
                  value={form.highestQualification}
                  onChangeText={(val) => setForm({ ...form, highestQualification: val })}
                />
              </View>

              <DatePickerSelector
                label="Date of Birth *"
                value={form.dateOfBirth}
                onChange={(val) => setForm({ ...form, dateOfBirth: val })}
                placeholder="Select date of birth"
                minYear={1950}
                maxYear={new Date().getFullYear()}
              />

              <DatePickerSelector
                label="Joining Date"
                value={form.joiningDate}
                onChange={(val) => setForm({ ...form, joiningDate: val })}
                placeholder="Select joining date"
                minYear={2010}
                maxYear={new Date().getFullYear() + 2}
              />

              <View style={styles.field}>
                <Text style={styles.label}>MOBILE NUMBER *</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                    placeholder="98765 43210"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={form.personalMobile.startsWith('+91') ? form.personalMobile.substring(3).trim() : form.personalMobile}
                    onChangeText={(val) => {
                      const cleaned = val.replace(/\D/g, '');
                      setForm({ ...form, personalMobile: cleaned ? `+91${cleaned}` : '' });
                    }}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>HOME MOBILE NUMBER</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                    placeholder="98765 43210"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={form.homeMobile.startsWith('+91') ? form.homeMobile.substring(3).trim() : form.homeMobile}
                    onChangeText={(val) => {
                      const cleaned = val.replace(/\D/g, '');
                      setForm({ ...form, homeMobile: cleaned ? `+91${cleaned}` : '' });
                    }}
                  />
                </View>
              </View>

              <Pressable style={styles.mainBtn} onPress={() => setStep(2)}>
                <Text style={styles.mainBtnText}>Next: Upload Documents</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              </Pressable>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.sectionTitle}>Document Uploads</Text>
              <Text style={styles.infoText}>Please upload clear scans or photos of the following documents.</Text>

              <View style={styles.docsList}>
                {renderDocRow("ADHAR CARD", "adhar")}
                {renderDocRow("PAN CARD", "pan")}
                {renderDocRow("SSC MARKSHEET", "ssc")}
                {renderDocRow("QUALIFICATION CERT.", "qualification")}
                {renderDocRow("SCHOOL LEAVING CERT.", "leaving")}
                {renderDocRow("PASSPORT SIZE PHOTO", "photo", true)}
              </View>

              <View style={styles.btnRow}>
                <Pressable style={styles.backStepBtn} onPress={() => setStep(1)}>
                  <Text style={styles.backStepBtnText}>Back</Text>
                </Pressable>

                <Pressable 
                  style={[styles.mainBtn, { flex: 2, marginTop: 0 }]} 
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.mainBtnText}>Submit Details</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl },
  title: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  subtitle: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  logoutBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  
  remarkBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.error + '30',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.xl
  },
  remarkTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.error },
  remarkText: { fontSize: FontSize.sm - 1, color: Colors.error, marginTop: 2, lineHeight: 18 },

  progressWrap: {
    height: 6, backgroundColor: Colors.surfaceMuted, 
    borderRadius: 3, marginBottom: Spacing.xxxl,
    overflow: 'hidden'
  },
  progressBar: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },

  stepContainer: { },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: Spacing.lg },
  infoText: { fontSize: FontSize.sm, color: Colors.textLight, marginBottom: Spacing.xl },

  field: { marginBottom: Spacing.lg },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight, letterSpacing: 1, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, 
    borderColor: Colors.border, borderRadius: BorderRadius.md,
    height: 50, paddingHorizontal: Spacing.md, fontSize: FontSize.md,
    color: Colors.text
  },

  docsList: { marginBottom: Spacing.xl },
  docRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceMuted,
    gap: Spacing.md
  },
  docInfo: { flex: 1 },
  docLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  docName: { fontSize: FontSize.xs, color: Colors.success, marginTop: 2 },
  
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, backgroundColor: Colors.primaryLight,
    borderWidth: 1, borderColor: Colors.primary
  },
  uploadBtnDone: { backgroundColor: Colors.successBg, borderColor: Colors.success },
  uploadBtnText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '800' },
  uploadBtnTextDone: { color: Colors.success },

  mainBtn: {
    backgroundColor: Colors.primary, height: 54,
    borderRadius: BorderRadius.md, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    gap: Spacing.sm, marginTop: Spacing.xl,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4
  },
  mainBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '800' },
  
  btnRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', marginTop: Spacing.xl },
  backStepBtn: { flex: 1, height: 54, justifyContent: 'center', alignItems: 'center' },
  backStepBtnText: { color: Colors.textMuted, fontWeight: '700' },

  // Picker styles
  pickerField: {
    marginBottom: Spacing.lg,
  },
  pickerTrigger: {
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
  pickerTriggerText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  placeholderText: {
    color: Colors.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  calendarCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    width: '100%',
    maxWidth: 340,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  navBtn: {
    padding: Spacing.xs,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: Spacing.sm,
  },
  weekdayText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textLight,
    width: 36,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarCell: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 1,
  },
  calendarCellEmpty: {
    width: '14.28%',
    height: 38,
  },
  calendarCellSelected: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  calendarCellText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  calendarCellTextSelected: {
    color: Colors.white,
    fontWeight: '700',
  },
  listContainer: {
    maxHeight: 200,
    marginVertical: Spacing.sm,
  },
  listContent: {
    paddingVertical: Spacing.xs,
  },
  listItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  listItemSelected: {
    backgroundColor: Colors.primaryLight,
  },
  listItemText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  listItemTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  closeModalBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  closeModalBtnText: {
    color: Colors.textMuted,
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  countryCodeBox: {
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRightWidth: 0,
    borderTopLeftRadius: BorderRadius.md,
    borderBottomLeftRadius: BorderRadius.md,
    height: 50,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
});
