import React, { useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ececec',
  },
  screen: {
    flex: 1,
    backgroundColor: '#ececec',
    paddingHorizontal: 26,
    paddingTop: 16,
    paddingBottom: 20,
  },
  topArea: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e8e8e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 26,
    lineHeight: 26,
    color: '#616161',
    marginTop: -2,
  },
  headerSpacer: {
    width: 34,
    height: 34,
  },
  logo: {
    width: 120,
    height: 98,
    alignSelf: 'center',
    marginTop: 4,
  },
  title: {
    alignSelf: 'center',
    marginTop: 2,
    fontSize: 22,
    fontWeight: '700',
  },
  filtersRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterChip: {
    minWidth: 86,
    justifyContent: 'center',
    backgroundColor: '#e6e6e6',
  },
  filterChipText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#616161',
  },
  listSurface: {
    flex: 1,
    backgroundColor: '#ececec',
  },
  listContent: {
    paddingBottom: 12,
  },
  slotRow: {
    minHeight: 66,
    borderBottomWidth: 1,
    borderBottomColor: '#d5d5d5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 6,
  },
  slotTextWrap: {
    paddingVertical: 8,
  },
  slotTitle: {
    fontSize: 30,
    fontWeight: '400',
  },
  slotTime: {
    fontSize: 30,
    marginTop: 2,
  },
  chevron: {
    fontSize: 28,
    color: '#c8c8c8',
    marginLeft: 8,
  },
  dialog: {
    backgroundColor: 'transparent',
    alignSelf: 'center',
    width: '90%',
    maxWidth: 360,
    borderRadius: 18,
    elevation: 0,
    marginTop: 0,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#9a9a9a',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalHall: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    maxWidth: '65%',
  },
  modalTime: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSubLine: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  mapPlaceholder: {
    marginTop: 10,
    marginBottom: 12,
    height: 76,
    borderRadius: 2,
    backgroundColor: '#d9d9d9',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 30,
  },
  mapPin: {
    fontSize: 30,
  },
  reserveButton: {
    marginTop: 18,
    borderRadius: 26,
  },
  reserveButtonContent: {
    height: 52,
  },
  reserveButtonLabel: {
    fontSize: 28,
    fontWeight: '700',
  },
});
