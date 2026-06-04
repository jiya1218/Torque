import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/utils/theme';

const LIVE_BASE_URL = 'https://torque-alpha.vercel.app';

const getBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return 'http://localhost:3000';
  }
  return (process.env.EXPO_PUBLIC_API_URL || LIVE_BASE_URL + '/api/v1').replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
};

const BASE_URL = getBaseUrl();

export default function SignupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: ''
  });

  const handleSignup = async () => {
    if (!form.fullName || !form.email || !form.password) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const SIGNUP_API = `${BASE_URL}/api/v1/auth/signup`;
      const response = await fetch(SIGNUP_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password
        })
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success',
          'Account created successfully! Please log in to complete your onboarding.',
          [{ text: 'OK', onPress: () => router.replace('/') }]
        );
      } else {
        Alert.alert('Signup Failed', result.error || 'Something went wrong');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Torque Auto Advisor management platform</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.field}>
              <Text style={styles.label}>FULL NAME *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. MEHRA KARAN"
                value={form.fullName}
                onChangeText={(val) => setForm(prev => ({ ...prev, fullName: val }))}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>EMAIL ADDRESS *</Text>
              <TextInput
                style={styles.input}
                placeholder="karan@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={form.email}
                onChangeText={(val) => setForm(prev => ({ ...prev, email: val }))}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>PASSWORD *</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                secureTextEntry
                value={form.password}
                onChangeText={(val) => setForm(prev => ({ ...prev, password: val }))}
              />
            </View>

            <Pressable 
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable onPress={() => router.replace('/')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl },
  backBtn: { marginBottom: Spacing.lg, width: 40, height: 40, justifyContent: 'center' },
  header: { marginBottom: Spacing.xxl },
  title: { fontSize: FontSize.xxl + 4, fontWeight: '900', color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.xs },
  loadingContainer: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: Colors.textMuted, fontSize: FontSize.sm },
  formContainer: { gap: Spacing.md },
  field: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight, letterSpacing: 1, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, 
    borderColor: Colors.border, borderRadius: BorderRadius.md,
    height: 50, paddingHorizontal: Spacing.md, fontSize: FontSize.md,
    color: Colors.text
  },
  pickerContainer: {
    gap: 8,
    marginTop: 4
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface
  },
  roleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight
  },
  roleCardText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '600'
  },
  roleCardTextActive: {
    color: Colors.primary,
    fontWeight: '700'
  },
  noManagersText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    padding: 12
  },
  submitBtn: {
    backgroundColor: Colors.primary, height: 54,
    borderRadius: BorderRadius.md, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    gap: Spacing.sm, marginTop: Spacing.lg,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4
  },
  submitBtnDisabled: {
    opacity: 0.7
  },
  submitBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30, gap: 6, marginBottom: 20 },
  footerText: { fontSize: FontSize.sm, color: Colors.textMuted },
  loginLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '800' }
});
