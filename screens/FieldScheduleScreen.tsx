import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useFieldSchedule } from '../hooks/useTimmi';
import type { TimeSlot } from '../api/timmi.types';

// ------------------------------------------------------------------
// Known fields — add more as needed
// ------------------------------------------------------------------
const FIELDS = [
  { id: 11102, name: 'LOHKO 1 (HP)' },
  { id: 11103, name: 'LOHKO 2 (HP)' },
  { id: 11104, name: 'TN CAST' },
  { id: 11105, name: 'TN/A CAST' },
];

// ------------------------------------------------------------------
// Slot row
// ------------------------------------------------------------------
function SlotRow({ slot }: { slot: TimeSlot }) {
  return (
    <View style={[styles.slotRow, slot.isBooked ? styles.slotBooked : styles.slotOpen]}>
      <View style={styles.slotTimeWrap}>
        <Text style={[styles.slotTime, slot.isBooked ? styles.textBooked : styles.textOpen]}>
          {slot.startLabel} – {slot.endLabel}
        </Text>
      </View>
      <Text
        style={[styles.slotTeam, slot.isBooked ? styles.textBooked : styles.textOpenMuted]}
        numberOfLines={1}
      >
        {slot.isBooked ? slot.booking?.team ?? 'Varattu' : 'Vapaa'}
      </Text>
      <View style={[styles.badge, slot.isBooked ? styles.badgeBooked : styles.badgeOpen]}>
        <Text style={[styles.badgeText, slot.isBooked ? styles.badgeTextBooked : styles.badgeTextOpen]}>
          {slot.isBooked ? 'varattu' : 'vapaa'}
        </Text>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------
// Main screen
// ------------------------------------------------------------------
interface Props {
  initialResourceId?: number;
  initialDate?: string;
}

export default function FieldScheduleScreen({
  initialResourceId = FIELDS[0].id,
  initialDate,
}: Props) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedFieldId, setSelectedFieldId] = useState(initialResourceId);
  const [dateStr] = useState(initialDate ?? todayStr);

  const { slots, loading, error, refresh } = useFieldSchedule(selectedFieldId, dateStr);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Field selector */}
      <View style={styles.fieldSelector}>
        <FlatList
          data={FIELDS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.fieldTab,
                item.id === selectedFieldId && styles.fieldTabActive,
              ]}
              onPress={() => setSelectedFieldId(item.id)}
            >
              <Text
                style={[
                  styles.fieldTabText,
                  item.id === selectedFieldId && styles.fieldTabTextActive,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        />
      </View>

      {/* Header info */}
      {slots && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Resource Name</Text>
          <Text style={styles.headerSub}>
            {dateStr} · auki Open Time – Close Time
          </Text>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1D9E75" />
          <Text style={styles.loadingText}>Ladataan varauksia...</Text>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Virhe: {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
            <Text style={styles.retryText}>Yritä uudelleen</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Slots list */}
      {!loading && slots && (
        <FlatList
          data={slots}
          keyExtractor={(item) => `${item.startMs}`}
          renderItem={({ item }) => <SlotRow slot={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#1D9E75" />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Ei aikavälejä tälle päivälle.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  fieldSelector: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  fieldTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#D0D0D0',
    backgroundColor: '#FFFFFF',
  },
  fieldTabActive: {
    backgroundColor: '#1D9E75',
    borderColor: '#1D9E75',
  },
  fieldTabText: {
    fontSize: 13,
    color: '#555',
  },
  fieldTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E8E8',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  headerSub: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#888',
  },
  errorBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FAECE7',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#F0997B',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#712B13',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#D85A30',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  listContent: {
    padding: 12,
    gap: 8,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 0.5,
    marginBottom: 6,
  },
  slotBooked: {
    backgroundColor: '#FAECE7',
    borderColor: '#F0997B',
  },
  slotOpen: {
    backgroundColor: '#E1F5EE',
    borderColor: '#5DCAA5',
  },
  slotTimeWrap: {
    minWidth: 110,
  },
  slotTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  textBooked: {
    color: '#712B13',
  },
  textOpen: {
    color: '#085041',
  },
  textOpenMuted: {
    color: '#0F6E56',
  },
  slotTeam: {
    flex: 1,
    fontSize: 13,
    marginHorizontal: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  badgeBooked: {
    backgroundColor: '#F5C4B3',
  },
  badgeOpen: {
    backgroundColor: '#9FE1CB',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  badgeTextBooked: {
    color: '#712B13',
  },
  badgeTextOpen: {
    color: '#085041',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 14,
  },
});
