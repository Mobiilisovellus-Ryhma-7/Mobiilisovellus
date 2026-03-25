import { MD3LightTheme } from 'react-native-paper';

export const appTheme = {
  ...MD3LightTheme,
  version: 3,
  colors: {
    ...MD3LightTheme.colors,
    background: '#ececec',
    surface: '#ececec',
    primary: '#0d8bf2',
    onPrimary: '#ffffff',
    onSurface: '#0f172a',
    outline: '#d6d6d6',
  },
};
