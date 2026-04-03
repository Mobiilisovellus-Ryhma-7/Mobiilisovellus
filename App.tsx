import React from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
import { PaperProvider } from 'react-native-paper';
import { darkAppTheme, lightAppTheme } from './navigation/theme';
import FirestoreConnectionTest from './test/FirestoreConnectionTest';

const SHOW_FIRESTORE_TEST = true;

export default function App() {
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  const paperTheme = isDarkMode ? darkAppTheme : lightAppTheme;
  const navigationTheme = React.useMemo(
    () => ({
      ...(isDarkMode ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
        background: paperTheme.colors.background,
        card: paperTheme.colors.surface,
        text: paperTheme.colors.onSurface,
        border: paperTheme.colors.outline,
        primary: paperTheme.colors.primary,
      },
    }),
    [isDarkMode, paperTheme.colors.background, paperTheme.colors.onSurface, paperTheme.colors.outline, paperTheme.colors.primary, paperTheme.colors.surface]
  );

 // if (SHOW_FIRESTORE_TEST) {
 //   return <FirestoreConnectionTest />;
 // }

  return (
    <PaperProvider theme={paperTheme as any}>
      <NavigationContainer theme={navigationTheme}>
        <AppNavigator
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        />
      </NavigationContainer>
    </PaperProvider>
  );
}
