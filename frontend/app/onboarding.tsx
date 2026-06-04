import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../src/lib/supabase';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/utils/theme';

const LIVE_BASE_URL = 'https://torque-alpha.vercel.app';

const getBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return 'http://localhost:3000';
  }
  return (process.env.EXPO_PUBLIC_API_URL || LIVE_BASE_URL + '/api/v1').replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
};

const BASE_URL = getBaseUrl();
const ONBOARDING_API = `${BASE_URL}/api/v1/onboarding`;

interface OnboardingDoc {
  type: string;
  uri: string;
  name: string;
  url?: string;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  const [form, setForm] = useState({
    fullName: '', // Surname First
    email: '',
    password: '',
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

  useEffect(() => {
    async function loadRoles() {
      try {
        const ROLES_API = `${BASE_URL}/api/v1/roles`;
        const res = await fetch(ROLES_API);
        if (res.ok) {
          const data = await res.json();
          setRoles(data);
          if (data.length > 0) {
            setSelectedRoleId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading roles:', err);
      }
    }
    loadRoles();
  }, []);

  const selectedRole = roles.find(r => r.id === selectedRoleId);

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

  const uploadFile = async (doc: OnboardingDoc): Promise<string | null> => {
    try {
      const fileExt = doc.name.split('.').pop();
      const fileName = `${Date.now()}-${doc.type}.${fileExt}`;
      const filePath = `onboarding/${fileName}`;

      // Convert URI to Blob for Supabase
      const response = await fetch(doc.uri);
      const blob = await response.blob();

      const { error } = await supabase.storage
        .from('documents')
        .upload(filePath, blob, {
          contentType: blob.type,
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Upload Error:', error);
      return null;
    }
  };

  const handleRegister = async () => {
    if (!form.fullName || !form.email || !form.password) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      // 1. Upload all documents first
      const uploadedDocs: { type: string, url: string }[] = [];
      const docEntries = Object.entries(docs);

      for (const [key, doc] of docEntries) {
        if (doc) {
          const url = await uploadFile(doc);
          if (url) {
            uploadedDocs.push({ type: key.toUpperCase(), url });
          }
        }
      }

      // 2. Submit data to API
      const response = await fetch(ONBOARDING_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, roleId: selectedRoleId, documents: uploadedDocs })
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success',
          'Your application has been submitted! Our team will review your documents and activate your account soon.',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
      } else {
        Alert.alert('Registration Failed', result.error || 'Something went wrong');
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
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>Join Torque Auto Advisor</Text>
            <Text style={styles.subtitle}>Complete your professional profile and onboarding documents.</Text>
          </View>

          {/* Progress */}
          <View style={styles.progressWrap}>
            <View style={[styles.progressBar, { width: `${(step / 4) * 100}%` }]} />
          </View>

          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.sectionTitle}>Select Your Role</Text>
              <Text style={styles.infoText}>Choose your professional designation to map your permissions automatically.</Text>
              
              <View style={{ gap: 12, marginBottom: 20 }}>
                {roles.map((r) => {
                  const isSelected = r.id === selectedRoleId;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => setSelectedRoleId(r.id)}
                      style={[
                        {
                          padding: 16,
                          borderRadius: BorderRadius.md,
                          borderWidth: 2,
                          borderColor: isSelected ? Colors.primary : Colors.border,
                          backgroundColor: isSelected ? Colors.primaryLight : Colors.surface,
                        }
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: isSelected ? Colors.primary : Colors.text }}>
                          {r.name}
                        </Text>
                        {isSelected && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
                      </View>
                      <Text style={{ fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 }}>
                        {r.description || 'Access mappings for this role.'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {selectedRole && selectedRole.permissions && (
                <View style={{ backgroundColor: Colors.surfaceMuted, padding: 16, borderRadius: BorderRadius.md, marginBottom: 20 }}>
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: Colors.text, marginBottom: 8 }}>
                    Inherited Role Permissions:
                  </Text>
                  <View style={{ maxHeight: 120 }}>
                    <ScrollView nestedScrollEnabled={true}>
                      {selectedRole.permissions.map((p: any, i: number) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Ionicons name="shield" size={12} color={Colors.primary} />
                          <Text style={{ fontSize: FontSize.xs, color: Colors.textLight }} numberOfLines={1}>
                            {p.name} - {p.description}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}

              <Pressable style={styles.mainBtn} onPress={() => setStep(2)}>
                <Text style={styles.mainBtnText}>Next: Account Details</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              </Pressable>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.sectionTitle}>Account Details</Text>
              
              <View style={styles.field}>
                <Text style={styles.label}>FULL NAME (Surname First) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. MEHRA KARAN"
                  value={form.fullName}
                  onChangeText={(val) => setForm({ ...form, fullName: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>EMAIL ADDRESS *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="karan@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(val) => setForm({ ...form, email: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PASSWORD *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  secureTextEntry
                  value={form.password}
                  onChangeText={(val) => setForm({ ...form, password: val })}
                />
              </View>

              <View style={styles.btnRow}>
                <Pressable style={styles.backStepBtn} onPress={() => setStep(1)}>
                  <Text style={styles.backStepBtnText}>Back</Text>
                </Pressable>
                <Pressable style={[styles.mainBtn, { flex: 2 }]} onPress={() => setStep(3)}>
                  <Text style={styles.mainBtnText}>Next: Professional Info</Text>
                </Pressable>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.sectionTitle}>Professional Info</Text>

              <View style={styles.field}>
                <Text style={styles.label}>HIGHEST QUALIFICATION</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. MBA, B.Tech"
                  value={form.highestQualification}
                  onChangeText={(val) => setForm({ ...form, highestQualification: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>DATE OF BIRTH (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1995-05-20"
                  value={form.dateOfBirth}
                  onChangeText={(val) => setForm({ ...form, dateOfBirth: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>JOINING DATE (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2024-04-20"
                  value={form.joiningDate}
                  onChangeText={(val) => setForm({ ...form, joiningDate: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>MOBILE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+91 00000 00000"
                  keyboardType="phone-pad"
                  value={form.personalMobile}
                  onChangeText={(val) => setForm({ ...form, personalMobile: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>HOME MOBILE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+91 00000 00000"
                  keyboardType="phone-pad"
                  value={form.homeMobile}
                  onChangeText={(val) => setForm({ ...form, homeMobile: val })}
                />
              </View>

              <View style={styles.btnRow}>
                <Pressable style={styles.backStepBtn} onPress={() => setStep(2)}>
                  <Text style={styles.backStepBtnText}>Back</Text>
                </Pressable>
                <Pressable style={[styles.mainBtn, { flex: 2 }]} onPress={() => setStep(4)}>
                  <Text style={styles.mainBtnText}>Next: Documents</Text>
                </Pressable>
              </View>
            </View>
          )}

          {step === 4 && (
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
                <Pressable style={styles.backStepBtn} onPress={() => setStep(3)}>
                  <Text style={styles.backStepBtnText}>Back</Text>
                </Pressable>

                <Pressable 
                  style={[styles.mainBtn, { flex: 2 }]} 
                  onPress={handleRegister}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.mainBtnText}>Submit Application</Text>
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
  backBtn: { marginBottom: Spacing.lg },
  header: { marginBottom: Spacing.xxl },
  title: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.xs },
  
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
  
  btnRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  backStepBtn: { flex: 1, height: 54, justifyContent: 'center', alignItems: 'center' },
  backStepBtnText: { color: Colors.textMuted, fontWeight: '700' }
});
