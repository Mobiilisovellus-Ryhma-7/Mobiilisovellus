import React from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Button, Surface, Text, useTheme } from 'react-native-paper';
import { getResponsiveMetrics } from '../shared/responsive';

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
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const styles = React.useMemo(() => createStyles(metrics), [metrics]);

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
            children: 'Vapaat kentät',
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

const createStyles = (metrics: ReturnType<typeof getResponsiveMetrics>) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#ececec',
    },
    screen: {
      flex: 1,
      backgroundColor: '#ececec',
      justifyContent: 'space-between',
      paddingHorizontal: metrics.horizontalPadding,
      paddingTop: metrics.scale(48, 28, 64),
      paddingBottom: metrics.scale(22, 18, 30),
      alignItems: 'center',
    },
    topSection: {
      width: '100%',
      maxWidth: metrics.contentMaxWidth,
      alignItems: 'center',
      backgroundColor: '#f7f9fc',
      borderRadius: metrics.scale(24, 18, 30),
      paddingHorizontal: metrics.scale(20, 14, 28),
      paddingVertical: metrics.scale(20, 14, 30),
    },
    logo: {
      width: metrics.scale(132, 100, 150),
      height: metrics.scale(108, 84, 126),
      marginTop: metrics.scale(8, 4, 12),
    },
    title: {
      marginTop: metrics.scale(10, 8, 14),
      fontSize: metrics.scale(30, 24, 36),
      letterSpacing: 0.6,
      fontStyle: 'italic',
      color: '#0f172a',
      textAlign: 'center',
    },
    buttonsWrap: {
      marginTop: metrics.scale(34, 20, 44),
      width: '100%',
      alignItems: 'center',
      gap: metrics.scale(16, 12, 22),
    },
    primaryButton: {
      width: '100%',
      maxWidth: 320,
      borderRadius: metrics.scale(16, 14, 22),
    },
    buttonContent: {
      height: metrics.scale(62, 50, 70),
    },
    buttonText: {
      color: '#ffffff',
      fontSize: metrics.scale(18, 15, 22),
      fontWeight: '600',
    },
    bottomNav: {
      width: '100%',
      maxWidth: metrics.contentMaxWidth,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: metrics.scale(8, 2, 24),
    },
    navItem: {
      width: metrics.scale(46, 40, 58),
      height: metrics.scale(46, 40, 58),
      borderRadius: metrics.scale(23, 20, 29),
      backgroundColor: '#e8e8e8',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 0,
    },
    navInnerSquare: {
      width: metrics.scale(15, 12, 20),
      height: metrics.scale(15, 12, 20),
      borderRadius: 4,
      borderWidth: 2,
      borderColor: '#414141',
      backgroundColor: '#f5f5f5',
    },
    profileHead: {
      width: metrics.scale(12, 10, 16),
      height: metrics.scale(12, 10, 16),
      borderRadius: metrics.scale(6, 5, 8),
      backgroundColor: '#414141',
      marginBottom: 2,
    },
    profileBody: {
      width: metrics.scale(18, 14, 24),
      height: metrics.scale(10, 8, 14),
      borderTopLeftRadius: metrics.scale(9, 7, 12),
      borderTopRightRadius: metrics.scale(9, 7, 12),
      backgroundColor: '#414141',
    },
  });
