import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'rxlens_history_v1';
const MAX = 12;

export async function loadHistory() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveHistoryEntry(entry) {
  const list = await loadHistory();
  const created = {
    ...entry,
    id: entry.id || `${Date.now()}`,
    createdAt: entry.createdAt || new Date().toISOString(),
  };
  const next = [created, ...list].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return { list: next, entry: created };
}

export async function deleteHistoryEntry(id) {
  const list = await loadHistory();
  const next = list.filter((e) => e.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
