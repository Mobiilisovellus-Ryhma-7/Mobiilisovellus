import AppNavigator from './navigation/AppNavigator';
import { PaperProvider } from 'react-native-paper';
import { appTheme } from './navigation/theme';

export default function App() {
  // Data Connect Test // return <DataConnectTest />;
  return (
    <PaperProvider theme={appTheme}>
      <AppNavigator />
    </PaperProvider>
  );
}
