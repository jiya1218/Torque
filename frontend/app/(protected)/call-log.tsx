import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';

interface PredefinedResponse {
  id: string;
  text: string;
  requiresFollowUp: boolean;
}

export default function CallLogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ leadId: string; leadName: string }>();
  
  const [responses, setResponses] = useState<PredefinedResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedResponse, setSelectedResponse] = useState<PredefinedResponse | null>(null);
  const [followupDate, setFollowupDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    try {
      const res = await api.get<PredefinedResponse[]>('/settings/responses?activeOnly=true');
      setResponses(res || []);
    } catch (error) {
      console.error('Failed to load responses', error);
      Alert.alert('Error', 'Failed to load predefined responses');
    } finally {
      setLoadingResponses(false);
    }
  };

  const filteredResponses = responses.filter(r => 
    r.text.toLowerCase().includes(search.toLowerCase())
  );

  const submit = async () => {
    if (!params.leadId) { Alert.alert('Error', 'Lead ID is missing'); return; }
    if (!selectedResponse) { Alert.alert('Error', 'Please select a response'); return; }
    if (selectedResponse.requiresFollowUp && !followupDate) {
      Alert.alert('Error', 'Follow-up date is required for this response'); 
      return;
    }

    setSaving(true);
    try {
      const payload = {
        leadId: params.leadId,
        status: selectedResponse.text,
        notes: selectedResponse.text, // Disabling manual remarks, sending fixed text
        followupDate: selectedResponse.requiresFollowUp ? followupDate : null
      };

      const res = await api.post<any>(`/leads/${params.leadId}/response`, payload);
      
      if (res.nextLeadId) {
        Alert.alert(
          'Saved', 
          'Outcome saved. Would you like to call the next pending lead?',
          [
            { text: 'No', onPress: () => router.back(), style: 'cancel' },
            { text: 'Yes', onPress: () => router.replace(`/lead/${res.nextLeadId}`) }
          ]
        );
      } else {
        Alert.alert('Success', 'Outcome saved. No more pending leads.');
        router.back();
      }
    } catch (e: any) { 
      Alert.alert('Error', e.message || 'Failed to save'); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Log Call Outcome</Text>
        <Pressable onPress={submit} disabled={saving || !selectedResponse} style={[styles.saveBtn, (!selectedResponse || saving) && { opacity: 0.5 }]}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
        </Pressable>
      </View>
      
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <View style={styles.leadBanner}>
            <Ionicons name="person" size={18} color={Colors.primary} />
            <Text style={styles.leadBannerText}>{params.leadName || 'Selected Lead'}</Text>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search response... (e.g. રોંગ)" 
              placeholderTextColor={Colors.textLight} 
              value={search} 
              onChangeText={setSearch}
            />
          </View>

          <Text style={styles.label}>SELECT PREDEFINED RESPONSE</Text>
          
          {loadingResponses ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={filteredResponses}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const isSelected = selectedResponse?.id === item.id;
                return (
                  <Pressable 
                    style={[styles.responseItem, isSelected && styles.responseItemSelected]} 
                    onPress={() => setSelectedResponse(item)}
                  >
                    <Text style={[styles.responseItemText, isSelected && styles.responseItemTextSelected]}>
                      {item.text}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No responses found.</Text>
              }
            />
          )}

          {selectedResponse?.requiresFollowUp && (
            <View style={styles.followupContainer}>
              <Text style={styles.label}>FOLLOW-UP DATE (REQUIRED)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="YYYY-MM-DD" 
                placeholderTextColor={Colors.textLight} 
                value={followupDate} 
                onChangeText={setFollowupDate} 
              />
              <Text style={styles.hint}>Format: YYYY-MM-DD (e.g., 2024-04-26)</Text>
            </View>
          )}
        </View>
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
  content: { flex: 1, padding: Spacing.lg },
  leadBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.primaryLight, padding: Spacing.lg, borderRadius: BorderRadius.sm, marginBottom: Spacing.md },
  leadBannerText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, height: 48, marginBottom: Spacing.md },
  searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: FontSize.md, color: Colors.text },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: Spacing.sm },
  list: { flex: 1 },
  responseItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white },
  responseItemSelected: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  responseItemText: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  responseItemTextSelected: { fontWeight: '700', color: Colors.primary },
  emptyText: { textAlign: 'center', marginTop: 20, color: Colors.textMuted },
  followupContainer: { marginTop: Spacing.md, padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, backgroundColor: Colors.white, paddingHorizontal: Spacing.md, height: 48, fontSize: FontSize.md, color: Colors.text },
  hint: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 4 },
});
