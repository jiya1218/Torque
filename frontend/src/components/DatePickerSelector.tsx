import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../utils/theme';

interface DatePickerSelectorProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
}

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

export default function DatePickerSelector({
  label,
  value,
  onChange,
  placeholder = 'Select Date',
  minYear = 1960,
  maxYear = new Date().getFullYear() + 5
}: DatePickerSelectorProps) {
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
  for (let y = maxYear; y >= minYear; y--) {
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
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
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
              <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
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
              <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
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

const styles = StyleSheet.create({
  pickerField: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
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
});
