import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAppState } from '../AppState';
import { t } from '../i18n';
import { colors } from '../theme';
import { generateBrief } from '../api';

export default function ProfileScreen() {
  const { language, setLanguage, profile, persist, activePerson, upsertPerson, scanSession, setScanSession } =
    useAppState();
  const me = profile.people.find((p) => p.id === 'me') || activePerson;
  const [name, setName] = useState(me?.name || '');
  const [ageYears, setAgeYears] = useState(String(me?.ageYears || ''));
  const [msg, setMsg] = useState('');
  const [regenLoading, setRegenLoading] = useState(false);

  async function save() {
    await upsertPerson({ ...me, name: name.trim() || 'Me', ageYears });
    setMsg(t(language, 'saved'));
  }

  async function toggleLanguage() {
    const next = language === 'en' ? 'bn' : 'en';
    await setLanguage(next);
    if (scanSession.briefing && scanSession.medicines?.length) {
      setRegenLoading(true);
      try {
        const data = await generateBrief({
          medicines: scanSession.medicines,
          patientContext: {
            ageBand: 'adult',
            ageYears: me?.ageYears,
            conditions: (me?.conditions || []).map((c) => c.label),
            otherMedsText: (me?.chronicMeds || []).map((m) => m.brandName).join(', '),
            personLabel: me?.name,
          },
          language: next,
          confirmUnmatched: true,
        });
        setScanSession((s) => ({
          ...s,
          briefing: data.briefing,
          disclaimer: data.disclaimer,
          medicines: data.medicines || s.medicines,
        }));
      } catch {
        /* keep old briefing */
      } finally {
        setRegenLoading(false);
      }
    }
  }

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>{t(language, 'profile')}</Text>
      <Text style={styles.label}>{t(language, 'language')}</Text>
      <Pressable style={styles.secondary} onPress={toggleLanguage}>
        <Text style={styles.secondaryText}>
          {regenLoading ? t(language, 'regenerating') : language === 'en' ? 'বাংলা' : 'EN'}
        </Text>
      </Pressable>

      <Text style={styles.h2}>{t(language, 'editProfile')}</Text>
      <Text style={styles.label}>{t(language, 'yourName')}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
      <Text style={styles.label}>{t(language, 'yourAge')}</Text>
      <TextInput
        style={styles.input}
        value={ageYears}
        onChangeText={setAgeYears}
        keyboardType="number-pad"
      />
      <Pressable style={styles.primary} onPress={save}>
        <Text style={styles.primaryText}>{t(language, 'save')}</Text>
      </Pressable>
      {!!msg && <Text style={styles.meta}>{msg}</Text>}

      <Text style={[styles.h2, { marginTop: 20 }]}>{t(language, 'people')}</Text>
      {profile.people.map((p) => (
        <View key={p.id} style={styles.card}>
          <Text style={styles.title}>
            {p.relation === 'me' ? t(language, 'me') : p.name} {p.ageYears ? `(${p.ageYears})` : ''}
          </Text>
          <Text style={styles.meta}>
            {(p.conditions || []).map((c) => c.label).join(', ') || '—'}
          </Text>
          <Text style={styles.meta}>
            Meds:{' '}
            {(p.regimen || []).length
              ? `${(p.regimen || []).map((m) => m.brandName).filter(Boolean).join(', ')} (${(p.regimen || []).length})`
              : (p.chronicMeds || []).map((m) => m.brandName).join(', ') || '—'}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '750', color: colors.graphite, marginBottom: 12 },
  h2: { fontSize: 17, fontWeight: '700', color: colors.graphite, marginTop: 8, marginBottom: 8 },
  label: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    color: colors.graphite,
  },
  primary: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: {
    backgroundColor: colors.silver,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryText: { color: colors.accentDark, fontWeight: '700' },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontWeight: '700', color: colors.graphite },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
