import React from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Platform,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { ActivityIndicator, Button, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { getResponsiveMetrics } from '../shared/responsive';
import {
  listFacilitySections,
  searchFacilitySectionsByBookingStatus,
  searchFacilitySectionsByName,
  searchFacilitySectionsBySport,
} from '../../services/firebase';

type SelectProps = {
  onBack?: () => void;
  onSearch?: () => void;
};

type SearchMode = 'all' | 'sport' | 'name' | 'status';

const SEARCH_MODES: SearchMode[] = ['all', 'sport', 'name', 'status'];

const MODE_LABELS: Record<SearchMode, string> = {
  all: 'Kaikki',
  sport: 'Laji',
  name: 'Nimi',
  status: 'Varaustila',
};

export default function Select({ onBack, onSearch }: SelectProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const styles = React.useMemo(() => createStyles(metrics), [metrics]);
  const [searchMode, setSearchMode] = React.useState<SearchMode>('all');
  const [sport, setSport] = React.useState('');
  const [name, setName] = React.useState('');
  const [bookedOnly, setBookedOnly] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [resultCount, setResultCount] = React.useState<number | null>(null);

  const handleSearch = React.useCallback(async () => {
    setErrorMessage(null);
    setResultCount(null);
    setIsLoading(true);

    try {
      let sections;

      if (searchMode === 'sport') {
        const sportValue = sport.trim();
        if (!sportValue) {
          throw new Error('Syötä laji ennen hakua.');
        }
        sections = await searchFacilitySectionsBySport(sportValue);
      } else if (searchMode === 'name') {
        const nameValue = name.trim();
        if (!nameValue) {
          throw new Error('Syötä kentän nimi ennen hakua.');
        }
        sections = await searchFacilitySectionsByName(nameValue);
      } else if (searchMode === 'status') {
        sections = await searchFacilitySectionsByBookingStatus(bookedOnly);
      } else {
        sections = await listFacilitySections();
      }

      setResultCount(sections.length);
      onSearch?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Haku epäonnistui. Yritä uudelleen.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [bookedOnly, name, onSearch, searchMode, sport]);

  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString('fi-FI', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'Valitse päivämäärä';

  return React.createElement(
    SafeAreaView,
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
                onPress: () => setSearchMode(mode),
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
          ? React.createElement(TextInput, {
              mode: 'outlined',
              label: 'Laji',
              value: sport,
              onChangeText: setSport,
              style: styles.textInput,
            })
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
              themeVariant: 'light',
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
          onPress: handleSearch,
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
      backgroundColor: '#f7f9fc',
      borderRadius: metrics.scale(18, 14, 24),
      paddingHorizontal: metrics.scale(14, 10, 18),
      paddingVertical: metrics.scale(10, 8, 14),
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
      fontSize: metrics.scale(26, 20, 28),
      lineHeight: metrics.scale(26, 20, 28),
      color: '#616161',
      marginTop: -2,
    },
    title: {
      fontSize: metrics.scale(20, 17, 24),
      fontWeight: '700',
      color: '#0f172a',
      letterSpacing: 0.4,
    },
    headerSpacer: {
      width: metrics.scale(34, 32, 42),
      height: metrics.scale(34, 32, 42),
    },
    formArea: {
      width: '100%',
      maxWidth: metrics.contentMaxWidth,
      marginTop: metrics.scale(26, 18, 36),
      gap: metrics.scale(20, 14, 28),
      paddingHorizontal: metrics.scale(16, 10, 24),
      paddingVertical: metrics.scale(20, 14, 28),
      backgroundColor: '#f7f9fc',
      borderRadius: metrics.scale(24, 18, 30),
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
      borderColor: '#cfd8e3',
      backgroundColor: '#ffffff',
    },
    modeButtonActive: {
      backgroundColor: '#dbeafe',
      borderColor: '#60a5fa',
    },
    modeButtonText: {
      fontSize: metrics.scale(14, 12, 18),
      color: '#334155',
      fontWeight: '500',
    },
    modeButtonTextActive: {
      color: '#1d4ed8',
      fontWeight: '700',
    },
    textInput: {
      backgroundColor: '#ffffff',
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statusLabel: {
      fontSize: metrics.scale(15, 13, 18),
      color: '#334155',
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
      backgroundColor: '#f7f9fc',
      borderRadius: metrics.scale(24, 18, 30),
      padding: metrics.scale(16, 12, 20),
      gap: metrics.scale(12, 10, 16),
    },
    modalTitle: {
      color: '#0f172a',
      fontSize: metrics.scale(18, 16, 22),
      fontWeight: '700',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
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
