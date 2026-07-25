import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, spacing } from '../theme';
import { t } from '../i18n';
import { CONDITION_CATALOG } from '../conditions';
import { searchMedicines } from '../api';
import { useAppState } from '../AppState';
import { emptyMePerson } from '../profileStore';
import { PillButton, OutlinePillButton } from '../components/PillButton';

function ProgressBar({ step }) {
  return (
    <View style={styles.progressRow}>
      {[1, 2, 3].map((n) => (
        <View key={n} style={[styles.progressSeg, step === n && styles.progressSegOn]} />
      ))}
    </View>
  );
}

function BackCircle({ onPress }) {
  return (
    <Pressable style={styles.backCircle} onPress={onPress} hitSlop={8}>
      <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const { profile, persist, language, setLanguage, completeOnboarding } = useAppState();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.people?.[0]?.name || '');
  const [ageYears, setAgeYears] = useState(String(profile.people?.[0]?.ageYears || ''));
  const [gender, setGender] = useState(profile.people?.[0]?.gender || '');
  const [conditions, setConditions] = useState(profile.people?.[0]?.conditions || []);
  const [chronicMeds, setChronicMeds] = useState(profile.people?.[0]?.chronicMeds || []);
  const [condQuery, setCondQuery] = useState('');
  const [medQuery, setMedQuery] = useState('');
  const [medHits, setMedHits] = useState([]);
  const [customCond, setCustomCond] = useState('');
  const [customMed, setCustomMed] = useState('');
  const [searching, setSearching] = useState(false);
  const [addingCustomCond, setAddingCustomCond] = useState(false);

  const filteredConditions = useMemo(() => {
    const q = condQuery.trim().toLowerCase();
    return CONDITION_CATALOG.filter((c) => {
      const label = language === 'bn' ? c.labelBn : c.label;
      return !q || label.toLowerCase().includes(q) || c.label.toLowerCase().includes(q);
    });
  }, [condQuery, language]);

  async function onMedSearch(q) {
    setMedQuery(q);
    if (q.trim().length < 2) {
      setMedHits([]);
      return;
    }
    setSearching(true);
    try {
      const data = await searchMedicines(q.trim());
      setMedHits((data.results || []).slice(0, 8));
    } catch {
      setMedHits([]);
    } finally {
      setSearching(false);
    }
  }

  function toggleCondition(c) {
    const label = language === 'bn' ? c.labelBn : c.label;
    const exists = conditions.some((x) => x.id === c.id);
    if (exists) setConditions(conditions.filter((x) => x.id !== c.id));
    else setConditions([...conditions, { id: c.id, label }]);
  }

  async function saveMeAndFinish() {
    const me = {
      ...emptyMePerson(profile.people?.[0] || {}),
      name: name.trim() || 'Me',
      ageYears: ageYears.trim(),
      gender: gender || '',
      conditions,
      chronicMeds,
    };
    await persist({
      ...profile,
      onboardingDone: true,
      people: [me, ...profile.people.filter((p) => p.id !== 'me')],
      activePersonId: 'me',
    });
  }

  if (step === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.welcomeTop}>
          <View style={styles.langPill}>
            <Pressable onPress={() => setLanguage('en')}>
              <View style={[styles.langSeg, language === 'en' && styles.langSegOn]}>
                <Text style={[styles.langSegText, language === 'en' && styles.langSegTextOn]}>
                  EN
                </Text>
              </View>
            </Pressable>
            <Pressable onPress={() => setLanguage('bn')}>
              <View style={[styles.langSeg, language === 'bn' && styles.langSegOn]}>
                <Text style={[styles.langSegText, language === 'bn' && styles.langSegTextOn]}>
                  বাংলা
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
        <View style={styles.welcomeCenter}>
          <View style={styles.lensRing}>
            <Ionicons name="scan-outline" size={48} color={colors.muted} />
          </View>
          <Text style={styles.brand}>{t(language, 'brand')}</Text>
          <Text style={styles.tag}>{t(language, 'tagline')}</Text>
          <View style={styles.divider} />
        </View>
        <View style={styles.welcomeBottom}>
          <PillButton
            label={t(language, 'getStarted')}
            onPress={() => setStep(1)}
            iconRight={<Ionicons name="arrow-forward" size={18} color="#fff" />}
          />
          <Pressable style={styles.skipLink} onPress={completeOnboarding}>
            <Text style={styles.skipLinkText}>{t(language, 'skip')}</Text>
          </Pressable>
          <Text style={styles.capsDisc}>{t(language, 'disclaimerShort').toUpperCase()}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.stepHeader}>
        <BackCircle onPress={() => setStep(step - 1)} />
        <ProgressBar step={step} />
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.pad}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && (
          <View>
            <Text style={styles.h1}>About you</Text>
            <Text style={styles.sub}>Help us tailor your prescription companion experience.</Text>
            <Text style={styles.capsLabel}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t(language, 'fieldName')}
              placeholderTextColor={colors.foil}
            />
            <Text style={styles.capsLabel}>AGE</Text>
            <TextInput
              style={[styles.input, { maxWidth: 120 }]}
              value={ageYears}
              onChangeText={setAgeYears}
              keyboardType="number-pad"
              placeholder="25"
              placeholderTextColor={colors.foil}
            />
            <Text style={styles.capsLabel}>{t(language, 'yourGender').toUpperCase()}</Text>
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
                    style={[styles.chip, on && styles.chipOn, id === 'prefer_not' && styles.chipWide]}
                    onPress={() => setGender(on ? '' : id)}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {t(language, key)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <PillButton label={t(language, 'next')} onPress={() => setStep(2)} style={{ marginTop: 24 }} />
            <OutlinePillButton
              label={t(language, 'back')}
              onPress={() => setStep(0)}
              style={{ marginTop: 10 }}
            />
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.h1}>{t(language, 'knownConditions')}</Text>
            <Text style={styles.sub}>
              Select any existing medical conditions to help RxLens tailor your medicine insights.
            </Text>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                style={styles.searchInput}
                value={condQuery}
                onChangeText={setCondQuery}
                placeholder={t(language, 'searchConditions')}
                placeholderTextColor={colors.foil}
              />
            </View>
            <Text style={styles.capsLabel}>COMMON CONDITIONS</Text>
            <View style={styles.wrap}>
              {filteredConditions.map((c) => {
                const on = conditions.some((x) => x.id === c.id);
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.chip, on && styles.chipSelected]}
                    onPress={() => toggleCondition(c)}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {language === 'bn' ? c.labelBn : c.label}
                    </Text>
                    {on ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                  </Pressable>
                );
              })}
            </View>
            {addingCustomCond ? (
              <View style={{ marginTop: 8 }}>
                <TextInput
                  style={styles.input}
                  value={customCond}
                  onChangeText={setCustomCond}
                  placeholder={t(language, 'addCustom')}
                  autoFocus
                />
                <PillButton
                  label={t(language, 'addCustom')}
                  onPress={() => {
                    if (!customCond.trim()) return;
                    setConditions([
                      ...conditions,
                      { id: `custom_${Date.now()}`, label: customCond.trim() },
                    ]);
                    setCustomCond('');
                    setAddingCustomCond(false);
                  }}
                />
              </View>
            ) : (
              <Pressable style={styles.dashedAdd} onPress={() => setAddingCustomCond(true)}>
                <View style={styles.plusCircle}>
                  <Ionicons name="add" size={18} color={colors.accent} />
                </View>
                <Text style={styles.dashedText}>{t(language, 'addCustom')}...</Text>
              </Pressable>
            )}
            <View style={styles.footerRow}>
              <OutlinePillButton
                label="SKIP FOR NOW"
                onPress={() => setStep(3)}
                style={{ flex: 1 }}
              />
              <PillButton
                label="CONTINUE"
                onPress={() => setStep(3)}
                style={{ flex: 1.2 }}
                iconRight={<Ionicons name="arrow-forward" size={16} color="#fff" />}
              />
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.h1}>{t(language, 'currentMeds')}</Text>
            <Text style={styles.sub}>
              Adding your current prescriptions helps RxLens check for interactions with new ones.
            </Text>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                style={styles.searchInput}
                value={medQuery}
                onChangeText={onMedSearch}
                placeholder={t(language, 'searchMeds')}
                placeholderTextColor={colors.foil}
              />
            </View>
            {searching ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 8 }} /> : null}
            {medHits.map((m) => {
              const brand = (m.brandNames && m.brandNames[0]) || m.generic;
              return (
                <Pressable
                  key={m.id}
                  style={styles.hitRow}
                  onPress={() => {
                    setChronicMeds([
                      ...chronicMeds,
                      {
                        kbId: m.id,
                        brandName: brand,
                        strength: (m.exampleStrengths && m.exampleStrengths[0]) || '',
                      },
                    ]);
                    setMedQuery('');
                    setMedHits([]);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hitTitle}>{brand}</Text>
                    <Text style={styles.hitSub}>{m.generic}</Text>
                  </View>
                  <View style={styles.plusCircle}>
                    <Ionicons name="add" size={18} color={colors.accent} />
                  </View>
                </Pressable>
              );
            })}
            {chronicMeds.map((m, i) => (
              <View key={`${m.brandName}-${i}`} style={styles.selectedCard}>
                <View style={styles.medIcon}>
                  <Ionicons name="medical-outline" size={18} color={colors.muted} />
                </View>
                <Text style={[styles.hitTitle, { flex: 1 }]}>{m.brandName}</Text>
                <Pressable
                  onPress={() => setChronicMeds(chronicMeds.filter((_, j) => j !== i))}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={22} color={colors.foil} />
                </Pressable>
              </View>
            ))}
            <TextInput
              style={styles.input}
              value={customMed}
              onChangeText={setCustomMed}
              placeholder={t(language, 'addMedCustom')}
              placeholderTextColor={colors.foil}
            />
            <OutlinePillButton
              label={t(language, 'addMedCustom')}
              onPress={() => {
                if (!customMed.trim()) return;
                setChronicMeds([...chronicMeds, { brandName: customMed.trim() }]);
                setCustomMed('');
              }}
            />
            <PillButton
              label="Finish Setup"
              onPress={saveMeAndFinish}
              style={{ marginTop: 20 }}
              iconRight={<Ionicons name="checkmark-circle" size={18} color="#fff" />}
            />
            <OutlinePillButton
              label="Skip for now"
              onPress={completeOnboarding}
              style={{ marginTop: 10 }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  welcomeTop: { alignItems: 'flex-end', paddingHorizontal: spacing.margin, paddingTop: 8 },
  langPill: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  langSeg: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill },
  langSegOn: { backgroundColor: colors.primaryCta },
  langSegText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.accent },
  langSegTextOn: { color: '#fff', fontFamily: fonts.bodyBold },
  welcomeCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  lensRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  brand: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  tag: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: colors.border,
    marginTop: 20,
  },
  welcomeBottom: { paddingHorizontal: spacing.margin, paddingBottom: 16, gap: 8 },
  skipLink: { alignItems: 'center', paddingVertical: 10 },
  skipLinkText: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 15 },
  capsDisc: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.foil,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.margin,
    paddingVertical: 8,
    gap: 12,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center' },
  progressSeg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    maxWidth: 48,
  },
  progressSegOn: { backgroundColor: colors.graphite, flex: 1.6 },
  pad: { paddingHorizontal: spacing.margin, paddingBottom: 48 },
  h1: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.onSurface,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, lineHeight: 19, marginBottom: 14 },
  capsLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.muted,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    color: colors.onSurface,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.onSurface,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  chipWide: { minWidth: '100%' },
  chipOn: { backgroundColor: colors.graphite, borderColor: colors.graphite },
  chipSelected: { backgroundColor: colors.accentDark, borderColor: colors.accentDark },
  chipText: { fontFamily: fonts.bodyMedium, color: colors.onSurface, fontSize: 14 },
  chipTextOn: { color: '#fff' },
  dashedAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 14,
    marginTop: 8,
  },
  plusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoftBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashedText: { fontFamily: fonts.bodyMedium, color: colors.accent, fontSize: 14 },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 28 },
  hitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  hitTitle: { fontFamily: fonts.bodyBold, color: colors.onSurface, fontSize: 15 },
  hitSub: { fontFamily: fonts.body, color: colors.accent, fontSize: 13, marginTop: 2 },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 8,
  },
  medIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
