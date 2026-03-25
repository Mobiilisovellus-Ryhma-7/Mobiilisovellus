import React from 'react';
import { Image, Pressable, SafeAreaView, StyleSheet, View } from 'react-native';
import { Button, Surface, Text, useTheme } from 'react-native-paper';

type MainPageProps = {
  onOpenFacilities?: () => void;
  onOpenLogin?: () => void;
  onOpenProfile?: () => void;
};

export default function MainPage({
  onOpenFacilities,
  onOpenLogin,
  onOpenProfile,
}: MainPageProps) {
  const { colors } = useTheme();

  const navItems = [
    React.createElement(Surface, {
      key: 'nav-1',
      style: styles.navItem,
      children: React.createElement(View, { style: styles.navInnerSquare }),
    }),
    React.createElement(Surface, {
      key: 'nav-2',
      style: styles.navItem,
      children: React.createElement(View, { style: styles.navInnerSquare }),
    }),
    React.createElement(Surface, {
      key: 'nav-3',
      style: styles.navItem,
      children: React.createElement(View, { style: styles.navInnerSquare }),
    }),
    React.createElement(Surface, {
      key: 'nav-4',
      style: styles.navItem,
      children: React.createElement(View, { style: styles.navInnerSquare }),
    }),
    React.createElement(
      Pressable,
      {
        key: 'nav-profile',
        style: styles.navItem,
        onPress: onOpenProfile,
      },
      React.createElement(View, { style: styles.profileHead }),
      React.createElement(View, { style: styles.profileBody })
    ),
  ];

  return React.createElement(
    SafeAreaView,
    { style: [styles.safeArea, { backgroundColor: colors.background }] },
    React.createElement(
      View,
      { style: [styles.screen, { backgroundColor: colors.background }] },
      React.createElement(
        View,
        { style: styles.topSection },
        React.createElement(Image, {
          source: require('../../assets/dynamic-sport-hall-logo.png'),
          style: styles.logo,
          resizeMode: 'contain',
        }),
        React.createElement(Text, {
          style: [styles.title, { color: colors.onSurface }],
          variant: 'displaySmall',
          children: 'HALLILLE!',
        }),
        React.createElement(
          View,
          { style: styles.buttonsWrap },
          React.createElement(Button, {
            mode: 'contained',
            onPress: onOpenFacilities,
            style: styles.primaryButton,
            contentStyle: styles.buttonContent,
            labelStyle: styles.buttonText,
            children: 'Vapaat kentat',
          }),
          React.createElement(Button, {
            mode: 'contained',
            onPress: onOpenLogin,
            style: styles.primaryButton,
            contentStyle: styles.buttonContent,
            labelStyle: styles.buttonText,
            children: 'Kirjaudu',
          })
        )
      ),
      React.createElement(View, { style: styles.bottomNav }, ...navItems)
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
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 22,
  },
  topSection: {
    alignItems: 'center',
  },
  logo: {
    width: 132,
    height: 108,
    marginTop: 8,
  },
  title: {
    marginTop: 10,
    fontSize: 40,
    letterSpacing: 1,
    fontStyle: 'italic',
    color: '#0f172a',
  },
  buttonsWrap: {
    marginTop: 54,
    width: '100%',
    alignItems: 'center',
    gap: 26,
  },
  primaryButton: {
    width: 126,
    borderRadius: 31,
  },
  buttonContent: {
    height: 62,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  navItem: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#e8e8e8',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  navInnerSquare: {
    width: 15,
    height: 15,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#414141',
    backgroundColor: '#f5f5f5',
  },
  profileHead: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#414141',
    marginBottom: 2,
  },
  profileBody: {
    width: 18,
    height: 10,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    backgroundColor: '#414141',
  },
});
