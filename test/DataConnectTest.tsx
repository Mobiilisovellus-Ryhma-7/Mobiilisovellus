import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import firebaseApp, {
  DataConnectHealthCheckResult,
  firebaseInitError,
  runDataConnectHealthCheck,
} from '../services/firebase';

export default function DataConnectTest() {
  const projectId = firebaseApp?.options.projectId ?? 'unknown';
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DataConnectHealthCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resultText = useMemo(() => {
    if (!result) {
      return null;
    }

    return JSON.stringify(result, null, 2);
  }, [result]);

  const onRunCheck = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const checkResult = await runDataConnectHealthCheck();
      setResult(checkResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Firebase initialized</Text>
        <Text style={styles.subtitle}>Project: {projectId}</Text>

        {firebaseInitError ? (
          <Text style={styles.errorText}>Error: {firebaseInitError}</Text>
        ) : null}

        <Pressable
          onPress={onRunCheck}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            (loading || !!firebaseInitError) && styles.buttonDisabled,
          ]}
          disabled={loading || !!firebaseInitError}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Testing Data Connect...' : 'Run Data Connect Test'}
          </Text>
        </Pressable>

        {error ? <Text style={styles.errorText}>Error: {error}</Text> : null}

        {resultText ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Data Connect response</Text>
            <Text style={styles.resultBody}>{resultText}</Text>
          </View>
        ) : null}
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  container: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 15,
    color: '#334155',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 18,
    color: '#b91c1c',
    fontSize: 14,
  },
  resultCard: {
    marginTop: 18,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  resultBody: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    color: '#1e293b',
  },
});