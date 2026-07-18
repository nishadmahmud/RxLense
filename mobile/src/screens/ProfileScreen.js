import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../AppState';
import { t } from '../i18n';
import { colors } from '../theme';
import { generateBrief } from '../api';

export default function ProfileScreen() {
  const { language, setLanguage, profile, activePerson, upsertPerson, scanSession, setScanSession } =
    useAppState();
  const me = profile.people.find((p) => p.id === 'me') || activePerson;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me?.name || '');
  const [ageYears, setAgeYears] = useState(String(me?.ageYears || ''));
  const [gender, setGender] = useState(me?.gender || '');
  const [msg, setMsg] = useState('');
  const [regenLoading, setRegenLoading] = useState(false);

  useEffect(() => {
    if (!editing) {
      setName(me?.name || '');
      setAgeYears(String(me?.ageYears || ''));
      setGender(me?.gender || '');
    }
  }, [me?.name, me?.ageYears, me?.gender, editing]);

  async function save() {
    await upsertPerson({ ...me, name: name.trim() || 'Me', ageYears, gender: gender || '' });
    setEditing(false);
    setMsg(t(language, 'saved'));
    setTimeout(() => setMsg(''), 2000);
  }

  function cancelEdit() {
    setName(me?.name || '');
    setAgeYears(String(me?.ageYears || ''));
    setGender(me?.gender || '');
    setEditing(false);
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
            gender: me?.gender || undefined,
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

  const displayName = (me?.name || '').trim() || t(language, 'me');
  const displayAge = me?.ageYears
    ? t(language, 'yearsOld').replace('{age}', String(me.ageYears))
    : '';
  const genderLabelKey = {
    male: 'genderMale',
    female: 'genderFemale',
    other: 'genderOther',
    prefer_not: 'genderPreferNot',
  }[me?.gender];
  const displayGender = genderLabelKey ? t(language, genderLabelKey) : '';

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>{t(language, 'profile')}</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionLabel}>{t(language, 'editProfile')}</Text>
          {!editing ? (
            <Pressable
              hitSlop={10}
              onPress={() => {
                setMsg('');
                setEditing(true);
              }}
              accessibilityLabel={t(language, 'editProfile')}
            >
              <Ionicons name="create-outline" size={22} color={colors.accent} />
            </Pressable>
          ) : null}
        </View>

        {editing ? (
          <View>
            <Text style={styles.label}>{t(language, 'yourName')}</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} autoFocus />
            <Text style={styles.label}>{t(language, 'yourAge')}</Text>
            <TextInput
              style={styles.input}
              value={ageYears}
              onChangeText={setAgeYears}
              keyboardType="number-pad"
            />
            <Text style={styles.label}>{t(language, 'yourGender')}</Text>
            <View style={styles.wrap}>
              {[
                ['male', 'genderMale'],
                ['female', 'genderFemale'],
                ['other', 'genderOther'],
                ['prefer_not', 'genderPreferNot'],
              ].map(([id, key]) => {
                const on = gender === id;
                return (
                  <Pressable
                    key={id}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setGender(on ? '' : id)}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(language, key)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.editActions}>
              <Pressable style={styles.secondary} onPress={cancelEdit}>
                <Text style={styles.secondaryText}>{t(language, 'cancel')}</Text>
              </Pressable>
              <Pressable style={styles.primary} onPress={save}>
                <Text style={styles.primaryText}>{t(language, 'save')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.heroName}>{displayName}</Text>
            {!!displayAge && <Text style={styles.heroMeta}>{displayAge}</Text>}
            {!!displayGender && <Text style={styles.heroMeta}>{displayGender}</Text>}
            {!!msg && <Text style={styles.okMsg}>{msg}</Text>}
          </View>
        )}
      </View>

      <Pressable style={styles.langRow} onPress={toggleLanguage} disabled={regenLoading}>
        <View>
          <Text style={styles.sectionLabel}>{t(language, 'language')}</Text>
          <Text style={styles.langValue}>
            {regenLoading ? t(language, 'regenerating') : language === 'en' ? 'English' : 'বাংলা'}
          </Text>
        </View>
        <View style={styles.langChip}>
          <Text style={styles.langChipText}>{language === 'en' ? 'বাংলা' : 'EN'}</Text>
        </View>
      </Pressable>

      <Text style={styles.h2}>{t(language, 'people')}</Text>
      {profile.people.map((p) => {
        const meds =
          (p.regimen || []).length > 0
            ? (p.regimen || []).map((m) => m.brandName).filter(Boolean).join(', ')
            : (p.chronicMeds || []).map((m) => m.brandName).filter(Boolean).join(', ');
        const conditions = (p.conditions || []).map((c) => c.label).join(', ');
        return (
          <View key={p.id} style={styles.personCard}>
            <Text style={styles.personTitle}>
              {p.relation === 'me' ? t(language, 'me') : p.name || p.id}
              {p.ageYears ? ` · ${p.ageYears}` : ''}
              {p.gender === 'male'
                ? ` · ${t(language, 'genderMale')}`
                : p.gender === 'female'
                  ? ` · ${t(language, 'genderFemale')}`
                  : p.gender === 'other'
                    ? ` · ${t(language, 'genderOther')}`
                    : ''}
            </Text>
            <Text style={styles.personLine}>
              {conditions || t(language, 'noConditions')}
            </Text>
            <Text style={styles.personLine}>
              {meds
                ? `${meds}${(p.regimen || []).length ? ` (${(p.regimen || []).length})` : ''}`
                : t(language, 'noMedsListed')}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '750', color: colors.graphite, marginBottom: 16 },
  h2: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 8,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: colors.muted },
  heroName: { fontSize: 22, fontWeight: '800', color: colors.graphite },
  heroMeta: { marginTop: 4, fontSize: 15, color: colors.accent },
  okMsg: { marginTop: 8, fontSize: 12, color: colors.accent, fontWeight: '600' },
  label: { fontSize: 12, color: colors.muted, marginBottom: 4, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.foilLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    color: colors.graphite,
  },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  primary: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: {
    flex: 1,
    backgroundColor: colors.silver,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryText: { color: colors.accentDark, fontWeight: '700' },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langValue: { marginTop: 4, fontSize: 16, fontWeight: '700', color: colors.graphite },
  langChip: {
    backgroundColor: colors.silver,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  langChipText: { color: colors.accentDark, fontWeight: '700', fontSize: 13 },
  personCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  personTitle: { fontSize: 16, fontWeight: '750', color: colors.graphite, marginBottom: 6 },
  personLine: { fontSize: 13, color: colors.muted, lineHeight: 18, marginBottom: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    backgroundColor: colors.silver,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipOn: { backgroundColor: colors.accent },
  chipText: { color: colors.graphite, fontSize: 13 },
  chipTextOn: { color: '#fff', fontSize: 13 },
});
