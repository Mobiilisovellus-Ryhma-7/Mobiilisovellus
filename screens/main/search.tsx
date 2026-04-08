import React from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Button, Chip, Dialog, Portal, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import Screen from '../shared/Screen';
import { getResponsiveMetrics } from '../shared/responsive';
import {
  auth,
  createBooking,
  FacilitySection,
  getBookingsForSectionOnDate,
  listFacilitySections,
  searchFacilitySectionsByBookingStatus,
  searchFacilitySectionsByName,
  searchFacilitySectionsBySport,
} from '../../services/firebase';
import { buildDailyTimeSlots, formatDateKey, TimeSlot } from '../../utils/timeslots';

type SearchMode = 'all' | 'sport' | 'name' | 'status';

type SearchProps = {
  onBack?: () => void;
  onGoHome?: () => void;
  initialSearchMode?: SearchMode;
  initialSport?: string;
  initialBooked?: boolean;
};

type SportOption = { label: string; value: string };

function formatDateAsDbDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function timeToHour(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute) || minute !== 0) {
    return null;
  }

  return hour;
}

export default function Search({ onBack, onGoHome, initialSearchMode, initialSport, initialBooked }: SearchProps) {
  const { colors, dark } = useTheme();
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const styles = React.useMemo(() => createStyles(metrics, colors), [metrics, colors]);

  const [sections, setSections] = React.useState<FacilitySection[]>([]);
  const [selectedSection, setSelectedSection] = React.useState<FacilitySection | null>(null);
  const [searchMode, setSearchMode] = React.useState<SearchMode>(initialSearchMode ?? 'all');
  const [sportInput, setSportInput] = React.useState(initialSport ?? '');
  const [nameInput, setNameInput] = React.useState('');
  const [bookedOnly, setBookedOnly] = React.useState(initialBooked ?? false);
  const [sportOptions, setSportOptions] = React.useState<SportOption[]>([]);
  const [isSportPickerOpen, setIsSportPickerOpen] = React.useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [activeDateFilter, setActiveDateFilter] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [sectionBookings, setSectionBookings] = React.useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = React.useState(false);
  const [bookingError, setBookingError] = React.useState<string | null>(null);
  const [bookingFeedback, setBookingFeedback] = React.useState<string | null>(null);
  const [pendingBookingSlot, setPendingBookingSlot] = React.useState<TimeSlot | null>(null);

  const bookingDate = React.useMemo(() => formatDateKey(new Date()), []);

  const todaySlots = React.useMemo(() => {
    const startHour = timeToHour(selectedSection?.openingStart) ?? 8;
    const endHour = timeToHour(selectedSection?.openingEnd) ?? 22;
    return buildDailyTimeSlots(new Date(), { startHour, endHour });
  }, [selectedSection?.openingStart, selectedSection?.openingEnd]);

  const runSearch = React.useCallback(async (modeOverride?: SearchMode, sportOverride?: string, bookedOverride?: boolean) => {
    const mode = modeOverride ?? searchMode;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      let next: FacilitySection[] = [];

      if (mode === 'sport') {
        const value = (sportOverride ?? sportInput).trim();
        if (!value) {
          throw new Error('Syota laji ennen hakua.');
        }
        next = await searchFacilitySectionsBySport(value);
      } else if (mode === 'name') {
        const value = nameInput.trim();
        if (!value) {
          throw new Error('Syota kentan nimi ennen hakua.');
        }
        next = await searchFacilitySectionsByName(value);
      } else if (mode === 'status') {
        next = await searchFacilitySectionsByBookingStatus(bookedOverride ?? bookedOnly);
      } else {
        next = await listFacilitySections();
      }

      setSections(next);
    } catch (error) {
      setSections([]);
      setErrorMessage(error instanceof Error ? error.message : 'Haku epaonnistui.');
    } finally {
      setIsLoading(false);
    }
  }, [bookedOnly, nameInput, searchMode, sportInput]);

  React.useEffect(() => {
    listFacilitySections()
      .then((allSections) => {
        const sports = Array.from(new Set(allSections.map((s) => s.sport?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'fi'));
        setSportOptions(sports.map((value) => ({ label: value, value })));
      })
      .catch(() => setSportOptions([]));

    runSearch(initialSearchMode ?? 'all', initialSport, initialBooked);
  }, [initialBooked, initialSearchMode, initialSport, runSearch]);

  const loadSelectedSectionBookings = React.useCallback(async (sectionId: string) => {
    const bookings = await getBookingsForSectionOnDate(sectionId, bookingDate, ['confirmed']);
    const keys = bookings
      .filter((booking) => booking.slotStart && booking.slotEnd)
      .map((booking) => `${booking.slotStart}-${booking.slotEnd}`);
    setSectionBookings(keys);
  }, [bookingDate]);

  React.useEffect(() => {
    if (!selectedSection) {
      setSectionBookings([]);
      setBookingError(null);
      setBookingFeedback(null);
      setPendingBookingSlot(null);
      return;
    }

    setIsLoadingSlots(true);
    setBookingError(null);
    setBookingFeedback(null);

    loadSelectedSectionBookings(selectedSection.id)
      .catch((error) => {
        setSectionBookings([]);
        setBookingError(error instanceof Error ? error.message : 'Varausten lataus epaonnistui.');
      })
      .finally(() => setIsLoadingSlots(false));
  }, [loadSelectedSectionBookings, selectedSection]);

  const onBookSlot = React.useCallback(async (slot: TimeSlot) => {
    if (!selectedSection) {
      return;
    }

    const userId = auth?.currentUser?.uid;
    if (!userId) {
      setBookingError('Kirjaudu sisaan varataksesi vuoron.');
      return;
    }

    setIsSubmittingBooking(true);
    setBookingError(null);
    setBookingFeedback(null);

    try {
      await createBooking({
        facilitySectionId: selectedSection.id,
        userId,
        bookingDate,
        slotStart: slot.start,
        slotEnd: slot.end,
        status: 'confirmed',
      });

      await loadSelectedSectionBookings(selectedSection.id);
      setBookingFeedback(`Vuoro ${slot.label} varattu.`);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Varaus epaonnistui.');
    } finally {
      setIsSubmittingBooking(false);
    }
  }, [bookingDate, loadSelectedSectionBookings, selectedSection]);

  const confirmBookSlot = React.useCallback(async () => {
    if (!pendingBookingSlot) {
      return;
    }

    await onBookSlot(pendingBookingSlot);
    setPendingBookingSlot(null);
  }, [onBookSlot, pendingBookingSlot]);

  const filteredSections = React.useMemo(() => {
    if (!activeDateFilter) {
      return sections;
    }

    return sections.filter((section) => {
      if (!section.createdAt) {
        return false;
      }

      const parsed = new Date(section.createdAt);
      return !Number.isNaN(parsed.getTime()) && formatDateAsDbDate(parsed) === activeDateFilter;
    });
  }, [activeDateFilter, sections]);

  const selectedSectionSlotRows = React.useMemo(() => {
    const bookedSet = new Set(sectionBookings);

    return todaySlots.map((slot) => {
      const isBooked = bookedSet.has(slot.key);
      const disabled = isBooked || slot.isPast || isSubmittingBooking;

      return (
        <Pressable
          key={slot.key}
          style={[styles.slotBookingRow, disabled ? styles.slotBookingRowDisabled : null, isBooked ? styles.slotBookingRowBooked : null]}
          disabled={disabled}
          onPress={() => setPendingBookingSlot(slot)}
        >
          <Text style={styles.slotBookingLabel}>{slot.label}</Text>
          <Text style={[styles.slotBookingStatus, isBooked ? styles.slotBookingStatusBooked : null]}>
            {isBooked ? 'Varattu' : slot.isPast ? 'Mennyt' : 'Vapaa'}
          </Text>
        </Pressable>
      );
    });
  }, [isSubmittingBooking, sectionBookings, styles, todaySlots]);

  return (
    <Screen style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.screen, { backgroundColor: colors.background }]}> 
        <View style={styles.topArea}>
          <View style={styles.headerRow}>
            <Pressable style={styles.backButton} onPress={onBack}>
              <Text style={styles.backIcon}>{'<'}</Text>
            </Pressable>
            <View style={styles.headerSpacer} />
          </View>

          <Pressable onPress={onGoHome}>
            <Image source={require('../../assets/dynamic-sport-hall-logo.png')} style={styles.logo} resizeMode="contain" />
          </Pressable>

          <Text style={[styles.title, { color: colors.onSurface }]} variant="titleMedium">
            HALLILLE
          </Text>

          <View style={styles.filtersRow}>
            <Chip mode="flat" compact style={styles.filterChip} textStyle={styles.filterChipText} selected={searchMode === 'sport'} onPress={() => { setSearchMode('sport'); setIsSportPickerOpen(true); }}>
              Laji
            </Chip>
            <Chip mode="flat" compact style={styles.filterChip} textStyle={styles.filterChipText} onPress={() => setIsDatePickerVisible(true)}>
              {activeDateFilter
                ? `${`${selectedDate.getDate()}`.padStart(2, '0')}.${`${selectedDate.getMonth() + 1}`.padStart(2, '0')}.${selectedDate.getFullYear()}`
                : 'Pvm'}
            </Chip>
            <Chip mode="flat" compact style={styles.filterChip} textStyle={styles.filterChipText} selected={searchMode === 'status'} onPress={() => {
              const next = !bookedOnly;
              setBookedOnly(next);
              setSearchMode('status');
              runSearch('status', undefined, next);
            }}>
              {bookedOnly ? 'Vapaat' : 'Varatut'}
            </Chip>
          </View>

          {searchMode === 'name' ? (
            <TextInput mode="outlined" dense label="Kentan nimi" value={nameInput} onChangeText={setNameInput} style={styles.textInput} />
          ) : null}

          <Button mode="contained" onPress={() => runSearch()} style={styles.searchButton} contentStyle={styles.searchButtonContent} labelStyle={styles.searchButtonLabel} disabled={isLoading}>
            Hae kentat
          </Button>
        </View>

        <Surface style={styles.listSurface} elevation={0}>
          <ScrollView contentContainerStyle={styles.listContent}>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            {isLoading ? <ActivityIndicator size="small" style={styles.loading} /> : null}
            {filteredSections.map((section) => (
              <Pressable key={section.id} style={styles.slotRow} onPress={() => setSelectedSection(section)}>
                <View style={styles.slotTextWrap}>
                  <Text style={[styles.slotTitle, { color: colors.onSurface }]}>{section.name ?? 'Nimeton kentta'}</Text>
                  <Text style={[styles.slotTime, { color: colors.onSurface }]}>{section.isBooked ? 'Varattu' : 'Vapaa'}</Text>
                </View>
                <Text style={styles.chevron}>{'>'}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Surface>

        <Modal visible={isSportPickerOpen} transparent animationType="fade" onRequestClose={() => setIsSportPickerOpen(false)}>
          <View style={styles.modalBackdrop}>
            <Pressable style={styles.modalDismissLayer} onPress={() => setIsSportPickerOpen(false)} />
            <View style={styles.modalPickerCard}>
              <Text style={styles.modalPickerTitle}>Valitse laji</Text>
              <ScrollView style={styles.sportPickerList} contentContainerStyle={styles.sportPickerListContent}>
                {sportOptions.map((option) => (
                  <Pressable key={option.value} style={styles.sportOption} onPress={() => {
                    setSportInput(option.value);
                    setIsSportPickerOpen(false);
                    runSearch('sport', option.value);
                  }}>
                    <Text style={styles.sportOptionText}>{option.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.modalPickerActions}>
                <Button mode="text" onPress={() => setIsSportPickerOpen(false)}>Sulje</Button>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={isDatePickerVisible} transparent animationType="fade" onRequestClose={() => setIsDatePickerVisible(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsDatePickerVisible(false)}>
            <Pressable style={styles.modalPickerCard} onPress={() => undefined}>
              <Text style={styles.modalPickerTitle}>Valitse paivamaara</Text>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                locale="fi-FI"
                display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                themeVariant={dark ? 'dark' : 'light'}
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  if (!date || event.type === 'dismissed') {
                    if (Platform.OS !== 'ios') {
                      setIsDatePickerVisible(false);
                    }
                    return;
                  }

                  setSelectedDate(date);
                  setActiveDateFilter(formatDateAsDbDate(date));
                  if (Platform.OS !== 'ios') {
                    setIsDatePickerVisible(false);
                  }
                }}
              />
              <View style={styles.modalPickerActions}>
                <Button mode="text" onPress={() => setIsDatePickerVisible(false)}>Sulje</Button>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Portal>
          <Dialog visible={!!selectedSection} onDismiss={() => setSelectedSection(null)} style={styles.dialog}>
            <View style={styles.modalCard}>
              <View style={styles.modalTopRow}>
                <Text style={styles.modalHall}>{selectedSection?.name ?? 'Nimeton kentta'}</Text>
                <Text style={styles.modalTime}>Varaa vuoro</Text>
              </View>
              <Text style={styles.modalSubLine}>Paiva: {bookingDate}</Text>
              {bookingError ? <Text style={styles.bookingErrorText}>{bookingError}</Text> : null}
              {bookingFeedback ? <Text style={styles.bookingFeedbackText}>{bookingFeedback}</Text> : null}
              <View style={styles.slotsContainer}>
                {isLoadingSlots ? (
                  <ActivityIndicator size="small" style={styles.slotLoader} />
                ) : (
                  <ScrollView style={styles.slotBookingList} contentContainerStyle={styles.slotBookingListContent}>
                    {selectedSectionSlotRows}
                  </ScrollView>
                )}
              </View>
              <Button mode="text" style={styles.closeBookingModalButton} onPress={() => setSelectedSection(null)}>Sulje</Button>
            </View>
          </Dialog>

          <Dialog visible={!!pendingBookingSlot} onDismiss={() => setPendingBookingSlot(null)} style={styles.confirmDialog}>
            <Dialog.Title>Vahvista varaus</Dialog.Title>
            <Dialog.Content>
              <Text>Haluatko varata vuoron {pendingBookingSlot?.label ?? ''}?</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setPendingBookingSlot(null)} disabled={isSubmittingBooking}>Peruuta</Button>
              <Button onPress={confirmBookSlot} loading={isSubmittingBooking} disabled={isSubmittingBooking}>Varaa</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </Screen>
  );
}

const createStyles = (metrics: ReturnType<typeof getResponsiveMetrics>, colors: any) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#ececec' },
    screen: { flex: 1, backgroundColor: '#ececec', paddingHorizontal: metrics.horizontalPadding, paddingTop: metrics.scale(16, 12, 24), paddingBottom: metrics.scale(20, 16, 28), alignItems: 'center' },
    topArea: { marginBottom: metrics.scale(12, 10, 18), width: '100%', maxWidth: metrics.contentMaxWidth, backgroundColor: colors.surface, borderRadius: metrics.scale(22, 16, 28), paddingHorizontal: metrics.scale(14, 10, 20), paddingTop: metrics.scale(10, 8, 14), paddingBottom: metrics.scale(14, 10, 20) },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { width: metrics.scale(34, 32, 42), height: metrics.scale(34, 32, 42), borderRadius: metrics.scale(17, 16, 21), backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' },
    backIcon: { fontSize: metrics.scale(22, 18, 28), lineHeight: metrics.scale(22, 18, 28), color: colors.onSurface, marginTop: -1 },
    headerSpacer: { width: metrics.scale(34, 32, 42), height: metrics.scale(34, 32, 42) },
    logo: { width: metrics.scale(120, 92, 140), height: metrics.scale(98, 74, 120), alignSelf: 'center', marginTop: metrics.scale(4, 2, 10) },
    title: { alignSelf: 'center', marginTop: 2, fontSize: metrics.scale(20, 17, 24), fontWeight: '700' },
    filtersRow: { marginTop: metrics.scale(18, 12, 24), flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: metrics.scale(8, 6, 12) },
    filterChip: { minWidth: metrics.scale(86, 72, 120), justifyContent: 'center', backgroundColor: colors.surfaceVariant },
    filterChipText: { fontSize: metrics.scale(14, 12, 18), fontWeight: '600', color: colors.onSurface },
    textInput: { marginTop: metrics.scale(10, 8, 14), backgroundColor: colors.surface },
    searchButton: { marginTop: metrics.scale(12, 10, 16), borderRadius: metrics.scale(12, 10, 16) },
    searchButtonContent: { height: metrics.scale(40, 36, 48) },
    searchButtonLabel: { fontSize: metrics.scale(16, 14, 20), fontWeight: '700' },
    listSurface: { flex: 1, width: '100%', maxWidth: metrics.contentMaxWidth, backgroundColor: colors.surface, borderRadius: metrics.scale(22, 16, 28), paddingHorizontal: metrics.scale(12, 8, 18) },
    listContent: { paddingBottom: metrics.scale(12, 8, 20) },
    loading: { marginVertical: metrics.scale(14, 10, 18) },
    errorText: { color: '#b91c1c', fontSize: metrics.scale(13, 11, 16), fontWeight: '500', marginTop: metrics.scale(8, 6, 10) },
    slotRow: { minHeight: metrics.scale(66, 52, 78), borderBottomWidth: 1, borderBottomColor: colors.outline, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: metrics.scale(6, 4, 10) },
    slotTextWrap: { paddingVertical: metrics.scale(8, 6, 12), flexShrink: 1, paddingRight: 10 },
    slotTitle: { fontSize: metrics.scale(19, 15, 24), fontWeight: '500' },
    slotTime: { fontSize: metrics.scale(17, 14, 22), marginTop: 2 },
    chevron: { fontSize: metrics.scale(20, 16, 26), color: colors.outline, marginLeft: 8 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: metrics.horizontalPadding },
    modalDismissLayer: { ...StyleSheet.absoluteFillObject },
    modalPickerCard: { width: '100%', maxWidth: metrics.isTablet ? 460 : 360, backgroundColor: colors.surface, borderRadius: metrics.scale(24, 18, 30), padding: metrics.scale(16, 12, 20), gap: metrics.scale(12, 10, 16) },
    modalPickerTitle: { color: colors.onSurface, fontSize: metrics.scale(18, 16, 22), fontWeight: '700' },
    modalPickerActions: { flexDirection: 'row', justifyContent: 'flex-end' },
    sportPickerList: { maxHeight: metrics.scale(340, 280, 420) },
    sportPickerListContent: { gap: metrics.scale(8, 6, 10), paddingBottom: metrics.scale(4, 2, 8) },
    sportOption: { paddingHorizontal: metrics.scale(14, 12, 18), paddingVertical: metrics.scale(12, 10, 16), borderRadius: metrics.scale(14, 12, 18), backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
    sportOptionText: { color: colors.onSurface, fontSize: metrics.scale(15, 13, 18), fontWeight: '600' },
    dialog: { backgroundColor: 'transparent', alignSelf: 'center', width: '90%', maxWidth: metrics.isTablet ? 520 : 380, borderRadius: metrics.scale(18, 14, 24), elevation: 0, marginTop: 0 },
    confirmDialog: { backgroundColor: colors.surface, borderRadius: metrics.scale(14, 10, 18) },
    modalCard: { width: '100%', backgroundColor: colors.surface, borderRadius: metrics.scale(18, 14, 24), paddingHorizontal: metrics.scale(18, 14, 26), paddingVertical: metrics.scale(14, 12, 22) },
    modalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
    modalHall: { color: colors.onSurface, fontSize: metrics.scale(14, 12, 18), fontWeight: '700', maxWidth: '65%' },
    modalTime: { color: colors.onSurface, fontSize: metrics.scale(14, 12, 18), fontWeight: '700' },
    modalSubLine: { color: colors.onSurface, fontSize: metrics.scale(13, 11, 16), fontWeight: '700', marginTop: 2 },
    bookingErrorText: { color: '#b91c1c', fontSize: metrics.scale(13, 11, 16), marginTop: metrics.scale(8, 6, 12), fontWeight: '600' },
    bookingFeedbackText: { color: '#0f766e', fontSize: metrics.scale(13, 11, 16), marginTop: metrics.scale(8, 6, 12), fontWeight: '600' },
    slotsContainer: { marginTop: metrics.scale(14, 10, 18), backgroundColor: colors.surfaceVariant, borderRadius: metrics.scale(12, 10, 16), paddingHorizontal: metrics.scale(10, 8, 14), paddingVertical: metrics.scale(10, 8, 14) },
    slotLoader: { marginVertical: metrics.scale(10, 8, 14) },
    slotBookingList: { maxHeight: metrics.scale(220, 180, 300) },
    slotBookingListContent: { gap: metrics.scale(8, 6, 10) },
    slotBookingRow: { borderRadius: metrics.scale(10, 8, 14), backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, paddingHorizontal: metrics.scale(10, 8, 14), paddingVertical: metrics.scale(10, 8, 12), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    slotBookingRowDisabled: { opacity: 0.65 },
    slotBookingRowBooked: { borderColor: '#ef4444', backgroundColor: '#fee2e2' },
    slotBookingLabel: { color: colors.onSurface, fontSize: metrics.scale(13, 11, 16), fontWeight: '700' },
    slotBookingStatus: { color: '#047857', fontSize: metrics.scale(12, 10, 14), fontWeight: '700' },
    slotBookingStatusBooked: { color: '#991b1b' },
    closeBookingModalButton: { marginTop: metrics.scale(10, 8, 14), alignSelf: 'flex-end' },
  });
