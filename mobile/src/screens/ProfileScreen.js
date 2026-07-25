import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../AppState';
import { t } from '../i18n';
import { colors, fonts, radii, spacing } from '../theme';
import { generateBrief } from '../api';
import { AppChromeHeader } from '../components/AppChromeHeader';
import { PillButton, OutlinePillButton } from '../components/PillButton';

function initialsFromName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function ProfileScreen() {
  const {
    language,
    setLanguage,
    profile,
    activePerson,
    upsertPerson,
    addFamily,
    scanSession,
    setScanSession,
    setActivePersonId,
    resetOnboarding,
  } = useAppState();
  const me = profile.people.find((p) => p.id === 'me') || activePerson;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me?.name || '');
  const [ageYears, setAgeYears] = useState(String(me?.ageYears || ''));
  const [gender, setGender] = useState(me?.gender || '');
  const [msg, setMsg] = useState('');
  const [regenLoading, setRegenLoading] = useState(false);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');

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

  async function submitNewPerson() {
    const trimmed = newPersonName.trim();
    if (!trimmed) return;
    await addFamily({ name: trimmed, ageYears: '' });
    setNewPersonName('');
    setAddingPerson(false);
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
  const activeBadge = language === 'bn' ? 'সক্রিয়' : 'Active';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.pad}>
        <AppChromeHeader
          language={language}
          onToggleLanguage={toggleLanguage}
          showLang={!regenLoading}
        />
        <Text style={styles.h1}>{t(language, 'profile')}</Text>

        <View style={styles.avatarCard}>
          {editing ? (
            <View style={{ flex: 1 }}>
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
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {t(language, key)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.editActions}>
                <OutlinePillButton
                  label={t(language, 'cancel')}
                  onPress={cancelEdit}
                  style={styles.editBtn}
                />
                <PillButton label={t(language, 'save')} onPress={save} style={styles.editBtn} />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.avatarRow}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>{initialsFromName(displayName)}</Text>
                </View>
                <View style={styles.avatarMeta}>
                  <Text style={styles.heroName}>{displayName}</Text>
                  {(!!displayAge || !!displayGender) && (
                    <Text style={styles.heroMeta}>
                      {[displayAge, displayGender].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                  {!!msg && <Text style={styles.okMsg}>{msg}</Text>}
                </View>
              </View>
              <Pressable
                style={styles.editIconBtn}
                hitSlop={10}
                onPress={() => {
                  setMsg('');
                  setEditing(true);
                }}
                accessibilityLabel={t(language, 'editProfile')}
              >
                <Ionicons name="create-outline" size={20} color={colors.accent} />
              </Pressable>
            </>
          )}
        </View>

        <Pressable
          style={styles.langRow}
          onPress={toggleLanguage}
          disabled={regenLoading}
        >
          <View style={styles.langLeft}>
            <Ionicons name="language-outline" size={22} color={colors.accent} />
            <Text style={styles.langLabel}>{t(language, 'language')}</Text>
          </View>
          <View style={styles.langRight}>
            <Text style={styles.langValue}>
              {regenLoading
                ? t(language, 'regenerating')
                : language === 'en'
                  ? 'English'
                  : 'বাংলা'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.accent} />
          </View>
        </Pressable>

        <Text style={styles.h2}>{t(language, 'people')}</Text>
        {profile.people.map((p) => {
          const meds =
            (p.regimen || []).length > 0
              ? (p.regimen || []).map((m) => m.brandName).filter(Boolean).join(', ')
              : (p.chronicMeds || []).map((m) => m.brandName).filter(Boolean).join(', ');
          const conditions = (p.conditions || []).map((c) => c.label).join(', ');
          const isActive = profile.activePersonId === p.id;
          const title =
            p.relation === 'me'
              ? `${t(language, 'me')}${p.name ? ` (${p.name})` : ''}`
              : p.name || p.id;
          const metaParts = [
            p.ageYears ? String(p.ageYears) : null,
            p.gender === 'male'
              ? t(language, 'genderMale')
              : p.gender === 'female'
                ? t(language, 'genderFemale')
                : p.gender === 'other'
                  ? t(language, 'genderOther')
                  : null,
          ].filter(Boolean);

          return (
            <Pressable
              key={p.id}
              style={[styles.personCard, isActive && styles.personCardOn]}
              onPress={() => setActivePersonId(p.id)}
            >
              {isActive ? <View style={styles.activeEdge} /> : null}
              <View style={styles.personInner}>
                <View style={styles.personTitleRow}>
                  <Text style={styles.personTitle}>{title}</Text>
                  {isActive ? (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>{activeBadge}</Text>
                    </View>
                  ) : null}
                </View>
                {!!metaParts.length && (
                  <Text style={styles.personLine}>{metaParts.join(', ')}</Text>
                )}
                <Text style={styles.personLine}>
                  {conditions || t(language, 'noConditions')}
                </Text>
                <Text style={styles.personLine}>
                  {meds
                    ? `${meds}${(p.regimen || []).length ? ` (${(p.regimen || []).length})` : ''}`
                    : t(language, 'noMedsListed')}
                </Text>
                {!isActive ? (
                  <Text style={styles.useHint}>{t(language, 'useThisPerson')}</Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}

        {addingPerson ? (
          <View style={styles.addPersonForm}>
            <TextInput
              style={styles.input}
              value={newPersonName}
              onChangeText={setNewPersonName}
              placeholder={t(language, 'addPersonHint')}
              placeholderTextColor={colors.outline}
              autoFocus
            />
            <View style={styles.editActions}>
              <OutlinePillButton
                label={t(language, 'cancel')}
                onPress={() => {
                  setAddingPerson(false);
                  setNewPersonName('');
                }}
                style={styles.editBtn}
              />
              <PillButton
                label={t(language, 'addPerson')}
                onPress={submitNewPerson}
                style={styles.editBtn}
                disabled={!newPersonName.trim()}
              />
            </View>
          </View>
        ) : (
          <Pressable style={styles.addPersonDashed} onPress={() => setAddingPerson(true)}>
            <Ionicons name="add" size={22} color={colors.accent} />
            <Text style={styles.addPersonText}>{t(language, 'addPerson')}</Text>
          </Pressable>
        )}

        <OutlinePillButton
          label={t(language, 'replayOnboarding')}
          onPress={() => resetOnboarding()}
          style={styles.replayBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: {
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.xs,
    paddingBottom: 40,
  },
  replayBtn: { marginTop: spacing.lg, alignSelf: 'stretch' },
  h1: {
    fontSize: 22,
    lineHeight: 28,
    color: colors.onSurface,
    marginBottom: spacing.sm,
    fontFamily: fonts.display,
  },
  h2: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.onSurface,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    fontFamily: fonts.display,
  },
  avatarCard: {
    backgroundColor: colors.foilLight,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.onSurface,
  },
  avatarMeta: { flex: 1 },
  heroName: {
    fontSize: 18,
    lineHeight: 24,
    color: colors.onSurface,
    fontFamily: fonts.display,
  },
  heroMeta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.mutedVariant,
    fontFamily: fonts.body,
  },
  okMsg: {
    marginTop: 8,
    fontSize: 12,
    color: colors.accent,
    fontFamily: fonts.bodyMedium,
  },
  editIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(197, 198, 202, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
  },
  label: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
    marginTop: 4,
    fontFamily: fonts.bodyMedium,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    color: colors.onSurface,
    fontFamily: fonts.body,
  },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  editBtn: { flex: 1, minHeight: 48, paddingVertical: 12 },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  langLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  langLabel: {
    fontSize: 17,
    color: colors.onSurface,
    fontFamily: fonts.body,
  },
  langRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  langValue: {
    fontSize: 15,
    color: colors.mutedVariant,
    fontFamily: fonts.body,
  },
  personCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    marginBottom: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  personCardOn: {
    backgroundColor: colors.bgElevated,
  },
  activeEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primaryCta,
  },
  personInner: { padding: 14, paddingLeft: 16 },
  personTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  personTitle: {
    fontSize: 17,
    color: colors.onSurface,
    fontFamily: fonts.bodyBold,
  },
  activeBadge: {
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  activeBadgeText: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.mutedVariant,
    fontFamily: fonts.bodyBold,
  },
  personLine: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 2,
    fontFamily: fonts.body,
  },
  useHint: {
    marginTop: 8,
    color: colors.accent,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  addPersonDashed: {
    marginTop: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(197, 198, 202, 0.65)',
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPersonText: {
    color: colors.accent,
    fontSize: 17,
    fontFamily: fonts.body,
  },
  addPersonForm: {
    marginTop: 8,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    backgroundColor: colors.silver,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  chipOn: { backgroundColor: colors.accent },
  chipText: { color: colors.graphite, fontSize: 13, fontFamily: fonts.body },
  chipTextOn: { color: colors.onPrimary, fontSize: 13, fontFamily: fonts.bodyMedium },
});
