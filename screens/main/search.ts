import React from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Button,
  Chip,
  Dialog,
  Portal,
  Surface,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { getResponsiveMetrics } from '../shared/responsive';
import {
  FacilitySection,
  listFacilitySections,
  searchFacilitySectionsByBookingStatus,
  searchFacilitySectionsByName,
  searchFacilitySectionsBySport,
} from '../../services/firebase';

type SearchProps = {
  onBack?: () => void;
};



function formatDateAsDbDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function findOpenShiftsByDate(date: Date): Promise<BookingSlot[]> {
  const dbDateValue = formatDateAsDbDate(date);

  // TODO: Replace this placeholder with real DB query:
  // WHERE bookingDate = dbDateValue::DATE AND status = 'open'
  return placeholderSlots.filter(
    (slot) => slot.bookingDate === dbDateValue && slot.status === 'open'
  );
}

function getStartMinutes(timeRange: string): number {
  const [start] = timeRange.split('-');
  const [hours, minutes] = start.split(':').map(Number);
  return hours * 60 + minutes;
}

function sortSlots(slots: BookingSlot[], mode: SortMode): BookingSlot[] {
  const next = [...slots];

  if (mode === 'alphabet') {
    return next.sort((a, b) => a.title.localeCompare(b.title, 'fi'));
  }

  return next.sort((a, b) => getStartMinutes(a.time) - getStartMinutes(b.time));
}

export default function Search({ onBack }: SearchProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const styles = React.useMemo(() => createStyles(metrics), [metrics]);

  const [selectedSection, setSelectedSection] = React.useState<FacilitySection | null>(null);
  const [sections, setSections] = React.useState<FacilitySection[]>([]);
  const [searchMode, setSearchMode] = React.useState<SearchMode>('all');
  const [sportInput, setSportInput] = React.useState('');
  const [nameInput, setNameInput] = React.useState('');
  const [bookedOnly, setBookedOnly] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const runSearch = React.useCallback(
    async (modeOverride?: SearchMode) => {
      const mode = modeOverride ?? searchMode;
      setErrorMessage(null);
      setIsLoading(true);

      try {
        let nextSections: FacilitySection[] = [];

        if (mode === 'sport') {
          const value = sportInput.trim();
          if (!value) {
            throw new Error('Syota laji ennen hakua.');
          }
          nextSections = await searchFacilitySectionsBySport(value);
        } else if (mode === 'name') {
          const value = nameInput.trim();
          if (!value) {
            throw new Error('Syota kentan nimi ennen hakua.');
          }
          nextSections = await searchFacilitySectionsByName(value);
        } else if (mode === 'status') {
          nextSections = await searchFacilitySectionsByBookingStatus(bookedOnly);
        } else {
          nextSections = await listFacilitySections();
        }

        setSections(nextSections);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Haku epaonnistui. Yrita uudelleen.';
        setErrorMessage(message);
        setSections([]);
      } finally {
        setIsLoading(false);
      }
    },
    [bookedOnly, nameInput, searchMode, sportInput]
  );

  React.useEffect(() => {
    runSearch('all');
  }, [runSearch]);

  const openMode = (mode: SearchMode) => {
    setSearchMode(mode);
    setErrorMessage(null);
  };

  const slotRows = sections.map((section) =>
    React.createElement(
      Pressable,
      {
        key: section.id,
        style: styles.slotRow,
        onPress: () => setSelectedSection(section),
      },
      React.createElement(
        View,
        { style: styles.slotTextWrap },
        React.createElement(Text, {
          style: [styles.slotTitle, { color: colors.onSurface }],
          children: section.name ?? 'Nimeton kentta',
        }),
        React.createElement(Text, {
          style: [styles.slotTime, { color: colors.onSurface }],
          children: section.isBooked ? 'Varattu' : 'Vapaa',
        })
      ),
      React.createElement(Text, {
        style: styles.chevron,
        children: '>',
      })
    )
  );

  const listContent =
    slotRows.length > 0
      ? slotRows
      : [
          React.createElement(Text, {
            key: 'empty-slots',
            style: styles.emptyText,
            children: 'Ei vapaita vuoroja valitulla päivällä.',
          }),
        ];

  return React.createElement(
    SafeAreaView,
    { style: [styles.safeArea, { backgroundColor: colors.background }] },
    React.createElement(
      View,
      { style: [styles.screen, { backgroundColor: colors.background }] },
      React.createElement(
        View,
        { style: styles.topArea },
        React.createElement(
          View,
          { style: styles.headerRow },
          React.createElement(
            Pressable,
            { style: styles.backButton, onPress: onBack },
            React.createElement(Text, { style: styles.backIcon, children: '<' })
          ),
          React.createElement(View, { style: styles.headerSpacer })
        ),
        React.createElement(Image, {
          source: require('../../assets/dynamic-sport-hall-logo.png'),
          style: styles.logo,
          resizeMode: 'contain',
        }),
        React.createElement(Text, {
          style: [styles.title, { color: colors.onSurface }],
          variant: 'titleMedium',
          children: 'HALLILLE',
        }),
        React.createElement(
          View,
          { style: styles.filtersRow },
          React.createElement(Chip, {
            mode: 'flat',
            compact: true,
            style: styles.filterChip,
            textStyle: styles.filterChipText,
            selected: searchMode === 'all',
            onPress: () => openMode('all'),
            children: 'Kaikki',
          }),
          React.createElement(Chip, {
            mode: 'flat',
            compact: true,
            style: styles.filterChip,
            textStyle: styles.filterChipText,
            selected: searchMode === 'sport',
            onPress: () => openMode('sport'),
            children: 'Laji',
          }),
          React.createElement(Chip, {
            mode: 'flat',
            compact: true,
            style: styles.filterChip,
            textStyle: styles.filterChipText,
            selected: searchMode === 'name',
            onPress: () => openMode('name'),
            children: 'Nimi',
          }),
          React.createElement(Chip, {
            mode: 'flat',
            compact: true,
            style: styles.filterChip,
            textStyle: styles.filterChipText,
            selected: searchMode === 'status',
            onPress: () => openMode('status'),
            children: 'Varaustila',
          })
        ),
        searchMode === 'sport'
          ? React.createElement(TextInput, {
              mode: 'outlined',
              dense: true,
              label: 'Laji',
              value: sportInput,
              onChangeText: setSportInput,
              style: styles.textInput,
            })
          : null,
        searchMode === 'name'
          ? React.createElement(TextInput, {
              mode: 'outlined',
              dense: true,
              label: 'Kentan nimi',
              value: nameInput,
              onChangeText: setNameInput,
              style: styles.textInput,
            })
          : null,
        searchMode === 'status'
          ? React.createElement(
              View,
              { style: styles.statusRow },
              React.createElement(Text, {
                style: styles.statusText,
                children: bookedOnly ? 'Nayta varatut' : 'Nayta vapaat',
              }),
              React.createElement(Switch, {
                value: bookedOnly,
                onValueChange: setBookedOnly,
              })
            )
          : null,
        React.createElement(Button, {
          mode: 'contained',
          onPress: () => runSearch(),
          style: styles.searchButton,
          contentStyle: styles.searchButtonContent,
          labelStyle: styles.searchButtonLabel,
          disabled: isLoading,
          children: 'Hae kentat',
        })
      ),
      React.createElement(
        Surface,
        {
          style: styles.listSurface,
          elevation: 0,
          children: React.createElement(
            ScrollView,
            { contentContainerStyle: styles.listContent },
            errorMessage
              ? React.createElement(Text, {
                  style: styles.errorText,
                  children: errorMessage,
                })
              : null,
            isLoading
              ? React.createElement(ActivityIndicator, {
                  size: 'small',
                  style: styles.loading,
                })
              : null,
            !isLoading && sections.length === 0
              ? React.createElement(Text, {
                  style: styles.emptyText,
                  children: 'Ei tuloksia valituilla hakuehdoilla.',
                })
              : null,
            ...slotRows
          ),
        }
      ),
      React.createElement(
        Modal,
        {
          visible: isDatePickerVisible,
          transparent: true,
          animationType: 'fade',
          onRequestClose: () => setIsDatePickerVisible(false),
        },
        React.createElement(
          Pressable,
          {
            style: styles.modalBackdrop,
            onPress: () => setIsDatePickerVisible(false),
          },
          React.createElement(
            Pressable,
            {
              style: styles.modalPickerCard,
              onPress: () => undefined,
            },
            React.createElement(Text, {
              style: styles.modalPickerTitle,
              children: 'Valitse päivämäärä',
            }),
            React.createElement(DateTimePicker, {
              value: selectedDate,
              mode: 'date',
              locale: 'fi-FI',
              display: Platform.OS === 'ios' ? 'inline' : 'calendar',
              themeVariant: 'light',
              onChange: async (_, date) => {
                if (!date) {
                  return;
                }
                setSelectedDate(date);
                await applyDateFilter(date);
                if (Platform.OS !== 'ios') {
                  setIsDatePickerVisible(false);
                }
              },
            }),
            React.createElement(
              View,
              { style: styles.modalPickerActions },
              React.createElement(Button, {
                mode: 'text',
                onPress: () => setIsDatePickerVisible(false),
                children: 'Sulje',
              })
            )
          )
        )
      ),
      React.createElement(
        Modal,
        {
          visible: isSortPickerVisible,
          transparent: true,
          animationType: 'fade',
          onRequestClose: () => setIsSortPickerVisible(false),
        },
        React.createElement(
          Pressable,
          {
            style: styles.modalBackdrop,
            onPress: () => setIsSortPickerVisible(false),
          },
          React.createElement(
            Pressable,
            {
              style: styles.modalPickerCard,
              onPress: () => undefined,
            },
            React.createElement(Text, {
              style: styles.modalPickerTitle,
              children: 'Lajittelu',
            }),
            React.createElement(Button, {
              mode: sortMode === 'time' ? 'contained' : 'outlined',
              onPress: () => {
                applySort('time');
                setIsSortPickerVisible(false);
              },
              children: 'Aika',
            }),
            React.createElement(Button, {
              mode: sortMode === 'alphabet' ? 'contained' : 'outlined',
              onPress: () => {
                applySort('alphabet');
                setIsSortPickerVisible(false);
              },
              children: 'Aakkoset',
            }),
            React.createElement(
              View,
              { style: styles.modalPickerActions },
              React.createElement(Button, {
                mode: 'text',
                onPress: () => setIsSortPickerVisible(false),
                children: 'Sulje',
              })
            )
          )
        )
      ),
      React.createElement(Portal, {
        children: React.createElement(
          Dialog,
          {
            visible: !!selectedSection,
            onDismiss: () => setSelectedSection(null),
            style: styles.dialog,
            children: React.createElement(
              View,
              { style: styles.modalCard },
              React.createElement(
                View,
                { style: styles.modalTopRow },
                React.createElement(Text, {
                  style: styles.modalHall,
                  children: selectedSection?.name ?? 'Nimeton kentta',
                }),
                React.createElement(Text, {
                  style: styles.modalTime,
                  children: selectedSection?.isBooked ? 'Varattu' : 'Vapaa',
                })
              ),
              React.createElement(Text, {
                style: styles.modalSubLine,
                children: `Laji: ${selectedSection?.sport ?? 'Ei tiedossa'}`,
              }),
              React.createElement(
                View,
                { style: styles.mapPlaceholder },
                React.createElement(Text, {
                  style: styles.mapPin,
                  children: 'PIN',
                })
              ),
              React.createElement(Text, {
                style: styles.modalSubLine,
                children: `Kuvaus: ${selectedSection?.description ?? 'Ei kuvausta'}`,
              }),
              React.createElement(Text, {
                style: styles.modalSubLine,
                children: `Facility ID: ${selectedSection?.facilityId ?? '-'}`,
              }),
              React.createElement(Button, {
                mode: 'contained',
                style: styles.reserveButton,
                contentStyle: styles.reserveButtonContent,
                labelStyle: styles.reserveButtonLabel,
                onPress: () => setSelectedSection(null),
                children: 'Varaa vuoro',
              })
            ),
          }
        ),
      })
    )
  );
}

const createStyles = (metrics: ReturnType<typeof getResponsiveMetrics>) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#ececec',
    },
    screen: {
      flex: 1,
      backgroundColor: '#ececec',
      paddingHorizontal: metrics.horizontalPadding,
      paddingTop: metrics.scale(16, 12, 24),
      paddingBottom: metrics.scale(20, 16, 28),
      alignItems: 'center',
    },
    topArea: {
      marginBottom: metrics.scale(12, 10, 18),
      width: '100%',
      maxWidth: metrics.contentMaxWidth,
      backgroundColor: '#f7f9fc',
      borderRadius: metrics.scale(22, 16, 28),
      paddingHorizontal: metrics.scale(14, 10, 20),
      paddingTop: metrics.scale(10, 8, 14),
      paddingBottom: metrics.scale(14, 10, 20),
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      width: metrics.scale(34, 32, 42),
      height: metrics.scale(34, 32, 42),
      borderRadius: metrics.scale(17, 16, 21),
      backgroundColor: '#e8e8e8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    backIcon: {
      fontSize: metrics.scale(22, 18, 28),
      lineHeight: metrics.scale(22, 18, 28),
      color: '#616161',
      marginTop: -1,
    },
    headerSpacer: {
      width: metrics.scale(34, 32, 42),
      height: metrics.scale(34, 32, 42),
    },
    logo: {
      width: metrics.scale(120, 92, 140),
      height: metrics.scale(98, 74, 120),
      alignSelf: 'center',
      marginTop: metrics.scale(4, 2, 10),
    },
    title: {
      alignSelf: 'center',
      marginTop: 2,
      fontSize: metrics.scale(20, 17, 24),
      fontWeight: '700',
    },
    filtersRow: {
      marginTop: metrics.scale(18, 12, 24),
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      alignItems: 'center',
      gap: metrics.scale(8, 6, 12),
    },
    filterChip: {
      minWidth: metrics.scale(86, 72, 120),
      justifyContent: 'center',
      backgroundColor: '#e6e6e6',
    },
    filterChipText: {
      fontSize: metrics.scale(14, 12, 18),
      fontWeight: '600',
      color: '#616161',
    },
    textInput: {
      marginTop: metrics.scale(10, 8, 14),
      backgroundColor: '#ffffff',
    },
    statusRow: {
      marginTop: metrics.scale(10, 8, 14),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statusText: {
      color: '#475569',
      fontSize: metrics.scale(14, 12, 18),
      fontWeight: '600',
    },
    searchButton: {
      marginTop: metrics.scale(12, 10, 16),
      borderRadius: metrics.scale(12, 10, 16),
    },
    searchButtonContent: {
      height: metrics.scale(40, 36, 48),
    },
    searchButtonLabel: {
      fontSize: metrics.scale(16, 14, 20),
      fontWeight: '700',
    },
    listSurface: {
      flex: 1,
      width: '100%',
      maxWidth: metrics.contentMaxWidth,
      backgroundColor: '#f7f9fc',
      borderRadius: metrics.scale(22, 16, 28),
      paddingHorizontal: metrics.scale(12, 8, 18),
    },
    listContent: {
      paddingBottom: metrics.scale(12, 8, 20),
    },
    loading: {
      marginVertical: metrics.scale(14, 10, 18),
    },
    errorText: {
      color: '#b91c1c',
      fontSize: metrics.scale(13, 11, 16),
      fontWeight: '500',
      marginTop: metrics.scale(8, 6, 10),
    },
    emptyText: {
      color: '#475569',
      fontSize: metrics.scale(14, 12, 17),
      marginTop: metrics.scale(12, 8, 18),
      textAlign: 'center',
    },
    slotRow: {
      minHeight: metrics.scale(66, 52, 78),
      borderBottomWidth: 1,
      borderBottomColor: '#d5d5d5',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingRight: metrics.scale(6, 4, 10),
    },
    slotTextWrap: {
      paddingVertical: metrics.scale(8, 6, 12),
      flexShrink: 1,
      paddingRight: 10,
    },
    slotTitle: {
      fontSize: metrics.scale(19, 15, 24),
      fontWeight: '500',
    },
    slotTime: {
      fontSize: metrics.scale(17, 14, 22),
      marginTop: 2,
    },
    chevron: {
      fontSize: metrics.scale(20, 16, 26),
      color: '#c8c8c8',
      marginLeft: 8,
    },
    dialog: {
      backgroundColor: 'transparent',
      alignSelf: 'center',
      width: '90%',
      maxWidth: metrics.isTablet ? 520 : 380,
      borderRadius: metrics.scale(18, 14, 24),
      elevation: 0,
      marginTop: 0,
    },
    modalCard: {
      width: '100%',
      backgroundColor: '#9a9a9a',
      borderRadius: metrics.scale(18, 14, 24),
      paddingHorizontal: metrics.scale(18, 14, 26),
      paddingVertical: metrics.scale(14, 12, 22),
    },
    modalTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
    },
    modalHall: {
      color: '#ffffff',
      fontSize: metrics.scale(14, 12, 18),
      fontWeight: '700',
      maxWidth: '65%',
    },
    modalTime: {
      color: '#ffffff',
      fontSize: metrics.scale(14, 12, 18),
      fontWeight: '700',
    },
    modalSubLine: {
      color: '#ffffff',
      fontSize: metrics.scale(13, 11, 16),
      fontWeight: '700',
      marginTop: 2,
    },
    mapPlaceholder: {
      marginTop: metrics.scale(10, 8, 14),
      marginBottom: metrics.scale(12, 10, 18),
      height: metrics.scale(76, 60, 110),
      borderRadius: 2,
      backgroundColor: '#d9d9d9',
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingLeft: metrics.scale(24, 18, 30),
    },
    mapPin: {
      fontSize: metrics.scale(18, 14, 22),
      color: '#475569',
      fontWeight: '700',
    },
    reserveButton: {
      marginTop: metrics.scale(18, 12, 24),
      borderRadius: metrics.scale(26, 20, 34),
    },
    reserveButtonContent: {
      height: metrics.scale(52, 44, 60),
    },
    reserveButtonLabel: {
      fontSize: metrics.scale(20, 16, 24),
      fontWeight: '700',
    },
  });
