import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'rxlens_medex_prices_v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let memory = null;

export function normalizePriceKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\b(tablet|capsule|syrup|inj|injection|tab|cap)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function loadStore() {
  if (memory) return memory;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    memory = raw ? JSON.parse(raw) : {};
  } catch {
    memory = {};
  }
  return memory;
}

async function saveStore(store) {
  memory = store;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

/** @returns {Promise<string[]|null>} */
export async function getCachedMedexPrices(query) {
  const key = normalizePriceKey(query);
  if (!key) return null;
  const store = await loadStore();
  const hit = store[key];
  if (!hit?.lines?.length) return null;
  if (hit.at && Date.now() - hit.at > TTL_MS) return null;
  return hit.lines;
}

export async function setCachedMedexPrices(query, lines) {
  const key = normalizePriceKey(query);
  if (!key || !lines?.length) return;
  const store = await loadStore();
  store[key] = { lines, at: Date.now() };
  await saveStore(store);
}
