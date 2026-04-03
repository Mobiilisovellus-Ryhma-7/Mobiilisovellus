import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
import { PaperProvider } from 'react-native-paper';
import { appTheme } from './navigation/theme';
import FirestoreConnectionTest from './test/FirestoreConnectionTest';

const SHOW_FIRESTORE_TEST = true;

export default function App() {
 // if (SHOW_FIRESTORE_TEST) {
 //   return <FirestoreConnectionTest />;
 // }

  return (
    <PaperProvider theme={appTheme as any}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
}
