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
import { SilverHeroArt } from '../components/SilverHeroArt';
import { colors } from '../theme';
import { t } from '../i18n';
import { CONDITION_CATALOG } from '../conditions';
import { searchMedicines } from '../api';
import { useAppState } from '../AppState';
import { emptyMePerson } from '../profileStore';

export default function OnboardingScreen() {
  const { profile, persist, language, setLanguage, completeOnboarding } = useAppState();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.people?.[0]?.name || '');
  const [ageYears, setAgeYears] = useState(String(profile.people?.[0]?.ageYears || ''));
  const [conditions, setConditions] = useState(profile.people?.[0]?.conditions || []);
  const [chronicMeds, setChronicMeds] = useState(profile.people?.[0]?.chronicMeds || []);
  const [condQuery, setCondQuery] = useState('');
  const [medQuery, setMedQuery] = useState('');
  const [medHits, setMedHits] = useState([]);
  const [customCond, setCustomCond] = useState('');
  const [customMed, setCustomMed] = useState('');
  const [searching, setSearching] = useState(false);

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
      <View style={styles.root}>
        <StatusBar style="light" />
        <SilverHeroArt />
        <SafeAreaView style={styles.body} edges={['bottom']}>
          <Pressable style={styles.skipTop} onPress={completeOnboarding}>
            <Text style={styles.skipTopText}>{t(language, 'skip')}</Text>
          </Pressable>
          <Text style={styles.brand}>{t(language, 'brand')}</Text>
          <Text style={styles.tag}>{t(language, 'tagline')}</Text>
          <Text style={styles.disc}>{t(language, 'disclaimerShort')}</Text>
          <Pressable style={styles.primary} onPress={() => setStep(1)}>
            <Text style={styles.primaryText}>{t(language, 'getStarted')}</Text>
          </Pressable>
          <Pressable
            style={styles.lang}
            onPress={() => setLanguage(language === 'en' ? 'bn' : 'en')}
          >
            <Text style={styles.langText}>{language === 'en' ? 'বাংলা' : 'EN'}</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={completeOnboarding}>
          <Text style={styles.skipTopText}>{t(language, 'skip')}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View>
            <Text style={styles.h1}>{t(language, 'yourName')}</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />
            <Text style={styles.label}>{t(language, 'yourAge')}</Text>
            <TextInput
              style={styles.input}
              value={ageYears}
              onChangeText={setAgeYears}
              keyboardType="number-pad"
              placeholder="25"
            />
            <Pressable style={styles.primary} onPress={() => setStep(2)}>
              <Text style={styles.primaryText}>{t(language, 'next')}</Text>
            </Pressable>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.h1}>{t(language, 'knownConditions')}</Text>
            <TextInput
              style={styles.input}
              value={condQuery}
              onChangeText={setCondQuery}
              placeholder={t(language, 'searchConditions')}
            />
            <View style={styles.wrap}>
              {filteredConditions.map((c) => {
                const on = conditions.some((x) => x.id === c.id);
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => toggleCondition(c)}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {language === 'bn' ? c.labelBn : c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              style={styles.input}
              value={customCond}
              onChangeText={setCustomCond}
              placeholder={t(language, 'addCustom')}
            />
            <Pressable
              style={styles.secondary}
              onPress={() => {
                if (!customCond.trim()) return;
                setConditions([
                  ...conditions,
                  { id: `custom_${Date.now()}`, label: customCond.trim() },
                ]);
                setCustomCond('');
              }}
            >
              <Text style={styles.secondaryText}>{t(language, 'addCustom')}</Text>
            </Pressable>
            <Pressable style={styles.primary} onPress={() => setStep(3)}>
              <Text style={styles.primaryText}>{t(language, 'next')}</Text>
            </Pressable>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.h1}>{t(language, 'currentMeds')}</Text>
            <TextInput
              style={styles.input}
              value={medQuery}
              onChangeText={onMedSearch}
              placeholder={t(language, 'searchMeds')}
            />
            {searching ? <ActivityIndicator color={colors.accent} /> : null}
            {medHits.map((m) => (
              <Pressable
                key={m.id}
                style={styles.hit}
                onPress={() => {
                  setChronicMeds([
                    ...chronicMeds,
                    {
                      kbId: m.id,
                      brandName: (m.brandNames && m.brandNames[0]) || m.generic,
                      strength: (m.exampleStrengths && m.exampleStrengths[0]) || '',
                    },
                  ]);
                  setMedQuery('');
                  setMedHits([]);
                }}
              >
                <Text style={styles.hitTitle}>
                  {(m.brandNames && m.brandNames[0]) || m.generic}
                </Text>
                <Text style={styles.hitSub}>{m.generic}</Text>
              </Pressable>
            ))}
            {chronicMeds.map((m, i) => (
              <View key={`${m.brandName}-${i}`} style={styles.medRow}>
                <Text style={styles.medName}>{m.brandName}</Text>
                <Pressable onPress={() => setChronicMeds(chronicMeds.filter((_, j) => j !== i))}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>
            ))}
            <TextInput
              style={styles.input}
              value={customMed}
              onChangeText={setCustomMed}
              placeholder={t(language, 'addMedCustom')}
            />
            <Pressable
              style={styles.secondary}
              onPress={() => {
                if (!customMed.trim()) return;
                setChronicMeds([...chronicMeds, { brandName: customMed.trim() }]);
                setCustomMed('');
              }}
            >
              <Text style={styles.secondaryText}>{t(language, 'addMedCustom')}</Text>
            </Pressable>
            <Pressable style={styles.primary} onPress={saveMeAndFinish}>
              <Text style={styles.primaryText}>{t(language, 'finish')}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, padding: 24, backgroundColor: colors.bg },
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: 'center',
  },
  skipTop: { alignSelf: 'flex-end', marginBottom: 8 },
  skipTopText: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  pad: { padding: 20, paddingBottom: 48 },
  brand: { fontSize: 34, fontWeight: '800', color: colors.graphite, marginTop: 8 },
  tag: { fontSize: 16, color: colors.muted, marginTop: 6, marginBottom: 16 },
  disc: { fontSize: 14, lineHeight: 21, color: colors.muted, marginBottom: 20 },
  h1: { fontSize: 24, fontWeight: '750', color: colors.graphite, marginBottom: 12 },
  label: { fontSize: 13, color: colors.muted, marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: colors.graphite,
  },
  primary: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: {
    backgroundColor: colors.silver,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryText: { color: colors.accentDark, fontWeight: '700' },
  lang: { alignItems: 'center', marginTop: 14 },
  langText: { color: colors.accent, fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    backgroundColor: colors.silver,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipOn: { backgroundColor: colors.accent },
  chipText: { color: colors.graphite, fontSize: 13 },
  chipTextOn: { color: '#fff', fontSize: 13 },
  hit: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.bgElevated,
  },
  hitTitle: { fontWeight: '700', color: colors.graphite },
  hitSub: { color: colors.muted, fontSize: 12 },
  medRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.silver,
  },
  medName: { color: colors.graphite, fontWeight: '600' },
  remove: { color: colors.errorText },
});
