/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DEFAULT_SQL_FILE = path.join(process.cwd(), 'setup2.txt');
const BATCH_LIMIT = 450;

function parseArgs(argv) {
  const args = {
    sqlFile: DEFAULT_SQL_FILE,
    reset: true,
    dryRun: false,
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT,
    serviceAccountPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || null,
    collections: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--sql' && argv[i + 1]) {
      args.sqlFile = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg === '--no-reset') {
      args.reset = false;
    } else if (arg === '--reset') {
      args.reset = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--project' && argv[i + 1]) {
      args.projectId = argv[i + 1];
      i += 1;
    } else if (arg === '--service-account' && argv[i + 1]) {
      args.serviceAccountPath = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg === '--collections' && argv[i + 1]) {
      args.collections = argv[i + 1]
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
      i += 1;
    }
  }

  return args;
}

function assertReadableFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL file not found: ${filePath}`);
  }
}

function stripSqlComments(sqlText) {
  return sqlText
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

function camelCase(value) {
  return value.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

function splitTuples(valuesSql) {
  const tuples = [];
  let inString = false;
  let depth = 0;
  let start = -1;

  for (let i = 0; i < valuesSql.length; i += 1) {
    const ch = valuesSql[i];
    const next = valuesSql[i + 1];

    if (ch === "'") {
      if (inString && next === "'") {
        i += 1;
        continue;
      }
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (ch === '(') {
      if (depth === 0) {
        start = i + 1;
      }
      depth += 1;
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        tuples.push(valuesSql.slice(start, i));
        start = -1;
      }
    }
  }

  return tuples;
}

function parseTupleValues(tupleText) {
  const values = [];
  let inString = false;
  let current = '';

  for (let i = 0; i < tupleText.length; i += 1) {
    const ch = tupleText[i];
    const next = tupleText[i + 1];

    if (ch === "'") {
      if (inString && next === "'") {
        current += "'";
        i += 1;
        continue;
      }
      inString = !inString;
      continue;
    }

    if (!inString && ch === ',') {
      values.push(parseScalar(current.trim()));
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.length > 0) {
    values.push(parseScalar(current.trim()));
  }

  return values;
}

function parseScalar(token) {
  if (/^NULL$/i.test(token)) {
    return null;
  }
  if (/^TRUE$/i.test(token)) {
    return true;
  }
  if (/^FALSE$/i.test(token)) {
    return false;
  }
  if (/^NOW\(\)$/i.test(token)) {
    return new Date().toISOString();
  }
  if (/^-?\d+(\.\d+)?$/.test(token)) {
    return Number(token);
  }
  return token;
}

function parseInserts(sqlText) {
  const cleaned = stripSqlComments(sqlText);
  const insertRegex = /INSERT\s+INTO\s+([a-zA-Z_][\w]*)\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
  const result = {};

  let match = insertRegex.exec(cleaned);
  while (match) {
    const table = match[1];
    const columns = match[2].split(',').map((col) => camelCase(col.trim()));
    const valuesSection = match[3];
    const tuples = splitTuples(valuesSection);

    const docs = tuples.map((tupleText) => {
      const values = parseTupleValues(tupleText);
      const row = {};

      columns.forEach((column, idx) => {
        row[column] = values[idx] ?? null;
      });

      return row;
    });

    if (!result[table]) {
      result[table] = [];
    }
    result[table].push(...docs);

    match = insertRegex.exec(cleaned);
  }

  return result;
}

async function deleteCollection(db, collectionName) {
  const collectionRef = db.collection(collectionName);

  while (true) {
    const snapshot = await collectionRef.limit(200).get();
    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function writeDocs(db, collectionName, docs) {
  let batch = db.batch();
  let ops = 0;

  for (const docData of docs) {
    const id = docData.id;
    if (!id || typeof id !== 'string') {
      throw new Error(`Document in ${collectionName} is missing string id.`);
    }

    const ref = db.collection(collectionName).doc(id);
    batch.set(ref, docData, { merge: false });
    ops += 1;

    if (ops >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
  }
}

function logSummary(parsed) {
  const collections = Object.keys(parsed);
  console.log('Parsed collections:');
  collections.forEach((name) => {
    console.log(`- ${name}: ${parsed[name].length} docs`);
  });
}

function selectCollections(parsed, requestedCollections) {
  if (!requestedCollections.length) {
    return parsed;
  }

  const missing = requestedCollections.filter((name) => !Object.prototype.hasOwnProperty.call(parsed, name));
  if (missing.length > 0) {
    throw new Error(
      `Requested collections not found in SQL INSERT statements: ${missing.join(', ')}`
    );
  }

  const selected = {};
  requestedCollections.forEach((name) => {
    selected[name] = parsed[name];
  });
  return selected;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertReadableFile(args.sqlFile);

  const sqlText = fs.readFileSync(args.sqlFile, 'utf8');
  const parsed = parseInserts(sqlText);
  const selected = selectCollections(parsed, args.collections);
  const collections = Object.keys(selected);

  if (collections.length === 0) {
    throw new Error('No INSERT statements were parsed from SQL file.');
  }

  logSummary(selected);

  if (args.dryRun) {
    console.log('Dry run only. No writes executed.');
    return;
  }

  const appOptions = {};

  if (args.serviceAccountPath) {
    if (!fs.existsSync(args.serviceAccountPath)) {
      throw new Error(`Service account JSON not found: ${args.serviceAccountPath}`);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(args.serviceAccountPath, 'utf8'));
    appOptions.credential = admin.credential.cert(serviceAccount);
  } else {
    appOptions.credential = admin.credential.applicationDefault();
  }

  if (args.projectId) {
    appOptions.projectId = args.projectId;
  }

  admin.initializeApp(appOptions);
  const db = admin.firestore();

  if (args.reset) {
    console.log('Reset enabled. Deleting existing documents from target collections...');
    for (const collectionName of collections) {
      await deleteCollection(db, collectionName);
    }
  }

  console.log('Writing documents to Firestore...');
  for (const collectionName of collections) {
    await writeDocs(db, collectionName, selected[collectionName]);
  }

  console.log('Done. Firestore seed completed.');
}

main().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
