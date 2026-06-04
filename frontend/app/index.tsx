import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // If already logged in, show nothing — the route guard in _layout will redirect
  if (user && !isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 16, color: Colors.textMuted }}>Redirecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      // DO NOT navigate here — the route guard in _layout.tsx handles it
    } catch (e: any) {
      setError(e.message || 'Login failed');
      Alert.alert('Login Failed', e.message || 'Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Image 
            source={require('../assets/images/logo.png')} 
            style={styles.logoImage} 
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Complete Insurance Management</Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>EMAIL</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
            </Pressable>
          </View>
          <Pressable style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </Pressable>

          <Pressable 
            style={styles.signupBtn} 
            onPress={() => router.push('/signup')}
          >
            <Text style={styles.signupBtnText}>
              Don&apos;t have an account? <Text style={styles.signupLinkText}>Sign Up</Text>
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>PROD CREDENTIALS</Text>
          <Text style={styles.footerCred}>admin@toque.com / Admin@123</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { alignItems: 'center', marginBottom: 30 },
  logoImage: { width: 240, height: 85, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.xs, fontWeight: '600', letterSpacing: 0.5 },
  form: { gap: Spacing.sm },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginTop: Spacing.md },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, backgroundColor: Colors.surface, height: 52 },
  inputIcon: { paddingLeft: Spacing.lg },
  input: { flex: 1, paddingHorizontal: Spacing.md, fontSize: FontSize.lg, color: Colors.text },
  eyeBtn: { padding: Spacing.lg },
  loginBtn: { backgroundColor: Colors.primary, height: 52, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl },
  loginBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  signupBtn: { marginTop: Spacing.md, alignItems: 'center', paddingVertical: Spacing.sm },
  signupBtnText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },
  signupLinkText: { color: Colors.primary, fontWeight: '800' },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.errorBg, padding: Spacing.md, borderRadius: BorderRadius.sm, gap: Spacing.sm },
  errorText: { color: Colors.error, fontSize: FontSize.sm, flex: 1 },
  footer: { alignItems: 'center', marginTop: 30 },
  footerText: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600', letterSpacing: 1 },
  footerCred: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.xs },
});
