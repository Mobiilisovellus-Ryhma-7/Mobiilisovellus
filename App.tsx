import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import firebaseApp from './services/firebase';

export default function App() {
  const projectId = firebaseApp.options.projectId ?? 'unknown';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase is connected.</Text>
      <Text style={styles.subtitle}>Project: {projectId}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#374151',
  },
});
