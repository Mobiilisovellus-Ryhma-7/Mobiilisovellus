import AppNavigator from './navigation/AppNavigator';
import { PaperProvider } from 'react-native-paper';
import { appTheme } from './navigation/theme';
import { NavigationContainer } from '@react-navigation/native';

export default function App() {
  // Data Connect Test // return <DataConnectTest />;
  return (
    <PaperProvider theme={appTheme}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
}
