import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';

type SelectProps = {
  onBack?: () => void;
  onSearch?: () => void;
};

export default function Select({ onBack, onSearch }: SelectProps) {
  const { colors } = useTheme();

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
          View,
          { style: styles.inputLine },
          React.createElement(Text, {
            style: styles.inputPlaceholder,
            children: 'Valitse paivamaara',
          })
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ececec',
  },
  screen: {
    flex: 1,
    backgroundColor: '#ececec',
    paddingHorizontal: 26,
    paddingTop: 20,
    paddingBottom: 28,
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.4,
  },
  headerSpacer: {
    width: 34,
    height: 34,
  },
  formArea: {
    marginTop: 82,
    gap: 28,
    paddingHorizontal: 16,
  },
  inputLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#d9d9d9',
    paddingBottom: 10,
  },
  inputPlaceholder: {
    color: '#b7b7b7',
    fontSize: 27,
    fontWeight: '400',
  },
  bottomArea: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  searchButton: {
    width: '90%',
    borderRadius: 28,
  },
  searchButtonContent: {
    height: 56,
  },
  searchButtonText: {
    fontSize: 27,
    fontWeight: '500',
    color: '#ffffff',
  },
});
