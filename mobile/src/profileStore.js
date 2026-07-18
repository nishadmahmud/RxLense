import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'rxlens_profile_v2';

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyMePerson(overrides = {}) {
  return {
    id: 'me',
    relation: 'me',
    name: '',
    ageYears: '',
    gender: '', // male | female | other | prefer_not
    conditions: [],
    chronicMeds: [],
    regimen: [],
    ...overrides,
  };
}

export function defaultProfile() {
  const me = emptyMePerson();
  return {
    onboardingDone: false,
    language: 'en',
    people: [me],
    activePersonId: 'me',
  };
}

export async function loadProfile() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw);
    if (!parsed.people?.length) return defaultProfile();
    return { ...defaultProfile(), ...parsed };
  } catch {
    return defaultProfile();
  }
}

export async function saveProfile(profile) {
  await AsyncStorage.setItem(KEY, JSON.stringify(profile));
  return profile;
}

export function getActivePerson(profile) {
  return (
    profile.people.find((p) => p.id === profile.activePersonId) ||
    profile.people[0]
  );
}

export function upsertPerson(profile, person) {
  const id = person.id || uid();
  const next = { ...person, id };
  const idx = profile.people.findIndex((p) => p.id === id);
  const people = [...profile.people];
  if (idx >= 0) people[idx] = { ...people[idx], ...next };
  else people.push(next);
  return { ...profile, people };
}

export function addFamilyPerson(profile, { name, ageYears, gender }) {
  const person = {
    id: uid(),
    relation: 'family',
    name: name || 'Family member',
    ageYears: ageYears || '',
    gender: gender || '',
    conditions: [],
    chronicMeds: [],
    regimen: [],
  };
  return { ...profile, people: [...profile.people, person] };
}

/** Merge schedule items into person's regimen (active medicines). */
export function mergeRegimen(profile, personId, items) {
  const people = profile.people.map((p) => {
    if (p.id !== personId) return p;
    const byKey = new Map();
    for (const r of p.regimen || []) {
      byKey.set(`${(r.brandName || '').toLowerCase()}|${r.strength || ''}`, r);
    }
    for (const item of items || []) {
      const key = `${(item.brandName || '').toLowerCase()}|${item.strength || ''}`;
      byKey.set(key, { ...byKey.get(key), ...item, updatedAt: new Date().toISOString() });
    }
    return { ...p, regimen: Array.from(byKey.values()) };
  });
  return { ...profile, people };
}

/** Remove one regimen entry by index for a person. */
export function removeRegimenItem(profile, personId, index) {
  const people = profile.people.map((p) => {
    if (p.id !== personId) return p;
    const regimen = [...(p.regimen || [])];
    if (index < 0 || index >= regimen.length) return p;
    regimen.splice(index, 1);
    return { ...p, regimen };
  });
  return { ...profile, people };
}

export { uid };
