import { SleepLog, VariableDef, DEFAULT_VARIABLES } from '../types';
import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, writeBatch, getDoc, onSnapshot } from 'firebase/firestore';
import { subDays, format } from 'date-fns';

const USE_FIREBASE = Boolean(db);
const LOCAL_STORAGE_KEY = 'sleep_logs_v1';
const LOCAL_SCHEMA_KEY = 'sleep_logs_schema_v1';

function generateSampleData(): SleepLog[] {
  const data: SleepLog[] = [];
  for (let i = 0; i < 30; i++) {
    const d = subDays(new Date(), i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const hasScreenFree = Math.random() > 0.4;
    const hasMagnesium = Math.random() > 0.5;
    const hasLateSnack = Math.random() > 0.7;
    const hasCoSleeping = Math.random() > 0.2;
    
    let baseScore = 70;
    if (hasScreenFree) baseScore += 5;
    if (hasMagnesium) baseScore += 8;
    if (hasLateSnack) baseScore -= 10;

    baseScore += Math.floor(Math.random() * 10) - 5; // noise
    
    if (baseScore > 100) baseScore = 100;
    if (baseScore < 40) baseScore = 40;

    let nap = 0;
    const r = Math.random();
    if (r > 0.8) nap = 30;
    else if (r > 0.6) nap = 15;

    data.push({
      date: dateStr,
      morning_supplements: Math.random() > 0.3,
      caffeine_after_12pm: Math.random() > 0.6,
      daytime_nap: nap,
      late_night_snack: hasLateSnack,
      magnesium_zinc: hasMagnesium,
      screen_free_1hr: hasScreenFree,
      worry_journal: Math.random() > 0.8,
      co_sleeping: hasCoSleeping,
      ac_temp_optimal: Math.random() > 0.3,
      total_sleep_time: parseFloat((6 + Math.random() * 2.5).toFixed(1)),
      deep_sleep_time: parseFloat((1 + Math.random() * 1.5).toFixed(1)),
      awakenings: Math.floor(Math.random() * 4),
      watch_sleep_score: Math.floor(baseScore),
      subjective_quality: Math.floor(baseScore / 10)
    });
  }
  return data;
}

export async function getVariablesSchema(): Promise<VariableDef[]> {
  let schema: VariableDef[] = [];
  if (USE_FIREBASE && db) {
    const docRef = doc(db, 'settings', 'schema');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      schema = docSnap.data().variables as VariableDef[];
    } else {
      await setDoc(docRef, { variables: DEFAULT_VARIABLES });
      return DEFAULT_VARIABLES;
    }
  } else {
    const raw = localStorage.getItem(LOCAL_SCHEMA_KEY);
    if (raw) {
      schema = JSON.parse(raw);
    } else {
      localStorage.setItem(LOCAL_SCHEMA_KEY, JSON.stringify(DEFAULT_VARIABLES));
      return DEFAULT_VARIABLES;
    }
  }

  // Migration for label update
  let needsSave = false;
  schema = schema.map(v => {
    if (v.id === 'ac_temp_optimal' && v.label === 'AC <= 22°C') {
      needsSave = true;
      return { ...v, label: 'AC cold enough' };
    }
    return v;
  });

  if (needsSave) {
    await saveVariablesSchema(schema);
  }
  return schema;
}

export async function saveVariablesSchema(schema: VariableDef[]): Promise<void> {
  if (USE_FIREBASE && db) {
    const docRef = doc(db, 'settings', 'schema');
    await setDoc(docRef, { variables: schema });
  } else {
    localStorage.setItem(LOCAL_SCHEMA_KEY, JSON.stringify(schema));
  }
}

export async function saveSleepLog(log: SleepLog): Promise<void> {
  if (USE_FIREBASE && db) {
    const docRef = doc(db, 'sleep_logs', log.date);
    await setDoc(docRef, log);
  } else {
    const logs = getLocalLogs();
    logs[log.date] = log;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logs));
  }
}

export async function importSleepLogs(newLogs: SleepLog[]): Promise<void> {
  if (USE_FIREBASE && db) {
    const batch = writeBatch(db);
    newLogs.forEach(log => {
      const docRef = doc(db!, 'sleep_logs', log.date);
      batch.set(docRef, log);
    });
    await batch.commit();
  } else {
    const logs = getLocalLogs();
    newLogs.forEach(log => {
      logs[log.date] = log;
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logs));
  }
}

export async function getSleepLogs(): Promise<SleepLog[]> {
  if (USE_FIREBASE && db) {
    const querySnapshot = await getDocs(collection(db, 'sleep_logs'));
    const logs: SleepLog[] = [];
    querySnapshot.forEach((doc) => {
      logs.push(doc.data() as SleepLog);
    });
    return logs.sort((a, b) => (a.date < b.date ? 1 : -1));
  } else {
    const logs = getLocalLogs();
    return Object.values(logs).sort((a, b) => (a.date < b.date ? 1 : -1));
  }
}

export async function deleteSleepLog(date: string): Promise<void> {
  if (USE_FIREBASE && db) {
     await deleteDoc(doc(db, 'sleep_logs', date));
  } else {
     const logs = getLocalLogs();
     delete logs[date];
     localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logs));
  }
}

export async function clearAllSleepLogs(): Promise<void> {
  if (USE_FIREBASE && db) {
    const querySnapshot = await getDocs(collection(db, 'sleep_logs'));
    const batch = writeBatch(db);
    querySnapshot.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } else {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({}));
  }
}

function getLocalLogs(): Record<string, SleepLog> {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    const sample = generateSampleData();
    const map: Record<string, SleepLog> = {};
    sample.forEach(s => map[s.date] = s);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(map));
    return map;
  }
  return JSON.parse(raw);
}

export function subscribeToSleepLogs(callback: (logs: SleepLog[]) => void): () => void {
  if (USE_FIREBASE && db) {
    const unsubscribe = onSnapshot(collection(db, 'sleep_logs'), (snapshot) => {
      const logs: SleepLog[] = [];
      snapshot.forEach((doc) => {
        logs.push(doc.data() as SleepLog);
      });
      callback(logs.sort((a, b) => (a.date < b.date ? 1 : -1)));
    });
    return unsubscribe;
  } else {
    // For local storage, we just return the initial fetch and a no-op unsubscribe
    // Polling could be added here if needed, but not necessary for local.
    const logs = getLocalLogs();
    callback(Object.values(logs).sort((a, b) => (a.date < b.date ? 1 : -1)));
    return () => {};
  }
}

export function subscribeToSchema(callback: (schema: VariableDef[]) => void): () => void {
  if (USE_FIREBASE && db) {
    const docRef = doc(db, 'settings', 'schema');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().variables as VariableDef[]);
      } else {
        callback(DEFAULT_VARIABLES);
      }
    });
    return unsubscribe;
  } else {
    const raw = localStorage.getItem(LOCAL_SCHEMA_KEY);
    if (raw) {
      callback(JSON.parse(raw));
    } else {
      callback(DEFAULT_VARIABLES);
    }
    return () => {};
  }
}
