import React from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Image,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { ActivityIndicator, Button, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { getResponsiveMetrics } from '../shared/responsive';
import Screen from '../shared/Screen';
import {
  listFacilitySections,
  searchFacilitySectionsByBookingStatus,
  searchFacilitySectionsByName,
  searchFacilitySectionsBySport,
} from '../../services/firebase';

type SelectProps = {
  onBack?: () => void;
  onSearch?: (params?: { mode?: SearchMode; sport?: string; booked?: boolean }) => void;
};

type SearchMode = 'all' | 'sport' | 'name' | 'status';

type SportOption = {
  label: string;
  value: string;
};

const SEARCH_MODES: SearchMode[] = ['all', 'sport', 'name', 'status'];

const MODE_LABELS: Record<SearchMode, string> = {
  all: 'Kaikki',
  sport: 'Laji',
  name: 'Nimi',
  status: 'Varaustila',
};

export default function Select({ onBack, onSearch }: SelectProps) {
  const { colors, dark } = useTheme();
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [isSportPickerOpen, setIsSportPickerOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const styles = React.useMemo(() => createStyles(metrics, colors), [colors, metrics]);
  const [searchMode, setSearchMode] = React.useState<SearchMode>('all');
  const [sport, setSport] = React.useState('');
  const [sportOptions, setSportOptions] = React.useState<SportOption[]>([]);
  const [name, setName] = React.useState('');
  const [bookedOnly, setBookedOnly] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [resultCount, setResultCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    let isActive = true;

    listFacilitySections()
      .then((sections) => {
        if (!isActive) {
          return;
        }

        const uniqueSports = Array.from(
          new Set(
            sections
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

  const handleSearch = React.useCallback(async (modeOverride?: SearchMode, sportOverride?: string) => {
    const mode = modeOverride ?? searchMode;
    setErrorMessage(null);
    setResultCount(null);
    setIsLoading(true);

    try {
      let sections;

      if (mode === 'sport') {
        const sportValue = (sportOverride ?? sport).trim();
        if (!sportValue) {
          throw new Error('Valitse laji ennen hakua.');
        }
        sections = (await searchFacilitySectionsBySport(sportValue)).filter(
          (section) => section.isBooked !== true
        );
        setResultCount(sections.length);
        onSearch?.({ mode, sport: sportValue });
      } else if (mode === 'name') {
        const nameValue = name.trim();
        if (!nameValue) {
          throw new Error('Syötä kentän nimi ennen hakua.');
        }
        sections = await searchFacilitySectionsByName(nameValue);
        setResultCount(sections.length);
        onSearch?.({ mode });
      } else if (mode === 'status') {
        sections = await searchFacilitySectionsByBookingStatus(bookedOnly);
        setResultCount(sections.length);
        onSearch?.({ mode, booked: bookedOnly });
      } else {
        sections = await listFacilitySections();
        setResultCount(sections.length);
        onSearch?.({ mode });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Haku epäonnistui. Yritä uudelleen.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [bookedOnly, name, onSearch, searchMode, sport]);

  const openSportPicker = React.useCallback(() => {
    setSearchMode('sport');
    setErrorMessage(null);
    setIsSportPickerOpen(true);
  }, []);

  const selectSport = React.useCallback(
    (value: string) => {
      setSport(value);
      setSearchMode('sport');
      setErrorMessage(null);
      setIsSportPickerOpen(false);
    },
    []
  );

  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString('fi-FI', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'Valitse päivämäärä';

  return React.createElement(
    Screen,
    { style: [styles.safeArea, { backgroundColor: colors.background }] },
    React.createElement(
      View,
      { style: [styles.screen, { backgroundColor: colors.background }] },
      React.createElement(
        View,
        { style: styles.headerRow },
        React.createElement(
          Pressable,
          { style: styles.backButton, onPress: onBack },
          React.createElement(Text, { style: styles.backIcon, children: '‹' })
        ),
        React.createElement(Text, {
          style: [styles.title, { color: colors.onSurface }],
          variant: 'titleMedium',
          children: 'HALLILLE',
        }),
        React.createElement(View, { style: styles.headerSpacer })
      ),
      React.createElement(Image, {
        source: require('../../assets/dynamic-sport-hall-logo.png'),
        style: styles.logo,
        resizeMode: 'contain',
      }),
      React.createElement(
        View,
        { style: styles.formArea },
        React.createElement(
          View,
          { style: styles.modeRow },
          ...SEARCH_MODES.map((mode) =>
            React.createElement(
              Pressable,
              {
                key: mode,
                style: [
                  styles.modeButton,
                  searchMode === mode ? styles.modeButtonActive : null,
                ],
                  onPress: mode === 'sport' ? openSportPicker : () => setSearchMode(mode),
              },
              React.createElement(Text, {
                style: [
                  styles.modeButtonText,
                  searchMode === mode ? styles.modeButtonTextActive : null,
                ],
                children: MODE_LABELS[mode],
              })
            )
          )
        ),
        searchMode === 'sport'
          ? React.createElement(
              Pressable,
              {
                style: styles.sportPickerButton,
                onPress: openSportPicker,
              },
              React.createElement(Text, {
                style: styles.sportPickerLabel,
                children: sport || 'Valitse laji listasta',
              }),
              React.createElement(Text, {
                style: styles.sportPickerHint,
                children: 'Avaa laji-valikko',
              })
            )
          : null,
        searchMode === 'name'
          ? React.createElement(TextInput, {
              mode: 'outlined',
              label: 'Kentän nimi',
              value: name,
              onChangeText: setName,
              style: styles.textInput,
            })
          : null,
        searchMode === 'status'
          ? React.createElement(
              View,
              { style: styles.statusRow },
              React.createElement(Text, {
                style: styles.statusLabel,
                children: 'Näytä vain varatut kentät',
              }),
              React.createElement(Switch, {
                value: bookedOnly,
                onValueChange: setBookedOnly,
              })
            )
          : null,
        errorMessage
          ? React.createElement(Text, {
              style: styles.errorText,
              children: errorMessage,
            })
          : null,
        resultCount !== null
          ? React.createElement(Text, {
              style: styles.resultText,
              children: `Löydetyt kentät: ${resultCount}`,
            })
          : null
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
          Pressable,
          {
            style: styles.modalBackdrop,
            onPress: () => setIsSportPickerOpen(false),
          },
          React.createElement(
            Pressable,
            {
              style: styles.sportPickerCard,
              onPress: () => undefined,
            },
            React.createElement(Text, {
              style: styles.modalTitle,
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
                          sport === option.value ? styles.sportOptionActive : null,
                        ],
                        onPress: () => selectSport(option.value),
                      },
                      React.createElement(Text, {
                        style: [
                          styles.sportOptionText,
                          sport === option.value ? styles.sportOptionTextActive : null,
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
              { style: styles.modalActions },
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
          visible: isCalendarOpen,
          transparent: true,
          animationType: 'fade',
          onRequestClose: () => setIsCalendarOpen(false),
        },
        React.createElement(
          View,
          { style: styles.modalBackdrop },
          React.createElement(Pressable, {
            style: styles.modalDismissLayer,
            onPress: () => setIsCalendarOpen(false),
          }),
          React.createElement(
            View,
            { style: styles.modalCard },
            React.createElement(Text, {
              style: styles.modalTitle,
              children: 'Valitse päivämäärä',
            }),
            React.createElement(DateTimePicker, {
              value: selectedDate ?? new Date(),
              mode: 'date',
              locale: 'fi-FI',
              display: Platform.OS === 'ios' ? 'inline' : 'calendar',
              themeVariant: dark ? 'dark' : 'light',
              onChange: (_, date) => {
                if (date) {
                  setSelectedDate(date);
                }
              },
            }),
            React.createElement(
              View,
              { style: styles.modalActions },
              React.createElement(Button, {
                mode: 'text',
                onPress: () => setIsCalendarOpen(false),
                children: 'Sulje',
              })
            )
          )
        )
      ),
      React.createElement(
        View,
        { style: styles.bottomArea },
        isLoading
          ? React.createElement(ActivityIndicator, {
              size: 'small',
              style: styles.loader,
            })
          : null,
        React.createElement(Button, {
          mode: 'contained',
          onPress: () => handleSearch(),
          style: styles.searchButton,
          contentStyle: styles.searchButtonContent,
          labelStyle: styles.searchButtonText,
          disabled: isLoading,
          children: 'Hae',
        })
      )
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
      paddingTop: metrics.scale(20, 14, 28),
      paddingBottom: metrics.scale(28, 20, 34),
      alignItems: 'center',
    },
    headerRow: {
      width: '100%',
      maxWidth: metrics.contentMaxWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: metrics.scale(18, 14, 24),
      paddingHorizontal: metrics.scale(14, 10, 18),
      paddingVertical: metrics.scale(10, 8, 14),
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
      fontSize: metrics.scale(26, 20, 28),
      lineHeight: metrics.scale(26, 20, 28),
      color: colors.onSurface,
      marginTop: -2,
    },
    title: {
      fontSize: metrics.scale(20, 17, 24),
      fontWeight: '700',
      color: colors.onSurface,
      letterSpacing: 0.4,
    },
    headerSpacer: {
      width: metrics.scale(34, 32, 42),
      height: metrics.scale(34, 32, 42),
    },
    formArea: {
      width: '100%',
      maxWidth: metrics.contentMaxWidth,
      marginTop: metrics.scale(14, 10, 22),
      gap: metrics.scale(20, 14, 28),
      paddingHorizontal: metrics.scale(16, 10, 24),
      paddingVertical: metrics.scale(20, 14, 28),
      backgroundColor: colors.surface,
      borderRadius: metrics.scale(24, 18, 30),
    },
    logo: {
      width: metrics.scale(120, 92, 140),
      height: metrics.scale(98, 74, 120),
      alignSelf: 'center',
      marginTop: metrics.scale(8, 4, 12),
    },
    modeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: metrics.scale(8, 6, 10),
    },
    modeButton: {
      paddingHorizontal: metrics.scale(12, 10, 16),
      paddingVertical: metrics.scale(8, 6, 12),
      borderRadius: metrics.scale(12, 10, 14),
      borderWidth: 1,
      borderColor: colors.outline,
      backgroundColor: colors.surface,
    },
    modeButtonActive: {
      backgroundColor: '#dbeafe',
      borderColor: '#60a5fa',
    },
    modeButtonText: {
      fontSize: metrics.scale(14, 12, 18),
      color: colors.onSurface,
      fontWeight: '500',
    },
    modeButtonTextActive: {
      color: '#1d4ed8',
      fontWeight: '700',
    },
    textInput: {
      backgroundColor: colors.surface,
    },
    sportPickerButton: {
      minHeight: metrics.scale(56, 48, 64),
      borderRadius: metrics.scale(14, 12, 18),
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.outline,
      justifyContent: 'center',
      paddingHorizontal: metrics.scale(14, 12, 18),
      gap: 4,
    },
    sportPickerLabel: {
      color: colors.onSurface,
      fontSize: metrics.scale(16, 14, 20),
      fontWeight: '700',
    },
    sportPickerHint: {
      color: colors.onSurfaceVariant,
      fontSize: metrics.scale(12, 11, 14),
      fontWeight: '500',
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statusLabel: {
      fontSize: metrics.scale(15, 13, 18),
      color: colors.onSurface,
      fontWeight: '500',
      flexShrink: 1,
      paddingRight: 10,
    },
    errorText: {
      color: '#b91c1c',
      fontSize: metrics.scale(13, 11, 15),
      fontWeight: '500',
    },
    resultText: {
      color: '#0f766e',
      fontSize: metrics.scale(14, 12, 16),
      fontWeight: '600',
    },
    selectedValue: {
      color: '#000000',
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: metrics.horizontalPadding,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
    modalDismissLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: metrics.scale(24, 18, 30),
      padding: metrics.scale(16, 12, 20),
      gap: metrics.scale(12, 10, 16),
    },
    modalTitle: {
      color: colors.onSurface,
      fontSize: metrics.scale(18, 16, 22),
      fontWeight: '700',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    sportPickerCard: {
      width: '100%',
      maxWidth: metrics.isTablet ? 460 : 380,
      backgroundColor: colors.surface,
      borderRadius: metrics.scale(24, 18, 30),
      padding: metrics.scale(16, 12, 20),
      gap: metrics.scale(12, 10, 16),
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
    bottomArea: {
      marginTop: 'auto',
      alignItems: 'center',
      width: '100%',
      maxWidth: metrics.contentMaxWidth,
    },
    loader: {
      marginBottom: metrics.scale(10, 8, 14),
    },
    searchButton: {
      width: '100%',
      borderRadius: metrics.scale(16, 12, 22),
    },
    searchButtonContent: {
      height: metrics.scale(56, 48, 64),
    },
    searchButtonText: {
      fontSize: metrics.scale(20, 16, 24),
      fontWeight: '500',
      color: '#ffffff',
    },
  });
