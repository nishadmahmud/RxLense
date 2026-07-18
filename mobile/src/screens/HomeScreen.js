import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { analyzePrescription, generateBrief } from '../api';
import { useAppState } from '../AppState';
import { t, tabLabel } from '../i18n';
import { colors } from '../theme';
import { disclaimerFor } from '../config';
import { ageBandFromYears } from '../conditions';
import { MedicineModal } from '../components/MedicineModal';
import { MedicineConfirmCard } from '../components/MedicineConfirmCard';

const TAB_KEYS = ['Summary', 'Schedule', 'Interactions', 'Side effects'];

export default function HomeScreen() {
  const {
    language,
    profile,
    activePerson,
    scanSession,
    setScanSession,
    saveScanToHistory,
    saveRegimen,
    addFamily,
  } = useAppState();

  const [step, setStep] = useState('home');
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [error, setError] = useState('');
  const [confirmUnmatched, setConfirmUnmatched] = useState(false);
  const [tab, setTab] = useState('Summary');
  const [guestMode, setGuestMode] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestAge, setGuestAge] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState(profile.activePersonId || 'me');
  const [modalMed, setModalMed] = useState(null);
  const [saveMsg, setSaveMsg] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [prefetchStatus, setPrefetchStatus] = useState('idle'); // idle | loading | ready | error
  const prefetchRef = useRef({
    key: null,
    promise: null,
    result: null,
    error: null,
    gen: 0,
  });
  const briefBusyRef = useRef(false);

  const medicines = scanSession.medicines || [];
  const briefing = scanSession.briefing;
  const needsReviewCount = medicines.filter((m) => m.needsReview).length;
  // API needs confirmUnmatched when any row still needs review
  const confirmFlag = needsReviewCount > 0 ? confirmUnmatched : false;
  // Prefetch optimistically with confirm=true so we don't wait for the checkbox
  const prefetchConfirmFlag = needsReviewCount > 0;
  const canGenerate =
    medicines.length > 0 && (needsReviewCount === 0 || confirmUnmatched) && !loading;

  const patientContext = useMemo(() => {
    if (guestMode) {
      return {
        ageBand: ageBandFromYears(guestAge),
        ageYears: guestAge,
        gender: undefined,
        pregnancyOrBreastfeeding: 'prefer_not',
        conditions: [],
        otherMedsText: '',
        otherMeds: [],
        personLabel: guestName || 'Guest',
      };
    }
    const person = profile.people.find((p) => p.id === selectedPersonId) || activePerson;
    return {
      ageBand: ageBandFromYears(person.ageYears),
      ageYears: person.ageYears,
      gender: person.gender || undefined,
      pregnancyOrBreastfeeding: person.conditions?.some((c) => c.id === 'pregnancy')
        ? 'yes'
        : person.conditions?.some((c) => c.id === 'breastfeeding')
          ? 'yes'
          : 'no',
      conditions: (person.conditions || []).map((c) => c.label),
      otherMedsText: (person.chronicMeds || []).map((m) => m.brandName).join(', '),
      otherMeds: person.chronicMeds || [],
      personLabel: person.name || 'Me',
    };
  }, [guestMode, guestAge, guestName, profile.people, selectedPersonId, activePerson]);

  /** Ignore medexPrices / stamps so price cache writes don't retrigger brief. */
  const briefStableKey = useMemo(() => {
    const medKey = (medicines || []).map((m) => ({
      rawName: m.rawName || '',
      strength: m.strength || '',
      doseLine: m.doseLine || '',
      kbId: m.kbId || null,
      needsReview: !!m.needsReview,
    }));
    const ctxKey = {
      ageBand: patientContext.ageBand,
      ageYears: patientContext.ageYears,
      gender: patientContext.gender,
      pregnancyOrBreastfeeding: patientContext.pregnancyOrBreastfeeding,
      conditions: patientContext.conditions,
      otherMedsText: patientContext.otherMedsText,
      personLabel: patientContext.personLabel,
    };
    return JSON.stringify({
      medKey,
      ctxKey,
      language,
      confirmUnmatched: prefetchConfirmFlag,
    });
  }, [medicines, patientContext, language, prefetchConfirmFlag]);

  function invalidatePrefetch() {
    prefetchRef.current.gen += 1;
    prefetchRef.current = {
      key: null,
      promise: null,
      result: null,
      error: null,
      gen: prefetchRef.current.gen,
    };
    setPrefetchStatus('idle');
  }

  function startBriefPrefetch() {
    if (briefBusyRef.current) return;
    if (step !== 'confirm' || medicines.length === 0) return;

    const key = briefStableKey;
    const cur = prefetchRef.current;
    if (cur.key === key && (cur.result || cur.promise)) return;

    const gen = cur.gen + 1;
    prefetchRef.current = {
      key,
      promise: null,
      result: null,
      error: null,
      gen,
    };
    setPrefetchStatus('loading');

    const promise = generateBrief({
      medicines,
      patientContext,
      language,
      confirmUnmatched: prefetchConfirmFlag,
    })
      .then((data) => {
        if (prefetchRef.current.gen !== gen || prefetchRef.current.key !== key) return null;
        prefetchRef.current.result = data;
        prefetchRef.current.promise = null;
        setPrefetchStatus('ready');
        return data;
      })
      .catch((err) => {
        if (prefetchRef.current.gen !== gen) return null;
        prefetchRef.current.error = err;
        prefetchRef.current.promise = null;
        setPrefetchStatus('error');
        return null;
      });

    prefetchRef.current.promise = promise;
  }

  useEffect(() => {
    if (step !== 'confirm' || medicines.length === 0 || briefBusyRef.current) {
      return undefined;
    }
    const timer = setTimeout(() => startBriefPrefetch(), 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, briefStableKey]);

  async function pickImage(fromCamera) {
    setError('');
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Permission required.');
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setScanSession((s) => ({
      ...s,
      imageUri: asset.uri,
      imageBase64: asset.base64,
    }));
  }

  async function runAnalyze(demoPreset) {
    try {
      setLoading(true);
      setError('');
      setLoadingPhase(t(language, 'loadingRead'));
      setTimeout(() => setLoadingPhase(t(language, 'loadingMatch')), 1000);
      const data = await analyzePrescription({
        imageBase64: scanSession.imageBase64 || undefined,
        language,
        demoPreset: demoPreset || (scanSession.imageBase64 ? undefined : 'throat'),
      });
      setScanSession((s) => ({
        ...s,
        medicines: data.medicines || [],
        briefing: null,
        disclaimer: data.disclaimer || disclaimerFor(language),
        sourceType: data.sourceType || 'prescription',
      }));
      setConfirmUnmatched(false);
      invalidatePrefetch();
      setStep('confirm');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLoadingPhase('');
    }
  }

  async function runBrief(langOverride) {
    const lang = langOverride || language;
    briefBusyRef.current = true;
    const cachedResult = prefetchRef.current.result;
    const cachedPromise = prefetchRef.current.promise;
    const cachedKey = prefetchRef.current.key;
    try {
      setLoading(true);
      setError('');
      setLoadingPhase(langOverride ? t(language, 'regenerating') : t(language, 'loadingBrief'));

      let data = null;
      if (!langOverride && cachedKey === briefStableKey) {
        if (cachedResult) data = cachedResult;
        else if (cachedPromise) data = await cachedPromise;
      }
      if (!data) {
        data = await generateBrief({
          medicines,
          patientContext,
          language: lang,
          confirmUnmatched: confirmFlag || prefetchConfirmFlag,
        });
      }

      // Leave confirm before writing session so prefetch effect cannot fire again
      setStep('results');
      setTab('Summary');
      setScanSession((s) => ({
        ...s,
        medicines: data.medicines || medicines,
        briefing: data.briefing,
        disclaimer: data.disclaimer || disclaimerFor(lang),
        forPersonId: guestMode ? 'guest' : selectedPersonId,
        guest: guestMode ? { name: guestName, ageYears: guestAge } : null,
      }));
      await saveScanToHistory({
        language: lang,
        title: (data.medicines || medicines).map((m) => m.rawName).join(', ').slice(0, 48),
        medicines: data.medicines || medicines,
        briefing: data.briefing,
        disclaimer: data.disclaimer,
        patientContext,
        personId: guestMode ? 'guest' : selectedPersonId,
      });
      prefetchRef.current = {
        key: null,
        promise: null,
        result: null,
        error: null,
        gen: prefetchRef.current.gen + 1,
      };
      setPrefetchStatus('idle');
    } catch (e) {
      setError(e.message);
      setStep('confirm');
    } finally {
      briefBusyRef.current = false;
      setLoading(false);
      setLoadingPhase('');
    }
  }

  function updateMed(index, field, value) {
    setScanSession((s) => ({
      ...s,
      medicines: s.medicines.map((m, i) =>
        i === index ? { ...m, [field]: value, needsReview: false } : m
      ),
    }));
  }

  function normalizeMedName(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/\b(tablet|capsule|syrup|inj|injection|tab|cap)\b/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function namesMatch(a, b) {
    const na = normalizeMedName(a);
    const nb = normalizeMedName(b);
    if (!na || !nb) return false;
    return na === nb || na.includes(nb) || nb.includes(na);
  }

  function timingForMedicine(med) {
    for (const s of briefing?.schedule || []) {
      for (const name of s.medicines || []) {
        if (namesMatch(med.rawName, name)) {
          return { timing: s.timeOfDay || '', mealTiming: s.mealTiming || '' };
        }
      }
    }
    return { timing: '', mealTiming: '' };
  }

  async function onSaveRegimen() {
    const personId = guestMode ? 'me' : selectedPersonId;
    const items = medicines.map((med) => {
      const { timing, mealTiming } = timingForMedicine(med);
      const snap = med.kbSnapshot || null;
      return {
        brandName: med.rawName,
        strength: med.strength || '',
        doseLine: med.doseLine || '',
        timing,
        mealTiming,
        kbId: med.kbId,
        kbSnapshot: snap,
        examplePrices: snap?.examplePrices || med.examplePrices || [],
        why: (snap?.commonUses || []).join(', '),
      };
    });
    await saveRegimen(personId, items);
    setSaveMsg(t(language, 'saved'));
  }

  function renderWhoseStrip() {
    return (
      <View style={styles.whoseBox}>
        <Text style={styles.h2}>{t(language, 'forWhom')}</Text>
        <View style={styles.wrap}>
          {profile.people.map((p) => (
            <Pressable
              key={p.id}
              style={[styles.chip, !guestMode && selectedPersonId === p.id && styles.chipOn]}
              onPress={() => {
                setGuestMode(false);
                setSelectedPersonId(p.id);
              }}
            >
              <Text
                style={[
                  styles.chipText,
                  !guestMode && selectedPersonId === p.id && styles.chipTextOn,
                ]}
              >
                {p.relation === 'me' ? t(language, 'me') : p.name || p.id}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.chip, guestMode && styles.chipOn]}
            onPress={() => setGuestMode(true)}
          >
            <Text style={[styles.chipText, guestMode && styles.chipTextOn]}>
              {t(language, 'guest')}
            </Text>
          </Pressable>
        </View>
        {guestMode && (
          <View>
            <TextInput
              style={styles.input}
              value={guestName}
              onChangeText={setGuestName}
              placeholder={t(language, 'guestName')}
            />
            <TextInput
              style={styles.input}
              value={guestAge}
              onChangeText={setGuestAge}
              keyboardType="number-pad"
              placeholder={t(language, 'yourAge')}
            />
          </View>
        )}
        <TextInput
          style={styles.input}
          value={newPersonName}
          onChangeText={setNewPersonName}
          placeholder={t(language, 'addPerson')}
        />
        <Pressable
          style={styles.secondary}
          onPress={async () => {
            if (!newPersonName.trim()) return;
            await addFamily({ name: newPersonName.trim(), ageYears: '' });
            setNewPersonName('');
          }}
        >
          <Text style={styles.secondaryText}>{t(language, 'addPerson')}</Text>
        </Pressable>
      </View>
    );
  }

  function renderSaveBlock() {
    return (
      <View style={{ marginTop: 8 }}>
        <Pressable style={styles.primary} onPress={onSaveRegimen}>
          <Text style={styles.primaryText}>{t(language, 'saveToMeds')}</Text>
        </Pressable>
        <Text style={styles.tiny}>{t(language, 'saveToMedsHint')}</Text>
        {!!saveMsg && <Text style={styles.meta}>{saveMsg}</Text>}
      </View>
    );
  }

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.hint}>{t(language, 'networkHint')}</Text>
          <Pressable style={styles.secondary} onPress={() => runAnalyze('throat')}>
            <Text style={styles.secondaryText}>{t(language, 'tryDemoShort')}</Text>
          </Pressable>
        </View>
      )}
      {loading && !!loadingPhase && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>{loadingPhase}</Text>
        </View>
      )}

      {step === 'home' && (
        <View>
          <Text style={styles.h1}>{t(language, 'scanTitle')}</Text>
          <Text style={styles.p}>{t(language, 'scanBody')}</Text>
          {scanSession.imageUri ? (
            <Image source={{ uri: scanSession.imageUri }} style={styles.preview} />
          ) : null}
          <View style={styles.row}>
            <Pressable style={styles.secondary} onPress={() => pickImage(true)}>
              <Text style={styles.secondaryText}>{t(language, 'camera')}</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={() => pickImage(false)}>
              <Text style={styles.secondaryText}>{t(language, 'gallery')}</Text>
            </Pressable>
          </View>
          <Pressable
            style={[styles.primary, loading && styles.disabled]}
            disabled={loading}
            onPress={() => runAnalyze()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>
                {scanSession.imageBase64 ? t(language, 'analyze') : t(language, 'tryDemo')}
              </Text>
            )}
          </Pressable>
          <Text style={styles.tiny}>{disclaimerFor(language)}</Text>
        </View>
      )}

      {step === 'confirm' && (
        <View>
          <Text style={styles.h1}>
            {scanSession.sourceType === 'packaging'
              ? t(language, 'confirmPackTitle')
              : t(language, 'confirmTitle')}
          </Text>
          <Text style={styles.p}>
            {scanSession.sourceType === 'packaging'
              ? t(language, 'confirmPackBody')
              : t(language, 'confirmBody')}
          </Text>
          {medicines.map((m, i) => (
            <MedicineConfirmCard
              key={`${m.rawName}-${i}`}
              medicine={m}
              language={language}
              onChange={(field, value) => updateMed(i, field, value)}
              onOpenDetail={setModalMed}
            />
          ))}
          {needsReviewCount > 0 && (
            <Pressable style={styles.checkRow} onPress={() => setConfirmUnmatched((v) => !v)}>
              <View style={[styles.checkbox, confirmUnmatched && styles.checkboxOn]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.h2}>{t(language, 'confirmUnmatched')}</Text>
                <Text style={styles.p}>{t(language, 'confirmUnmatchedHint')}</Text>
              </View>
            </Pressable>
          )}
          {renderWhoseStrip()}
          <Pressable
            style={[styles.primary, !canGenerate && styles.disabled]}
            disabled={!canGenerate}
            onPress={() => runBrief()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>{t(language, 'generate')}</Text>
            )}
          </Pressable>
          {step === 'confirm' && prefetchStatus === 'loading' ? (
            <Text style={styles.prefetchHint}>{t(language, 'prefetchPreparing')}</Text>
          ) : null}
          {step === 'confirm' && prefetchStatus === 'ready' ? (
            <Text style={styles.prefetchHint}>{t(language, 'prefetchReady')}</Text>
          ) : null}
          <Pressable style={styles.link} onPress={() => setStep('home')}>
            <Text style={styles.linkText}>{t(language, 'back')}</Text>
          </Pressable>
        </View>
      )}

      {step === 'results' && briefing && (
        <View>
          <Text style={styles.h1}>{t(language, 'briefingTitle')}</Text>
          <Text style={styles.meta}>
            {t(language, 'forWhom')} {patientContext.personLabel}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
            {TAB_KEYS.map((key) => (
              <Pressable
                key={key}
                style={[styles.tab, tab === key && styles.tabOn]}
                onPress={() => setTab(key)}
              >
                <Text style={tab === key ? styles.tabTextOn : styles.tabText}>
                  {tabLabel(language, key)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {tab === 'Summary' && (
            <View>
              <View style={styles.card}>
                <Text style={styles.h2}>{briefing.summary}</Text>
                <Text style={styles.p}>{briefing.holisticExplanation}</Text>
              </View>
              {renderSaveBlock()}
            </View>
          )}
          {tab === 'Schedule' && (
            <View>
              {(briefing.schedule || []).map((s, i) => (
                <View key={i} style={styles.timelineRow}>
                  <View style={styles.rail}>
                    <View style={styles.dot} />
                    {i < (briefing.schedule || []).length - 1 ? <View style={styles.line} /> : null}
                  </View>
                  <View style={[styles.card, { flex: 1 }]}>
                    <Text style={styles.h2}>{s.timeOfDay}</Text>
                    {(s.medicines || []).map((name) => (
                      <Pressable
                        key={name}
                        onPress={() => {
                          const med = medicines.find((m) => namesMatch(m.rawName, name));
                          setModalMed({
                            brandName: name,
                            ...(med || {}),
                            timing: s.timeOfDay,
                            examplePrices: med?.kbSnapshot?.examplePrices,
                          });
                        }}
                      >
                        <Text style={styles.linkText}>{name}</Text>
                      </Pressable>
                    ))}
                    {!!s.mealTiming && <Text style={styles.meta}>{s.mealTiming}</Text>}
                  </View>
                </View>
              ))}
              {renderSaveBlock()}
            </View>
          )}
          {tab === 'Interactions' &&
            (briefing.interactions || []).map((x, i) => (
              <View key={i} style={styles.card}>
                <Text style={styles.h2}>{x.title}</Text>
                <Text style={styles.p}>{x.detail}</Text>
              </View>
            ))}
          {tab === 'Side effects' && (
            <View style={styles.card}>
              <Text style={styles.h2}>{t(language, 'common')}</Text>
              {(briefing.sideEffects?.common || []).map((x, i) => (
                <Text key={i} style={styles.p}>
                  · {x}
                </Text>
              ))}
              <Text style={[styles.h2, { marginTop: 10 }]}>{t(language, 'seekCare')}</Text>
              {(briefing.sideEffects?.seekCareNow || []).map((x, i) => (
                <Text key={i} style={[styles.p, styles.danger]}>
                  · {x}
                </Text>
              ))}
            </View>
          )}

          <Pressable
            style={styles.secondary}
            onPress={() => {
              setScanSession({
                medicines: [],
                briefing: null,
                disclaimer: '',
                forPersonId: 'me',
                guest: null,
                imageUri: null,
                imageBase64: null,
              });
              setStep('home');
              setSaveMsg('');
            }}
          >
            <Text style={styles.secondaryText}>{t(language, 'newScan')}</Text>
          </Pressable>
          <Text style={styles.tiny}>{scanSession.disclaimer || disclaimerFor(language)}</Text>
        </View>
      )}

      <MedicineModal
        visible={!!modalMed}
        medicine={modalMed}
        language={language}
        onClose={() => setModalMed(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 20, paddingBottom: 48 },
  h1: { fontSize: 24, fontWeight: '750', color: colors.graphite, marginBottom: 8 },
  h2: { fontSize: 16, fontWeight: '700', color: colors.graphite, marginBottom: 6 },
  p: { fontSize: 14, lineHeight: 21, color: colors.muted, marginBottom: 6 },
  tiny: { fontSize: 11, color: colors.muted, marginTop: 12, lineHeight: 16 },
  primary: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: {
    flex: 1,
    backgroundColor: colors.silver,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryText: { color: colors.accentDark, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { backgroundColor: colors.silver, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  chipOn: { backgroundColor: colors.accent },
  chipText: { color: colors.graphite, fontWeight: '600' },
  chipTextOn: { color: '#fff', fontWeight: '600' },
  whoseBox: {
    backgroundColor: colors.foilLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    color: colors.graphite,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  preview: { width: '100%', height: 180, borderRadius: 12, marginVertical: 10 },
  meta: { color: colors.accent, fontSize: 12, marginBottom: 6 },
  warn: { color: '#A65B00', fontSize: 12 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warnBg,
    color: colors.warnText,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
    fontWeight: '700',
    overflow: 'hidden',
    fontSize: 12,
  },
  errorBox: { backgroundColor: colors.errorBg, padding: 10, borderRadius: 8, marginBottom: 10 },
  errorText: { color: colors.errorText, fontWeight: '600' },
  hint: { color: colors.errorText, fontSize: 12, marginTop: 4 },
  loadingBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: colors.silver,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  loadingText: { color: colors.graphite, fontWeight: '600', flex: 1 },
  disabled: { opacity: 0.55 },
  prefetchHint: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 12,
    color: colors.accent,
    lineHeight: 16,
  },
  checkRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.accent,
    marginTop: 4,
  },
  checkboxOn: { backgroundColor: colors.accent },
  tabs: { marginBottom: 10 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.silver,
    marginRight: 8,
  },
  tabOn: { backgroundColor: colors.accent },
  tabText: { color: colors.graphite, fontWeight: '600' },
  tabTextOn: { color: '#fff', fontWeight: '700' },
  timelineRow: { flexDirection: 'row', gap: 10 },
  rail: { width: 14, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, marginTop: 18 },
  line: { flex: 1, width: 2, backgroundColor: colors.silverDeep, marginVertical: 4 },
  link: { alignItems: 'center', marginTop: 12 },
  linkText: { color: colors.accent, fontWeight: '700', marginBottom: 4 },
  danger: { color: colors.errorText, fontWeight: '600' },
});
