import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert, StatusBar, Modal, TextInput, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCacheStore } from '../../src/store/cacheStore';
import Sidebar from '../../src/components/Sidebar';
import AppFooter from '../../src/components/AppFooter';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as any),
});


const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

interface DatePickerSelectorProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

function DatePickerSelector({ label, value, onChange, placeholder = 'Select Date' }: DatePickerSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });
  
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setCurrentDate(d);
      }
    }
  }, [value]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const years: number[] = [];
  for (let y = year + 5; y >= 1990; y--) {
    years.push(y);
  }

  const handlePrevMonth = () => {
    if (month === 0) {
      setCurrentDate(new Date(year - 1, 11, 1));
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setCurrentDate(new Date(year + 1, 0, 1));
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const handleSelectDay = (selectedDay: number) => {
    const d = new Date(year, month, selectedDay);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setModalVisible(false);
  };

  const gridItems = [];
  for (let i = 0; i < firstDay; i++) {
    gridItems.push(<View key={`empty-${i}`} style={styles.calendarCellEmpty} />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isSelected = value && new Date(value).getFullYear() === year && new Date(value).getMonth() === month && new Date(value).getDate() === d;
    gridItems.push(
      <Pressable
        key={`day-${d}`}
        style={[styles.calendarCell, isSelected && styles.calendarCellSelected]}
        onPress={() => handleSelectDay(d)}
      >
        <Text style={[styles.calendarCellText, isSelected && styles.calendarCellTextSelected]}>
          {d}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.pickerField}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Pressable style={styles.pickerTrigger} onPress={() => { setViewMode('days'); setModalVisible(true); }}>
        <Text style={[styles.pickerTriggerText, !value && styles.placeholderText]}>
          {value ? value : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={Colors.textMuted} />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.centeredModalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.calendarCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.calendarHeader}>
              <Pressable onPress={handlePrevMonth} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={20} color={Colors.text} />
              </Pressable>
              
              <View style={styles.headerTitleWrap}>
                <Pressable onPress={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}>
                  <Text style={styles.headerText}>{months[month]}</Text>
                </Pressable>
                <Pressable onPress={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}>
                  <Text style={styles.headerText}> {year}</Text>
                </Pressable>
              </View>

              <Pressable onPress={handleNextMonth} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={20} color={Colors.text} />
              </Pressable>
            </View>

            {viewMode === 'days' && (
              <View>
                <View style={styles.weekdaysRow}>
                  {daysOfWeek.map(d => (
                    <Text key={d} style={styles.weekdayText}>{d}</Text>
                  ))}
                </View>
                <View style={styles.calendarGrid}>
                  {gridItems}
                </View>
              </View>
            )}

            {viewMode === 'months' && (
              <ScrollView style={styles.listContainer} contentContainerStyle={styles.pickerListContent}>
                {months.map((m, idx) => (
                  <Pressable
                    key={m}
                    style={[styles.listItem, idx === month && styles.listItemSelected]}
                    onPress={() => {
                      setCurrentDate(new Date(year, idx, 1));
                      setViewMode('days');
                    }}
                  >
                    <Text style={[styles.listItemText, idx === month && styles.listItemTextSelected]}>{m}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {viewMode === 'years' && (
              <ScrollView style={styles.listContainer} contentContainerStyle={styles.pickerListContent}>
                {years.map((y) => (
                  <Pressable
                    key={y}
                    style={[styles.listItem, y === year && styles.listItemSelected]}
                    onPress={() => {
                      setCurrentDate(new Date(y, month, 1));
                      setViewMode('days');
                    }}
                  >
                    <Text style={[styles.listItemText, y === year && styles.listItemTextSelected]}>{y}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            
            <View style={styles.calendarFooter}>
              <Pressable style={styles.closeModalBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeModalBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

interface TimePickerSelectorProps {
  label: string;
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
}

function TimePickerSelector({ label, value, onChange, placeholder = 'Select Time' }: TimePickerSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState('10');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedAmpm, setSelectedAmpm] = useState('AM');

  useEffect(() => {
    if (value) {
      const parts = value.split(' ');
      if (parts.length === 2) {
        setSelectedAmpm(parts[1]);
        const timeParts = parts[0].split(':');
        if (timeParts.length === 2) {
          setSelectedHour(timeParts[0]);
          setSelectedMinute(timeParts[1]);
        }
      }
    }
  }, [value]);

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  const handleConfirm = () => {
    onChange(`${selectedHour}:${selectedMinute} ${selectedAmpm}`);
    setModalVisible(false);
  };

  return (
    <View style={styles.pickerField}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Pressable style={styles.pickerTrigger} onPress={() => setModalVisible(true)}>
        <Text style={[styles.pickerTriggerText, !value && styles.placeholderText]}>
          {value ? value : placeholder}
        </Text>
        <Ionicons name="time-outline" size={20} color={Colors.textMuted} />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.centeredModalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.timeCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.timeTitle}>Select Time</Text>
            
            <View style={styles.timePickerContainer}>
              <View style={styles.timeCol}>
                <Text style={styles.timeColLabel}>Hour</Text>
                <ScrollView style={styles.timeScroll} keyboardShouldPersistTaps="handled">
                  {hours.map(h => (
                    <Pressable
                      key={h}
                      style={[styles.timeItem, selectedHour === h && styles.timeItemActive]}
                      onPress={() => setSelectedHour(h)}
                    >
                      <Text style={[styles.timeItemText, selectedHour === h && styles.timeItemTextActive]}>{h}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.timeCol}>
                <Text style={styles.timeColLabel}>Min</Text>
                <ScrollView style={styles.timeScroll} keyboardShouldPersistTaps="handled">
                  {minutes.map(m => (
                    <Pressable
                      key={m}
                      style={[styles.timeItem, selectedMinute === m && styles.timeItemActive]}
                      onPress={() => setSelectedMinute(m)}
                    >
                      <Text style={[styles.timeItemText, selectedMinute === m && styles.timeItemTextActive]}>{m}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.timeCol}>
                <Text style={styles.timeColLabel}>AM/PM</Text>
                <View style={styles.ampmContainer}>
                  {['AM', 'PM'].map(a => (
                    <Pressable
                      key={a}
                      style={[styles.timeItem, selectedAmpm === a && styles.timeItemActive]}
                      onPress={() => setSelectedAmpm(a)}
                    >
                      <Text style={[styles.timeItemText, selectedAmpm === a && styles.timeItemTextActive]}>{a}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.timeFooter}>
              <Pressable style={styles.timeCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.timeCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.timeConfirmBtn} onPress={handleConfirm}>
                <Text style={styles.timeConfirmText}>Confirm</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

interface DropdownProps {
  label: string;
  placeholder: string;
  options: { label: string; value: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
  searchable?: boolean;
  onOpen?: () => void;
  loading?: boolean;
}

function DropdownSelector({ label, placeholder, options, selectedValue, onSelect, searchable = false, onOpen, loading = false }: DropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const selectedOption = options.find(o => o.value === selectedValue);
  
  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <View style={styles.dropdownField}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Pressable 
        style={styles.dropdownTrigger} 
        onPress={() => {
          setSearchQuery('');
          setModalVisible(true);
          if (onOpen) onOpen();
        }}
      >
        <Text style={[styles.dropdownTriggerText, !selectedOption && styles.placeholderText]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
        )}
      </Pressable>
      
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dropdownModalContent}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>{label}</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            
            {searchable && (
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.textLight} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  placeholderTextColor={Colors.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                    <Ionicons name="close-circle" size={16} color={Colors.textLight} />
                  </Pressable>
                )}
              </View>
            )}
            
            <ScrollView style={styles.optionsList} keyboardShouldPersistTaps="handled">
              {filteredOptions.length === 0 ? (
                <Text style={styles.noOptionsText}>No options found</Text>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === selectedValue;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[styles.optionItem, isSelected && styles.optionItemActive]}
                      onPress={() => {
                        onSelect(opt.value);
                        setModalVisible(false);
                      }}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                        {opt.label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function FollowUpsScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();

  const [items, setItems] = useState<any[]>(cache['/follow-ups']?.items || []);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Add Follow-up Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({
    lead_id: '',
    lead_name: '',
    type: 'call',
    scheduled_at: '',
    notes: ''
  });

  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('10:00 AM');

  const combineDateTime = (dateStr: string, timeStr: string) => {
    try {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-').map(Number);
      let [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      
      const date = new Date(year, month - 1, day, hours, minutes);
      return date.toISOString();
    } catch (err) {
      console.error('Error combining date and time:', err);
      return '';
    }
  };

  useEffect(() => {
    if (selectedDate && selectedTime) {
      const combined = combineDateTime(selectedDate, selectedTime);
      setNewFollowUp(prev => ({ ...prev, scheduled_at: combined }));
    }
  }, [selectedDate, selectedTime]);

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await api.get<any>('/leads');
      const leadsArr = res.leads || [];
      setLeads(leadsArr);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (addModalVisible) {
      fetchLeads();
    }
  }, [addModalVisible]);

  // Load cache on mount
  useEffect(() => {
    loadCache().then(() => {
      const cached = cache['/follow-ups'];
      if (cached && cached.items) {
        setItems(cached.items);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any[]>(`/follow-ups?status=${filter}`);
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);
      setCache('/follow-ups', { items: arr, timestamp: Date.now() });
    } catch {
      console.error('[FollowUpsScreen] Failed to load follow-ups');
    }
  }, [filter, setCache]);

  useFocusEffect(
    useCallback(() => {
      const cached = cache['/follow-ups'];
      const lastFetched = cached?.timestamp;
      if (!lastFetched || Date.now() - lastFetched > 30000) {
        load();
      }
    }, [load, cache])
  );
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleComplete = async (item: any) => {
    Alert.alert(
      'Complete Task',
      `Are you sure you want to mark follow-up for ${item.leadName || item.lead?.clientName || 'this lead'} as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: async () => {
            try {
              await api.patch(`/follow-ups/${item.id}`, { status: 'completed' });
              Alert.alert('Success', 'Follow-up marked as completed.');
              load();
            } catch {
              Alert.alert('Error', 'Failed to update follow-up status.');
            }
          },
        },
      ]
    );
  };

  const handleAddFollowUp = async () => {
    if (!newFollowUp.lead_name.trim() || !newFollowUp.scheduled_at) {
      Alert.alert('Error', 'Lead Name and Scheduled Date & Time are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/follow-ups', {
        lead_id: newFollowUp.lead_id || undefined,
        lead_name: newFollowUp.lead_name.trim(),
        type: newFollowUp.type,
        scheduled_at: new Date(newFollowUp.scheduled_at).toISOString(),
        notes: newFollowUp.notes.trim() || null
      });

      // Schedule local notification
      try {
        const triggerDate = new Date(newFollowUp.scheduled_at);
        const seconds = Math.floor((triggerDate.getTime() - Date.now()) / 1000);
        if (seconds > 0) {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status === 'granted') {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `Follow-up Reminder: ${newFollowUp.lead_name}`,
                body: `${newFollowUp.type.toUpperCase()} follow-up is scheduled now.${newFollowUp.notes ? ` Notes: ${newFollowUp.notes}` : ''}`,
                data: { leadId: newFollowUp.lead_id },
              },
              trigger: {
                seconds: seconds,
              } as any,
            });
          }
        }
      } catch (notifErr) {
        console.error('Failed to schedule local notification:', notifErr);
      }

      setAddModalVisible(false);
      setNewFollowUp({ lead_id: '', lead_name: '', type: 'call', scheduled_at: '', notes: '' });
      setSelectedDate('');
      Alert.alert('Success', 'Follow-up scheduled successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to schedule follow-up');
    } finally {
      setSaving(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'call': return { name: 'call-outline' as const, color: '#3b82f6', bg: '#eff6ff' };
      case 'whatsapp': return { name: 'logo-whatsapp' as const, color: '#10b981', bg: '#ecfdf5' };
      case 'visit': return { name: 'location-outline' as const, color: '#ef4444', bg: '#fff1f2' };
      default: return { name: 'checkbox-outline' as const, color: '#8b5cf6', bg: '#f5f3ff' };
    }
  };

  const getStatusStyle = (status: string) => {
    const key = status?.toLowerCase() || 'pending';
    return StatusColors[key] || StatusColors.pending;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Sidebar Component */}
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Follow-ups</Text>
        <Pressable style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['pending', 'completed', 'all'] as const).map((f) => {
          const active = filter === f;
          return (
            <Pressable key={f} style={[styles.filterTab, active && styles.filterTabActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={52} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No scheduled follow-ups</Text>
            <Text style={styles.emptyText}>Tasks matching &quot;{filter}&quot; will appear here</Text>
          </View>
        }
        renderItem={({ item }) => {
          const typeStyle = getTypeIcon(item.type);
          const statStyle = getStatusStyle(item.status);
          const scheduledDate = new Date(item.scheduledAt);

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.leadInfo}>
                  <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg }]}>
                    <Ionicons name={typeStyle.name} size={16} color={typeStyle.color} />
                  </View>
                  <View>
                    <Text style={styles.leadName}>{item.leadName || item.lead?.clientName || 'Unnamed Lead'}</Text>
                    <Text style={styles.typeText}>{item.type?.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statStyle.bg, borderColor: statStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statStyle.text }]}>{item.status?.toUpperCase()}</Text>
                </View>
              </View>

              {item.notes ? (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesText} numberOfLines={3}>&quot;{item.notes}&quot;</Text>
                </View>
              ) : null}

              <View style={styles.cardFooter}>
                <View style={styles.timeContainer}>
                  <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.timeText}>
                    {scheduledDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                    {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {item.status === 'pending' ? (
                  <Pressable style={({ pressed }) => [styles.completeBtn, pressed && styles.completeBtnPressed]} onPress={() => handleComplete(item)}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.completeBtnText}>Complete</Text>
                  </Pressable>
                ) : (
                  item.completedAt && (
                    <View style={styles.completedAtContainer}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                      <Text style={styles.completedAtText}>Done</Text>
                    </View>
                  )
                )}
              </View>
            </View>
          );
        }}
      />

      {/* ── Add Follow-up Modal ── */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Follow-up</Text>
              <Pressable onPress={() => setAddModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <DropdownSelector
                label="Select Lead *"
                placeholder="Choose a lead"
                options={leads.map(l => ({
                  label: `${l.clientName || 'Unnamed'} (${l.vehicleNo || 'No vehicle'})`,
                  value: l.id
                }))}
                selectedValue={newFollowUp.lead_id}
                onSelect={(val) => {
                  const lead = leads.find(l => l.id === val);
                  setNewFollowUp(prev => ({ 
                    ...prev, 
                    lead_id: val, 
                    lead_name: lead ? lead.clientName : '' 
                  }));
                }}
                searchable
                onOpen={fetchLeads}
                loading={loadingLeads}
              />

              <DropdownSelector
                label="Follow-up Type"
                placeholder="Select type"
                options={[
                  { label: 'Call', value: 'call' },
                  { label: 'WhatsApp', value: 'whatsapp' },
                  { label: 'Visit', value: 'visit' }
                ]}
                selectedValue={newFollowUp.type}
                onSelect={(val) => setNewFollowUp(prev => ({ ...prev, type: val }))}
              />

              <View style={styles.dateTimePickersRow}>
                <View style={{ flex: 1 }}>
                  <DatePickerSelector
                    label="Date *"
                    value={selectedDate}
                    onChange={setSelectedDate}
                    placeholder="Select Date"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <TimePickerSelector
                    label="Time *"
                    value={selectedTime}
                    onChange={setSelectedTime}
                    placeholder="Select Time"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>MANUAL SCHEDULE DATE & TIME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2026-06-15T10:00:00Z"
                  placeholderTextColor={Colors.textLight}
                  value={newFollowUp.scheduled_at}
                  onChangeText={(val) => setNewFollowUp({ ...newFollowUp, scheduled_at: val })}
                />
                <Text style={styles.hint}>Format: YYYY-MM-DDTHH:MM:SSZ</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>NOTES / REMARKS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Add details of the follow-up..."
                  placeholderTextColor={Colors.textLight}
                  value={newFollowUp.notes}
                  onChangeText={(val) => setNewFollowUp({ ...newFollowUp, notes: val })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleAddFollowUp} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Schedule</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AppFooter active="follow-ups" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: '#FFFFFF', gap: Spacing.md },
  menuBtn: { padding: Spacing.xs },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  filterContainer: { flexDirection: 'row', backgroundColor: '#F8FAFC', marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: BorderRadius.xl, padding: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  filterTab: { flex: 1, paddingVertical: Spacing.md - 2, alignItems: 'center', borderRadius: BorderRadius.lg },
  filterTabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  filterText: { fontSize: FontSize.sm - 1, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5 },
  filterTextActive: { color: Colors.primary, fontWeight: '800' },
  listContent: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xl + 40 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  leadInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  typeBadge: { width: 36, height: 36, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  leadName: { fontSize: FontSize.lg - 1, fontWeight: '800', color: Colors.text },
  typeText: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, marginTop: 1 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.sm, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: '800' },
  notesContainer: { backgroundColor: '#F8FAFC', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  notesText: { fontSize: FontSize.sm, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: Spacing.md },
  timeContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  timeText: { fontSize: FontSize.sm - 1, color: Colors.textMuted, fontWeight: '600' },
  completeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.success, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.md, gap: Spacing.xs },
  completeBtnPressed: { opacity: 0.8 },
  completeBtnText: { color: '#FFFFFF', fontSize: FontSize.xs + 1, fontWeight: '800' },
  completedAtContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  completedAtText: { fontSize: FontSize.xs + 1, color: Colors.success, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '75%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  closeBtn: { padding: Spacing.xs },
  modalBody: { flex: 1, marginTop: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, height: 50, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  hint: { fontSize: 10, color: Colors.textLight, marginTop: 4 },
  submitBtn: { backgroundColor: Colors.primary, height: 52, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl },
  submitBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },

  // Picker & Dropdown styles
  dateTimePickersRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  pickerField: {
    marginBottom: Spacing.md,
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
  centeredModalOverlay: {
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
  pickerListContent: {
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
  timeCard: {
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
  timeTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 160,
  },
  timeCol: {
    flex: 1,
    alignItems: 'center',
  },
  timeColLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  timeScroll: {
    width: '100%',
  },
  ampmContainer: {
    justifyContent: 'center',
    height: '100%',
    gap: Spacing.sm,
  },
  timeItem: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    width: '80%',
    marginVertical: 2,
  },
  timeItemActive: {
    backgroundColor: Colors.primaryLight,
  },
  timeItemText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  timeItemTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  timeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  timeCancelBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  timeCancelText: {
    color: Colors.textMuted,
    fontWeight: '700',
  },
  timeConfirmBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  timeConfirmText: {
    color: Colors.white,
    fontWeight: '700',
  },
  dropdownField: {
    marginBottom: Spacing.md,
  },
  dropdownTrigger: {
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
  dropdownTriggerText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dropdownModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownModalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  modalCloseBtn: {
    padding: Spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    height: '100%',
  },
  searchClearBtn: {
    padding: Spacing.xs,
  },
  optionsList: {
    paddingHorizontal: Spacing.lg,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceMuted,
  },
  optionItemActive: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  optionText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  optionTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  noOptionsText: {
    textAlign: 'center',
    color: Colors.textLight,
    paddingVertical: Spacing.xl,
    fontSize: FontSize.sm,
  },
});
