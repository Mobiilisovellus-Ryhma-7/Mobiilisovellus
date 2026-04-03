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
import { Button, Text, useTheme } from 'react-native-paper';
import { getResponsiveMetrics } from '../shared/responsive';

type SelectProps = {
  onBack?: () => void;
  onSearch?: () => void;
};
// Haku
export default function Select({ onBack, onSearch }: SelectProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const styles = React.useMemo(() => createStyles(metrics), [metrics]);

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
          { style: styles.inputLine },
          React.createElement(Text, {
            style: styles.inputPlaceholder,
            children: 'Valitse laji',
          })
        ),
        React.createElement(
          Pressable,
          {
            style: styles.inputLine,
            onPress: () => setIsCalendarOpen(true),
          },
          React.createElement(Text, {
            style: [
              styles.inputPlaceholder,
              selectedDate ? styles.selectedValue : null,
            ],
            children: formattedDate,
          })
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
        React.createElement(Button, {
          mode: 'contained',
          onPress: onSearch,
          style: styles.searchButton,
          contentStyle: styles.searchButtonContent,
          labelStyle: styles.searchButtonText,
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
    inputLine: {
      borderBottomWidth: 1,
      borderBottomColor: '#d9d9d9',
      paddingBottom: metrics.scale(10, 8, 14),
    },
    inputPlaceholder: {
      color: '#000000',
      fontSize: metrics.scale(19, 15, 24),
      fontWeight: '400',
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
