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
  const next = [
    {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...entry,
    },
    ...list,
  ].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function deleteHistoryEntry(id) {
  const list = await loadHistory();
  const next = list.filter((e) => e.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
