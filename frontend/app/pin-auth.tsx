import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize } from '../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';

export default function PinLoginScreen() {
  const router = useRouter();
  const { setPinAuthenticated } = useAuth();
  const [pin, setPin] = useState('');
  const [storedPin, setStoredPin] = useState<string | null>(null);

  const handleBiometric = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Login with Biometrics',
          fallbackLabel: 'Use PIN',
        });
        if (result.success) {
          setPinAuthenticated(true);
          router.replace('/(protected)/dashboard');
        }
      }
    } catch (err) {
      console.warn('Biometric auth failed:', err);
    }
  }, [router, setPinAuthenticated]);

  const checkPin = useCallback(async () => {
    try {
      const p = await SecureStore.getItemAsync('user_pin');
      setStoredPin(p);
      if (p) {
        handleBiometric();
      }
    } catch (err) {
      console.warn('SecureStore read failed:', err);
    }
  }, [handleBiometric]);

  useEffect(() => {
    checkPin();
  }, [checkPin]);

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const verifyPin = useCallback(async (enteredPin: string) => {
    try {
      if (storedPin) {
        if (enteredPin === storedPin) {
          setPinAuthenticated(true);
          router.replace('/(protected)/dashboard');
        } else {
          Alert.alert('Incorrect PIN', 'Please try again.');
          setPin('');
        }
      } else {
        await SecureStore.setItemAsync('user_pin', enteredPin);
        Alert.alert('PIN Set', 'Your security PIN has been saved.');
        setPinAuthenticated(true);
        router.replace('/(protected)/dashboard');
      }
    } catch (err) {
      console.warn('PIN verification error:', err);
      setPinAuthenticated(true);
      router.replace('/(protected)/dashboard');
    }
  }, [storedPin, router, setPinAuthenticated]);

  const handleDelete = () => setPin(pin.slice(0, -1));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="lock-closed" size={48} color={Colors.primary} />
        <Text style={styles.title}>{storedPin ? 'Enter Security PIN' : 'Set Security PIN'}</Text>
        <Text style={styles.subtitle}>Secure your account</Text>
      </View>

      <View style={styles.pinDots}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.dot, pin.length >= i && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <Pressable key={num} style={styles.key} onPress={() => handlePress(num.toString())}>
            <Text style={styles.keyText}>{num}</Text>
          </Pressable>
        ))}
        <Pressable style={styles.key} onPress={handleBiometric}>
          <Ionicons name="finger-print" size={24} color={Colors.text} />
        </Pressable>
        <Pressable style={styles.key} onPress={() => handlePress('0')}>
          <Text style={styles.keyText}>0</Text>
        </Pressable>
        <Pressable style={styles.key} onPress={handleDelete}>
          <Ionicons name="backspace-outline" size={24} color={Colors.text} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: Spacing.xl * 2 },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginTop: Spacing.md },
  subtitle: { fontSize: FontSize.md, color: Colors.textMuted, marginTop: 4 },
  pinDots: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl * 2 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  keypad: { width: '80%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.lg },
  key: { width: '30%', aspectRatio: 1, borderRadius: 50, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  keyText: { fontSize: FontSize.xxl, fontWeight: '600', color: Colors.text },
});
