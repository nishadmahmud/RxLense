import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getActivePerson,
  loadProfile,
  saveProfile,
  defaultProfile,
  mergeRegimen,
  removeRegimenItem as removeRegimenItemFromStore,
  upsertPerson,
  addFamilyPerson,
} from './profileStore';
import { loadHistory, saveHistoryEntry } from './history';

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(defaultProfile());
  const [history, setHistory] = useState([]);
  const [scanSession, setScanSession] = useState({
    medicines: [],
    briefing: null,
    disclaimer: '',
    forPersonId: 'me',
    guest: null,
    imageUri: null,
    imageBase64: null,
    sourceType: 'prescription',
  });

  useEffect(() => {
    (async () => {
      const [p, h] = await Promise.all([loadProfile(), loadHistory()]);
      setProfile(p);
      setHistory(h);
      setReady(true);
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setProfile(next);
    await saveProfile(next);
  }, []);

  const language = profile.language || 'en';
  const activePerson = useMemo(() => getActivePerson(profile), [profile]);

  const value = {
    ready,
    profile,
    persist,
    language,
    setLanguage: async (lang) => persist({ ...profile, language: lang }),
    activePerson,
    history,
    setHistory,
    saveScanToHistory: async (entry) => {
      const next = await saveHistoryEntry(entry);
      setHistory(next);
      return next;
    },
    scanSession,
    setScanSession,
    upsertPerson: async (person) => persist(upsertPerson(profile, person)),
    addFamily: async (fields) => persist(addFamilyPerson(profile, fields)),
    saveRegimen: async (personId, items) => persist(mergeRegimen(profile, personId, items)),
    removeRegimenItem: async (personId, index) =>
      persist(removeRegimenItemFromStore(profile, personId, index)),
    completeOnboarding: async () => persist({ ...profile, onboardingDone: true }),
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState outside provider');
  return ctx;
}
