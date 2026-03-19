import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import firebaseApp from './services/firebase';
import FieldScheduleScreen from './screens/FieldScheduleScreen';
import { DEFAULT_FIELD_IDS } from './constants/fields';

export default function App() {
  // ensure firebase is initialized (import above)
  void firebaseApp;

  const initialResourceId = DEFAULT_FIELD_IDS[0];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <SafeAreaView style={styles.container}>
      <FieldScheduleScreen initialResourceId={initialResourceId} initialDate={today} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
