import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import { PaperProvider } from 'react-native-paper';
import { appTheme } from './navigation/theme';
import { NavigationContainer } from '@react-navigation/native';
import firebaseApp, { firebaseInitError, runFirestoreHealthCheck, } from './services/firebase';

const SHOW_FIRESTORE_TEST = true;

function FirestoreConnectionTest() {
  const projectId = firebaseApp?.options.projectId ?? 'unknown';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    collection: string;
    sampleCount: number;
  } | null>(null);

  const resultText = useMemo(() => {
    if (!result) {
      return null;
    }

    return `Connected to Firestore\nCollection: ${result.collection}\nSample docs: ${result.sampleCount}`;
  }, [result]);

  const handleTestConnection = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const check = await runFirestoreHealthCheck();
      setResult({
        collection: check.collection,
        sampleCount: check.sampleCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Firestore Connection Test</Text>
        <Text style={styles.subtitle}>Project: {projectId}</Text>

        {firebaseInitError ? (
          <Text style={styles.errorText}>Firebase init error: {firebaseInitError}</Text>
        ) : null}

        <Pressable
          onPress={handleTestConnection}
          disabled={loading || !!firebaseInitError}
          style={({ pressed }) => [
            styles.button,
            pressed ? styles.buttonPressed : null,
            loading || firebaseInitError ? styles.buttonDisabled : null,
          ]}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Testing Firestore...' : 'Run Firestore Test'}
          </Text>
        </Pressable>

        {loading ? <ActivityIndicator style={styles.loader} /> : null}

        {error ? <Text style={styles.errorText}>Error: {error}</Text> : null}
        {resultText ? <Text style={styles.successText}>{resultText}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  if (SHOW_FIRESTORE_TEST) {
    return <FirestoreConnectionTest />;
  }

  return (
    <PaperProvider theme={appTheme as any}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  container: {
    paddingTop: 72,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#334155',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  loader: {
    marginTop: 16,
  },
  errorText: {
    marginTop: 16,
    color: '#b91c1c',
    fontSize: 14,
    lineHeight: 20,
  },
  successText: {
    marginTop: 16,
    color: '#0f766e',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
});
