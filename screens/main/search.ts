import React, { useState } from 'react';
import {
  Image,
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
  useTheme,
} from 'react-native-paper';
import { getResponsiveMetrics } from '../shared/responsive';

type SearchProps = {
  onBack?: () => void;
};

type BookingSlot = {
  id: string;
  title: string;
  time: string;
};

const placeholderSlots: BookingSlot[] = [
  { id: '1', title: 'Heinäpään halli lohko 1', time: '17:00-18:00' },
  { id: '2', title: 'Heinäpään halli lohko 2', time: '17:00-18:00' },
  { id: '3', title: 'Heinäpään halli lohko 3', time: '17:00-18:00' },
  { id: '4', title: 'Heinäpään halli lohko 4', time: '17:00-18:00' },
  { id: '5', title: 'Heinäpään halli lohko 5', time: '17:00-18:00' },
];

export default function Search({ onBack }: SearchProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const styles = React.useMemo(() => createStyles(metrics), [metrics]);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);

  const slotRows = placeholderSlots.map((slot) =>
    React.createElement(
      Pressable,
      {
        key: slot.id,
        style: styles.slotRow,
        onPress: () => setSelectedSlot(slot),
      },
      React.createElement(
        View,
        { style: styles.slotTextWrap },
        React.createElement(Text, {
          style: [styles.slotTitle, { color: colors.onSurface }],
          children: slot.title,
        }),
        React.createElement(Text, {
          style: [styles.slotTime, { color: colors.onSurface }],
          children: slot.time,
        })
      ),
      React.createElement(Text, {
        style: styles.chevron,
        children: '›',
      })
    )
  );

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
            React.createElement(Text, { style: styles.backIcon, children: '‹' })
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
            children: 'pvm',
          }),
          React.createElement(Chip, {
            mode: 'flat',
            compact: true,
            style: styles.filterChip,
            textStyle: styles.filterChipText,
            children: 'laji',
          }),
          React.createElement(Chip, {
            mode: 'flat',
            compact: true,
            style: styles.filterChip,
            textStyle: styles.filterChipText,
            children: 'järjestä',
          })
        )
      ),
      React.createElement(
        Surface,
        {
          style: styles.listSurface,
          elevation: 0,
          children: React.createElement(
            ScrollView,
            { contentContainerStyle: styles.listContent },
            ...slotRows
          ),
        }
      ),
      React.createElement(Portal, {
        children: React.createElement(
          Dialog,
          {
            visible: !!selectedSlot,
            onDismiss: () => setSelectedSlot(null),
            style: styles.dialog,
            children: React.createElement(
              View,
              { style: styles.modalCard },
              React.createElement(
                View,
                { style: styles.modalTopRow },
                React.createElement(Text, {
                  style: styles.modalHall,
                  children: selectedSlot?.title ?? '',
                }),
                React.createElement(Text, {
                  style: styles.modalTime,
                  children: selectedSlot?.time ?? '',
                })
              ),
              React.createElement(Text, {
                style: styles.modalSubLine,
                children: 'Laji',
              }),
              React.createElement(
                View,
                { style: styles.mapPlaceholder },
                React.createElement(Text, {
                  style: styles.mapPin,
                  children: '📍',
                })
              ),
              React.createElement(Text, {
                style: styles.modalSubLine,
                children: 'Sallitut lajit',
              }),
              React.createElement(Text, {
                style: styles.modalSubLine,
                children: 'Mitat + koko',
              }),
              React.createElement(Button, {
                mode: 'contained',
                style: styles.reserveButton,
                contentStyle: styles.reserveButtonContent,
                labelStyle: styles.reserveButtonLabel,
                onPress: () => setSelectedSlot(null),
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
      fontSize: metrics.scale(26, 20, 28),
      lineHeight: metrics.scale(26, 20, 28),
      color: '#616161',
      marginTop: -2,
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
      justifyContent: 'space-between',
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
      fontSize: metrics.scale(28, 18, 32),
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
      paddingLeft: metrics.scale(30, 20, 38),
    },
    mapPin: {
      fontSize: metrics.scale(30, 22, 38),
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
