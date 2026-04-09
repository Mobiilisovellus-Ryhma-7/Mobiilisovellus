import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Button, IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { getResponsiveMetrics } from '../shared/responsive';
import { getDynamicSportHallLogoSource } from '../shared/logo';
import Screen from '../shared/Screen';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';

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
  const { colors, dark } = useTheme();
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const styles = React.useMemo(() => createStyles(metrics, colors, dark), [colors, dark, metrics]);
  const [isSignedIn, setIsSignedIn] = React.useState(false);

  React.useEffect(() => {
    if (!auth) {
      setIsSignedIn(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsSignedIn(!!user);
    });

    return unsubscribe;
  }, []);
// Pääsivu
  return React.createElement(
    Screen,
    { style: [styles.safeArea, { backgroundColor: colors.background }] },
    React.createElement(
      View,
      { style: [styles.screen, { backgroundColor: colors.background }] },
      React.createElement(
        Surface,
        { style: styles.topSection, elevation: 2 },
        React.createElement(Image, {
          source: getDynamicSportHallLogoSource(dark),
          style: styles.logo,
          resizeMode: 'contain',
        }),
        React.createElement(Text, {
          style: [styles.title, { color: colors.onSurface }],
          variant: 'displaySmall',
          children: 'HALLILLE!',
        }),
        React.createElement(Text, {
          style: [styles.subtitle, { color: colors.onSurfaceVariant }],
          children: 'Varaa vuorot helposti ja nopeasti.',
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
          !isSignedIn
            ? React.createElement(Button, {
                mode: 'contained-tonal',
                onPress: onOpenLogin,
                style: styles.secondaryButton,
                contentStyle: styles.buttonContent,
                labelStyle: styles.secondaryButtonText,
                children: 'Kirjaudu',
              })
            : React.createElement(
                Surface,
                { style: styles.signedInBadge, elevation: 0 },
                React.createElement(Text, {
                  style: styles.signedInText,
                  children: 'Olet kirjautunut sisään',
                })
              )
        )
      ),
      React.createElement(
        Surface,
        { style: styles.bottomNav, elevation: 1 },
        React.createElement(IconButton, {
          mode: 'contained-tonal',
          icon: 'account',
          onPress: onOpenProfile,
          size: metrics.scale(24, 20, 28),
          style: styles.profileButton,
          accessibilityLabel: 'Avaa profiili',
        }),
        React.createElement(Text, {
          style: [styles.profileLabel, { color: colors.onSurfaceVariant }],
          children: 'Profiili',
        })
      )
    )
  );
}

const createStyles = (
  metrics: ReturnType<typeof getResponsiveMetrics>,
  colors: any,
  dark: boolean
) =>
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
      backgroundColor: dark ? '#1e293b' : colors.surface,
      borderRadius: metrics.scale(28, 20, 34),
      paddingHorizontal: metrics.scale(20, 14, 28),
      paddingVertical: metrics.scale(20, 14, 30),
      borderWidth: 1,
      borderColor: dark ? '#334155' : colors.outline,
    },
    logo: {
      width: metrics.scale(132, 100, 150),
      height: metrics.scale(108, 84, 126),
      marginTop: metrics.scale(8, 4, 12),
    },
    title: {
      marginTop: metrics.scale(8, 6, 12),
      fontSize: metrics.scale(30, 24, 36),
      letterSpacing: 0.6,
      fontStyle: 'italic',
      color: colors.onSurface,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: metrics.scale(8, 6, 10),
      fontSize: metrics.scale(14, 12, 18),
      lineHeight: metrics.scale(20, 18, 24),
      textAlign: 'center',
      maxWidth: metrics.scale(320, 260, 420),
    },
    buttonsWrap: {
      marginTop: metrics.scale(28, 18, 36),
      width: '100%',
      alignItems: 'center',
      gap: metrics.scale(12, 10, 16),
    },
    primaryButton: {
      width: '100%',
      maxWidth: 340,
      borderRadius: metrics.scale(16, 14, 22),
    },
    secondaryButton: {
      width: '100%',
      maxWidth: 340,
      borderRadius: metrics.scale(16, 14, 22),
    },
    buttonContent: {
      height: metrics.scale(58, 48, 66),
    },
    buttonText: {
      color: '#ffffff',
      fontSize: metrics.scale(18, 15, 22),
      fontWeight: '700',
    },
    secondaryButtonText: {
      fontSize: metrics.scale(18, 15, 22),
      fontWeight: '700',
    },
    signedInBadge: {
      marginTop: metrics.scale(2, 0, 4),
      borderRadius: metrics.scale(14, 12, 18),
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: metrics.scale(14, 12, 18),
      paddingVertical: metrics.scale(10, 8, 12),
    },
    signedInText: {
      fontSize: metrics.scale(14, 12, 17),
      fontWeight: '700',
      color: colors.onSurfaceVariant,
    },
    bottomNav: {
      width: '100%',
      maxWidth: metrics.contentMaxWidth,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: metrics.scale(8, 6, 10),
      alignSelf: 'center',
      paddingVertical: metrics.scale(8, 6, 10),
      borderRadius: metrics.scale(18, 14, 22),
      backgroundColor: dark ? '#1e293b' : colors.surface,
      borderWidth: 1,
      borderColor: dark ? '#334155' : colors.outline,
    },
    profileButton: {
      margin: 0,
    },
    profileLabel: {
      fontSize: metrics.scale(14, 12, 16),
      fontWeight: '700',
      marginRight: metrics.scale(8, 6, 10),
    },
  });
