import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import firebaseApp, { db, firebaseInitError } from '../services/firebase';

type FirestoreCollectionResult = {
  collection: string;
  count: number;
  docs: Array<{ id: string; data: Record<string, unknown> }>;
};

const DEFAULT_COLLECTIONS = ['users', 'facilities', 'facility_sections', 'bookings'];

function getCollectionNames() {
  const fromEnv = process.env.EXPO_PUBLIC_FIRESTORE_COLLECTION;
  if (!fromEnv) {
    return DEFAULT_COLLECTIONS;
  }

  const parsed = fromEnv
    .split(',')
    .map((name: string) => name.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : DEFAULT_COLLECTIONS;
}

export default function FirestoreConnectionTest() {
  const projectId = firebaseApp?.options.projectId ?? 'unknown';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FirestoreCollectionResult[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const collectionNames = useMemo(() => getCollectionNames(), []);

  const resultText = useMemo(() => {
    if (results.length === 0) {
      return null;
    }

    return `Connected to Firestore\nCollections loaded: ${results.length}\nTotal docs: ${totalDocs}`;
  }, [results, totalDocs]);

  const handleTestConnection = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    setTotalDocs(0);

    try {
      if (firebaseInitError) {
        throw new Error(firebaseInitError);
      }

      if (!db) {
        throw new Error('Firebase app is not initialized.');
      }

      const firestore = db;

      const loadedCollections = await Promise.all(
        collectionNames.map(async (collectionName: string) => {
          const snapshot = await getDocs(collection(firestore, collectionName));
          return {
            collection: collectionName,
            count: snapshot.size,
            docs: snapshot.docs.map((doc) => ({
              id: doc.id,
              data: doc.data() as Record<string, unknown>,
            })),
          } satisfies FirestoreCollectionResult;
        })
      );

      setResults(loadedCollections);
      setTotalDocs(loadedCollections.reduce((sum, item) => sum + item.count, 0));
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
            {loading ? 'Loading Firestore data...' : 'Load Firestore Data'}
          </Text>
        </Pressable>

        {loading ? <ActivityIndicator style={styles.loader} /> : null}

        {error ? <Text style={styles.errorText}>Error: {error}</Text> : null}
        {resultText ? <Text style={styles.successText}>{resultText}</Text> : null}

        {results.map((item) => (
          <View key={item.collection} style={styles.collectionCard}>
            <Text style={styles.collectionTitle}>
              {item.collection} ({item.count})
            </Text>

            {item.docs.length === 0 ? (
              <Text style={styles.emptyText}>No documents found.</Text>
            ) : (
              item.docs.map((doc) => (
                <View key={doc.id} style={styles.docCard}>
                  <Text style={styles.docId}>id: {doc.id}</Text>
                  <Text style={styles.docJson}>{JSON.stringify(doc.data, null, 2)}</Text>
                </View>
              ))
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
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
  collectionCard: {
    marginTop: 18,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  collectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
  docCard: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  docId: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  docJson: {
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
});
