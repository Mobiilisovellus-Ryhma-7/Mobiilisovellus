import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

export const lightAppTheme = {
  ...MD3LightTheme,
  version: 3,
  colors: {
    ...MD3LightTheme.colors,
    background: '#ececec',
    surface: '#ffffff',
    surfaceVariant: '#dfe5ec',
    primary: '#0d8bf2',
    onPrimary: '#ffffff',
    onSurface: '#0f172a',
    onSurfaceVariant: '#556070',
    outline: '#b8c2cf',
  },
};

export const darkAppTheme = {
  ...MD3DarkTheme,
  version: 3,
  colors: {
    ...MD3DarkTheme.colors,
    background: '#0f172a',
    surface: '#111827',
    primary: '#38bdf8',
    onPrimary: '#0f172a',
    onSurface: '#e2e8f0',
    outline: '#334155',
  },
};
