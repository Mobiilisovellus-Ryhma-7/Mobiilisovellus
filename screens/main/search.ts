import React from 'react';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
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
  onGoHome?: () => void;
  initialSearchMode?: SearchMode;
  initialSport?: string;
  initialBooked?: boolean;
};

type SearchMode = 'all' | 'sport' | 'name' | 'status';

type SportOption = {
  label: string;
  value: string;
};



function formatDateAsDbDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function matchesDateFilter(section: FacilitySection, dateFilter: string | null): boolean {
  if (!dateFilter) {
    return true;
  }

  if (!section.createdAt) {
    return false;
  }

  const parsedDate = new Date(section.createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  return formatDateAsDbDate(parsedDate) === dateFilter;
}

export default function Search({
  onBack,
  onGoHome,
  initialSearchMode,
  initialSport,
  initialBooked,
}: SearchProps) {
  const { colors, dark } = useTheme();
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const styles = React.useMemo(() => createStyles(metrics, colors), [colors, metrics]);

  const [selectedSection, setSelectedSection] = React.useState<FacilitySection | null>(null);
  const [sections, setSections] = React.useState<FacilitySection[]>([]);
  const [searchMode, setSearchMode] = React.useState<SearchMode>(initialSearchMode ?? 'all');
  const [sportInput, setSportInput] = React.useState(initialSport ?? '');
  const [nameInput, setNameInput] = React.useState('');
  const [sportOptions, setSportOptions] = React.useState<SportOption[]>([]);
  const [isSportPickerOpen, setIsSportPickerOpen] = React.useState(false);
  const [bookedOnly, setBookedOnly] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [activeDateFilter, setActiveDateFilter] = React.useState<string | null>(null);
  const hasBootstrappedList = React.useRef(false);
  const hasAppliedInitialFilters = React.useRef(false);

  const runSearch = React.useCallback(
    async (modeOverride?: SearchMode, sportOverride?: string, bookedOverride?: boolean) => {
      const mode = modeOverride ?? searchMode;
      setErrorMessage(null);
      setIsLoading(true);

      try {
        let nextSections: FacilitySection[] = [];

        if (mode === 'sport') {
          const value = (sportOverride ?? sportInput).trim();
          if (!value) {
            throw new Error('Syota laji ennen hakua.');
          }
          nextSections = (await searchFacilitySectionsBySport(value)).filter(
            (section) => section.isBooked !== true
          );
        } else if (mode === 'name') {
          const value = nameInput.trim();
          if (!value) {
            throw new Error('Syota kentan nimi ennen hakua.');
          }
          nextSections = await searchFacilitySectionsByName(value);
        } else if (mode === 'status') {
          const bookedValue = bookedOverride ?? bookedOnly;
          const activeSport = sportInput.trim();

          if (activeSport) {
            nextSections = (await searchFacilitySectionsBySport(activeSport)).filter(
              (section) => section.isBooked === bookedValue
            );
          } else {
            nextSections = await searchFacilitySectionsByBookingStatus(bookedValue);
          }
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
    let isActive = true;

    listFacilitySections()
      .then((allSections) => {
        if (!isActive) {
          return;
        }

        const uniqueSports = Array.from(
          new Set(
            allSections
              .map((section) => section.sport?.trim())
              .filter((value): value is string => !!value)
          )
        ).sort((left, right) => left.localeCompare(right, 'fi'));

        setSportOptions(uniqueSports.map((value) => ({ label: value, value })));
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setSportOptions([]);
      });

    return () => {
      isActive = false;
    };
  }, []);

  React.useEffect(() => {
    if (hasBootstrappedList.current) {
      return;
    }

    hasBootstrappedList.current = true;

    if (initialSearchMode === 'sport' && initialSport) {
      return;
    }

    if (initialSearchMode === 'status' && typeof initialBooked === 'boolean') {
      return;
    }

    runSearch('all');
  }, [initialBooked, initialSearchMode, initialSport, runSearch]);

  React.useEffect(() => {
    if (hasAppliedInitialFilters.current) {
      return;
    }

    hasAppliedInitialFilters.current = true;

    if (initialSearchMode === 'sport' && initialSport) {
      setSearchMode('sport');
      setSportInput(initialSport);
      runSearch('sport', initialSport);
    }

    if (initialSearchMode === 'status' && typeof initialBooked === 'boolean') {
      setSearchMode('status');
      setBookedOnly(initialBooked);
      runSearch('status', undefined, initialBooked);
    }
  }, [initialBooked, initialSearchMode, initialSport, runSearch]);

  const openMode = (mode: SearchMode) => {
    setSearchMode(mode);
    setErrorMessage(null);
  };

  const openSportPicker = React.useCallback(() => {
    setSearchMode('sport');
    setErrorMessage(null);
    setIsSportPickerOpen(true);
  }, []);

  const selectSport = React.useCallback(
    async (value: string) => {
      setSportInput(value);
      setSearchMode('sport');
      setErrorMessage(null);
      setActiveDateFilter(null);
      setIsSportPickerOpen(false);
      await runSearch('sport', value);
    },
    [runSearch]
  );

  const toggleBookingStatus = React.useCallback(async () => {
    const nextBookedValue = !bookedOnly;
    setBookedOnly(nextBookedValue);
    setSearchMode('status');
    setActiveDateFilter(null);
    await runSearch('status', undefined, nextBookedValue);
  }, [bookedOnly, runSearch]);

  const applyDateFilter = React.useCallback((date: Date) => {
    setActiveDateFilter(formatDateAsDbDate(date));
  }, []);

  const filteredSections = React.useMemo(
    () => sections.filter((section) => matchesDateFilter(section, activeDateFilter)),
    [activeDateFilter, sections]
  );

  const slotRows = filteredSections.map((section) =>
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
        React.createElement(
          Pressable,
          { onPress: onGoHome },
          React.createElement(Image, {
            source: require('../../assets/dynamic-sport-hall-logo.png'),
            style: styles.logo,
            resizeMode: 'contain',
          })
        ),
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
            showSelectedCheck: false,
            style: styles.filterChip,
            textStyle: styles.filterChipText,
            selected: searchMode === 'sport',
            onPress: openSportPicker,
            children: 'Laji',
          }),
          React.createElement(Chip, {
            mode: 'flat',
            compact: true,
            showSelectedCheck: false,
            style: styles.filterChip,
            textStyle: styles.filterChipText,
            onPress: () => setIsDatePickerVisible(true),
            children: activeDateFilter
              ? `${`${selectedDate.getDate()}`.padStart(2, '0')}.${`${selectedDate.getMonth() + 1}`.padStart(2, '0')}.${selectedDate.getFullYear()}`
              : 'Pvm',
          }),
          React.createElement(Chip, {
            mode: 'flat',
            compact: true,
            showSelectedCheck: false,
            style: styles.filterChip,
            textStyle: styles.filterChipText,
            selected: searchMode === 'status',
            onPress: toggleBookingStatus,
            children: bookedOnly ? 'Vapaat' : 'Varatut',
          })
        ),
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
            !isLoading && filteredSections.length === 0
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
          visible: isSportPickerOpen,
          transparent: true,
          animationType: 'fade',
          onRequestClose: () => setIsSportPickerOpen(false),
        },
        React.createElement(
          View,
          { style: styles.modalBackdrop },
          React.createElement(Pressable, {
            style: styles.modalDismissLayer,
            onPress: () => setIsSportPickerOpen(false),
          }),
          React.createElement(
            View,
            { style: styles.modalPickerCard },
            React.createElement(Text, {
              style: styles.modalPickerTitle,
              children: 'Valitse laji',
            }),
            React.createElement(
              ScrollView,
              {
                style: styles.sportPickerList,
                contentContainerStyle: styles.sportPickerListContent,
              },
              sportOptions.length > 0
                ? sportOptions.map((option) =>
                    React.createElement(
                      Pressable,
                      {
                        key: option.value,
                        style: [
                          styles.sportOption,
                          sportInput === option.value ? styles.sportOptionActive : null,
                        ],
                        onPress: () => selectSport(option.value),
                      },
                      React.createElement(Text, {
                        style: [
                          styles.sportOptionText,
                          sportInput === option.value ? styles.sportOptionTextActive : null,
                        ],
                        children: option.label,
                      })
                    )
                  )
                : React.createElement(Text, {
                    style: styles.emptySportText,
                    children: 'Lajeja ei löytynyt vielä tietokannasta.',
                  })
            ),
            React.createElement(
              View,
              { style: styles.modalPickerActions },
              React.createElement(Button, {
                mode: 'text',
                onPress: () => setIsSportPickerOpen(false),
                children: 'Sulje',
              })
            )
          )
        )
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
              themeVariant: dark ? 'dark' : 'light',
              onChange: (event: DateTimePickerEvent, date?: Date) => {
                if (!date || event.type === 'dismissed') {
                  if (Platform.OS !== 'ios') {
                    setIsDatePickerVisible(false);
                  }
                  return;
                }
                setSelectedDate(date);
                applyDateFilter(date);
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

const createStyles = (
  metrics: ReturnType<typeof getResponsiveMetrics>,
  colors: any
) =>
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
      backgroundColor: colors.surface,
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
      backgroundColor: colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backIcon: {
      fontSize: metrics.scale(22, 18, 28),
      lineHeight: metrics.scale(22, 18, 28),
      color: colors.onSurface,
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
      flexWrap: 'nowrap',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      gap: metrics.scale(8, 6, 12),
    },
    filterChip: {
      minWidth: metrics.scale(86, 72, 120),
      justifyContent: 'center',
      backgroundColor: colors.surfaceVariant,
    },
    filterChipText: {
      fontSize: metrics.scale(14, 12, 18),
      fontWeight: '600',
      color: colors.onSurface,
    },
    textInput: {
      marginTop: metrics.scale(10, 8, 14),
      backgroundColor: colors.surface,
    },
    sportPickerButton: {
      marginTop: metrics.scale(10, 8, 14),
      minHeight: metrics.scale(56, 48, 64),
      borderRadius: metrics.scale(14, 12, 18),
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#cfd8e3',
      justifyContent: 'center',
      paddingHorizontal: metrics.scale(14, 12, 18),
      gap: 4,
    },
    sportPickerLabel: {
      color: '#0f172a',
      fontSize: metrics.scale(16, 14, 20),
      fontWeight: '700',
    },
    sportPickerHint: {
      color: '#64748b',
      fontSize: metrics.scale(12, 11, 14),
      fontWeight: '500',
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
    dateButton: {
      marginTop: 0,
      alignSelf: 'auto',
      borderRadius: metrics.scale(10, 8, 14),
    },
    listSurface: {
      flex: 1,
      width: '100%',
      maxWidth: metrics.contentMaxWidth,
      backgroundColor: colors.surface,
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
      color: colors.onSurfaceVariant,
      fontSize: metrics.scale(14, 12, 17),
      marginTop: metrics.scale(12, 8, 18),
      textAlign: 'center',
    },
    slotRow: {
      minHeight: metrics.scale(66, 52, 78),
      borderBottomWidth: 1,
      borderBottomColor: colors.outline,
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
      color: colors.outline,
      marginLeft: 8,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: metrics.horizontalPadding,
    },
    modalDismissLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    modalPickerCard: {
      width: '100%',
      maxWidth: metrics.isTablet ? 460 : 360,
      backgroundColor: colors.surface,
      borderRadius: metrics.scale(24, 18, 30),
      padding: metrics.scale(16, 12, 20),
      gap: metrics.scale(12, 10, 16),
    },
    modalPickerTitle: {
      color: colors.onSurface,
      fontSize: metrics.scale(18, 16, 22),
      fontWeight: '700',
    },
    modalPickerActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    sportPickerList: {
      maxHeight: metrics.scale(340, 280, 420),
    },
    sportPickerListContent: {
      gap: metrics.scale(8, 6, 10),
      paddingBottom: metrics.scale(4, 2, 8),
    },
    sportOption: {
      paddingHorizontal: metrics.scale(14, 12, 18),
      paddingVertical: metrics.scale(12, 10, 16),
      borderRadius: metrics.scale(14, 12, 18),
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.outline,
    },
    sportOptionActive: {
      backgroundColor: '#dbeafe',
      borderColor: '#60a5fa',
    },
    sportOptionText: {
      color: colors.onSurface,
      fontSize: metrics.scale(15, 13, 18),
      fontWeight: '600',
    },
    sportOptionTextActive: {
      color: '#1d4ed8',
      fontWeight: '700',
    },
    emptySportText: {
      color: colors.onSurfaceVariant,
      fontSize: metrics.scale(14, 12, 16),
      fontWeight: '500',
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
      backgroundColor: colors.surface,
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
      color: colors.onSurface,
      fontSize: metrics.scale(14, 12, 18),
      fontWeight: '700',
      maxWidth: '65%',
    },
    modalTime: {
      color: colors.onSurface,
      fontSize: metrics.scale(14, 12, 18),
      fontWeight: '700',
    },
    modalSubLine: {
      color: colors.onSurface,
      fontSize: metrics.scale(13, 11, 16),
      fontWeight: '700',
      marginTop: 2,
    },
    mapPlaceholder: {
      marginTop: metrics.scale(10, 8, 14),
      marginBottom: metrics.scale(12, 10, 18),
      height: metrics.scale(76, 60, 110),
      borderRadius: 2,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingLeft: metrics.scale(24, 18, 30),
    },
    mapPin: {
      fontSize: metrics.scale(18, 14, 22),
      color: colors.onSurfaceVariant,
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
