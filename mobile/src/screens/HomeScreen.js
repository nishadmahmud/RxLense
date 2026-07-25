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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { analyzePrescription, generateBrief } from '../api';
import { useAppState } from '../AppState';
import { t } from '../i18n';
import { colors, fonts, radii, spacing } from '../theme';
import { disclaimerFor } from '../config';
import { ageBandFromYears } from '../conditions';
import { MedicineModal } from '../components/MedicineModal';
import { MedicineConfirmCard } from '../components/MedicineConfirmCard';
import { ClinicalPrescriptionCard } from '../components/ClinicalPrescriptionCard';
import { BriefingTabs } from '../components/BriefingTabs';
import { AppChromeHeader } from '../components/AppChromeHeader';
import { PillButton, OutlinePillButton } from '../components/PillButton';
import { formatDoseSlots, parseDoseTiming, slotsToTimeOfDay } from '../doseTiming';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation();
  const {
    language,
    setLanguage,
    profile,
    activePerson,
    scanSession,
    setScanSession,
    saveScanToHistory,
    saveRegimen,
    addFamily,
    history,
    openHistoryScan,
    setChatHandoff,
  } = useAppState();

  const [step, setStep] = useState('home');
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [error, setError] = useState('');
  const [confirmUnmatched, setConfirmUnmatched] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestAge, setGuestAge] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState(profile.activePersonId || 'me');
  const [modalMed, setModalMed] = useState(null);
  const [saveMsg, setSaveMsg] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [addingPerson, setAddingPerson] = useState(false);
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
  const clinical = scanSession.clinical || briefing?.clinicalContext || null;
  const recentScans = (history || []).slice(0, 5);
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
      clinical,
      language,
      confirmUnmatched: prefetchConfirmFlag,
    });
  }, [medicines, patientContext, clinical, language, prefetchConfirmFlag]);

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
      clinicalContext: clinical || undefined,
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

  useEffect(() => {
    if (scanSession.openResults && scanSession.briefing) {
      setStep('results');
      setScanSession((s) => ({ ...s, openResults: false }));
    }
  }, [scanSession.openResults, scanSession.briefing, setScanSession]);

  // Tab bar Home while already on Home (e.g. briefing open) — return to landing
  useEffect(() => {
    const unsub = navigation.addListener('tabPress', () => {
      setStep('home');
      setModalMed(null);
      setSaveMsg('');
      setError('');
      setConfirmUnmatched(false);
      setLoading(false);
      setLoadingPhase('');
    });
    return unsub;
  }, [navigation]);

  async function pickImage(fromCamera) {
    setError('');
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(t(language, 'permissionRequired'));
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
        clinical: data.clinical || null,
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
          clinicalContext: clinical || undefined,
        });
      }

      // Leave confirm before writing session so prefetch effect cannot fire again
      setStep('results');
      const title = (data.medicines || medicines).map((m) => m.rawName).join(', ').slice(0, 48);
      const saved = await saveScanToHistory({
        language: lang,
        title,
        medicines: data.medicines || medicines,
        briefing: data.briefing,
        disclaimer: data.disclaimer,
        patientContext,
        personId: guestMode ? 'guest' : selectedPersonId,
        clinical: data.briefing?.clinicalContext || clinical || null,
      });
      setScanSession((s) => ({
        ...s,
        medicines: data.medicines || medicines,
        briefing: data.briefing,
        disclaimer: data.disclaimer || disclaimerFor(lang),
        clinical: data.briefing?.clinicalContext || clinical || s.clinical,
        forPersonId: guestMode ? 'guest' : selectedPersonId,
        guest: guestMode ? { name: guestName, ageYears: guestAge } : null,
        scanId: saved?.id || null,
        scanTitle: title,
        scannedAt: saved?.createdAt || new Date().toISOString(),
      }));
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
    const slots = [];
    const meals = [];
    let timingSource = 'rx';
    for (const s of briefing?.schedule || []) {
      for (const name of s.medicines || []) {
        if (namesMatch(med.rawName, name)) {
          if (s.timeOfDay && !slots.includes(s.timeOfDay)) slots.push(s.timeOfDay);
          if (s.mealTiming && !meals.includes(s.mealTiming)) meals.push(s.mealTiming);
          if (s.timingSource === 'assumed') timingSource = 'assumed';
        }
      }
    }
    if (!slots.length) {
      const fromDose = slotsToTimeOfDay(parseDoseTiming(med.doseLine));
      for (const s of fromDose) {
        if (!slots.includes(s)) slots.push(s);
      }
    }
    return {
      timing:
        slots.join(' · ') ||
        formatDoseSlots(med.doseLine, {
          morning: t(language, 'slotMorning'),
          noon: t(language, 'slotNoon'),
          night: t(language, 'slotNight'),
        }),
      mealTiming: meals[0] || '',
      timingSource,
    };
  }

  async function onSaveRegimen() {
    if (guestMode) return;
    const personId = selectedPersonId;
    const scanId = scanSession.scanId || `local-${Date.now()}`;
    const scanTitle =
      scanSession.scanTitle ||
      medicines.map((m) => m.rawName).join(', ').slice(0, 48) ||
      t(language, 'scans');
    const scannedAt = scanSession.scannedAt || new Date().toISOString();
    const items = medicines.map((med) => {
      const { timing, mealTiming, timingSource } = timingForMedicine(med);
      const snap = med.kbSnapshot || null;
      return {
        brandName: med.rawName,
        strength: med.strength || '',
        doseLine: med.doseLine || '',
        timing,
        mealTiming,
        timingSource,
        scanId,
        scanTitle,
        scannedAt,
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
        {!guestMode && (
          <View>
            {addingPerson ? (
              <View>
                <TextInput
                  style={styles.input}
                  value={newPersonName}
                  onChangeText={setNewPersonName}
                  placeholder={t(language, 'addPersonHint')}
                  autoFocus
                />
                <View style={styles.wrap}>
                  <Pressable
                    style={styles.secondary}
                    onPress={async () => {
                      if (!newPersonName.trim()) return;
                      await addFamily({ name: newPersonName.trim(), ageYears: '' });
                      setNewPersonName('');
                      setAddingPerson(false);
                    }}
                  >
                    <Text style={styles.secondaryText}>{t(language, 'addPerson')}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.secondary, { marginLeft: 8 }]}
                    onPress={() => {
                      setAddingPerson(false);
                      setNewPersonName('');
                    }}
                  >
                    <Text style={styles.secondaryText}>{t(language, 'close')}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.secondary} onPress={() => setAddingPerson(true)}>
                <Text style={styles.secondaryText}>{t(language, 'addPerson')}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  }

  function renderSaveBlock() {
    if (guestMode) {
      return (
        <View style={{ marginTop: spacing.xs }}>
          <Text style={styles.tiny}>{t(language, 'guestNoSave')}</Text>
        </View>
      );
    }
    return (
      <View style={{ marginTop: spacing.xs }}>
        <PillButton label={t(language, 'saveToMeds')} onPress={onSaveRegimen} />
        <Text style={styles.tiny}>{t(language, 'saveToMedsHint')}</Text>
        {!!saveMsg && <Text style={styles.meta}>{saveMsg}</Text>}
      </View>
    );
  }

  function renderAskBlock() {
    return (
      <OutlinePillButton
        label={t(language, 'askAboutRx')}
        style={{ marginTop: spacing.xs }}
        onPress={() => {
          setChatHandoff({ type: 'prompt', text: t(language, 'chipScan') });
          navigation.navigate('Chat');
        }}
      />
    );
  }

  function formatScanDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.pad}
        keyboardShouldPersistTaps="handled"
      >
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.hint}>{t(language, 'networkHint')}</Text>
            <OutlinePillButton
              label={t(language, 'tryDemoShort')}
              onPress={() => runAnalyze('throat')}
              style={{ marginTop: spacing.sm, alignSelf: 'flex-start', minHeight: 44, paddingVertical: 10 }}
            />
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
            <AppChromeHeader
              language={language}
              onToggleLanguage={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            />
            <Text style={styles.scanTitle}>{t(language, 'scanTitle')}</Text>
            <Text style={styles.scanBody}>{t(language, 'scanBody')}</Text>
            {scanSession.imageUri ? (
              <Image source={{ uri: scanSession.imageUri }} style={styles.preview} />
            ) : null}
            <View style={styles.row}>
              <OutlinePillButton
                label={t(language, 'camera')}
                onPress={() => pickImage(true)}
                style={styles.halfBtn}
                iconLeft={<Ionicons name="camera-outline" size={18} color={colors.onSurface} />}
              />
              <OutlinePillButton
                label={t(language, 'gallery')}
                onPress={() => pickImage(false)}
                style={styles.halfBtn}
                iconLeft={<Ionicons name="images-outline" size={18} color={colors.onSurface} />}
              />
            </View>
            {scanSession.imageBase64 ? (
              <PillButton
                label={t(language, 'analyze')}
                onPress={() => runAnalyze()}
                loading={loading}
                disabled={loading}
                style={{ marginTop: spacing.sm }}
              />
            ) : (
              <Pressable
                style={styles.demoLink}
                onPress={() => runAnalyze('throat')}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <Text style={styles.demoLinkText}>{t(language, 'tryDemo')}</Text>
                )}
              </Pressable>
            )}
            <View style={styles.peachBox}>
              <Text style={styles.peachText}>{disclaimerFor(language)}</Text>
            </View>

            {recentScans.length > 0 && (
              <View style={styles.recentSection}>
                <View style={styles.recentHeader}>
                  <Text style={styles.h2}>{t(language, 'history')}</Text>
                  <Pressable onPress={() => navigation.navigate('Scans')} hitSlop={8}>
                    <Text style={styles.viewAll}>{t(language, 'viewAll')}</Text>
                  </Pressable>
                </View>
                {recentScans.map((entry) => (
                  <Pressable
                    key={entry.id}
                    style={styles.recentCard}
                    onPress={() => {
                      openHistoryScan(entry);
                      setStep('results');
                    }}
                  >
                    <View style={styles.recentThumb}>
                      <Ionicons name="document-text-outline" size={22} color={colors.mutedVariant} />
                    </View>
                    <View style={styles.recentText}>
                      <Text style={styles.recentTitle} numberOfLines={1}>
                        {entry.title || t(language, 'scans')}
                      </Text>
                      <Text style={styles.recentMeta} numberOfLines={1}>
                        {t(language, 'medsCount').replace(
                          '{n}',
                          String((entry.medicines || []).length)
                        )}
                        {entry.createdAt ? (
                          <>
                            <Text style={styles.recentDot}>{'  \u2022  '}</Text>
                            {formatScanDate(entry.createdAt)}
                          </>
                        ) : null}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.silverDeep} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {step === 'confirm' && (
          <View>
            {scanSession.sourceType === 'packaging' ? (
              <View style={styles.packBadge}>
                <Text style={styles.packBadgeText}>{t(language, 'packDetected')}</Text>
              </View>
            ) : null}
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
            {needsReviewCount > 0 ? (
              <Text style={styles.lowConfStrip}>
                {t(language, 'lowConfidenceStrip').replace('{n}', String(needsReviewCount))}
              </Text>
            ) : null}
            <ClinicalPrescriptionCard clinical={clinical} language={language} />
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
                <View style={[styles.checkbox, confirmUnmatched && styles.checkboxOn]}>
                  {confirmUnmatched ? (
                    <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.h2}>{t(language, 'confirmUnmatched')}</Text>
                  <Text style={styles.p}>{t(language, 'confirmUnmatchedHint')}</Text>
                </View>
              </Pressable>
            )}
            {renderWhoseStrip()}
            <PillButton
              label={t(language, 'generate')}
              onPress={() => runBrief()}
              loading={loading}
              disabled={!canGenerate}
              style={{ marginTop: spacing.xs }}
            />
            {prefetchStatus === 'loading' ? (
              <Text style={styles.prefetchHint}>{t(language, 'prefetchPreparing')}</Text>
            ) : null}
            {prefetchStatus === 'ready' ? (
              <Text style={styles.prefetchHint}>{t(language, 'prefetchReady')}</Text>
            ) : null}
            {prefetchStatus === 'error' ? (
              <Text style={[styles.prefetchHint, { color: colors.errorText }]}>
                {t(language, 'prefetchFailed')}
              </Text>
            ) : null}
            <Pressable style={styles.link} onPress={() => setStep('home')}>
              <Text style={styles.linkText}>{t(language, 'back')}</Text>
            </Pressable>
          </View>
        )}

        {step === 'results' && briefing && (
          <View>
            <Text style={styles.forLabel}>
              {t(language, 'forWhom')}{' '}
              <Text style={styles.forName}>{patientContext.personLabel}</Text>
            </Text>
            <Text style={styles.h1}>{t(language, 'briefingTitle')}</Text>
            {!!scanSession.scannedAt && (
              <View style={styles.dateChip}>
                <Ionicons name="calendar-outline" size={14} color={colors.accent} />
                <Text style={styles.dateChipText}>{formatScanDate(scanSession.scannedAt)}</Text>
              </View>
            )}
            <BriefingTabs
              language={language}
              briefing={briefing}
              medicines={medicines}
              clinical={clinical}
              onOpenMedicine={setModalMed}
              saveBlock={renderSaveBlock()}
              askBlock={renderAskBlock()}
            />

            <OutlinePillButton
              label={t(language, 'newScan')}
              style={{ marginTop: spacing.md }}
              onPress={() => {
                setScanSession({
                  medicines: [],
                  briefing: null,
                  disclaimer: '',
                  forPersonId: 'me',
                  guest: null,
                  imageUri: null,
                  imageBase64: null,
                  sourceType: 'prescription',
                  clinical: null,
                  openResults: false,
                });
                setStep('home');
                setSaveMsg('');
                setConfirmUnmatched(false);
                invalidatePrefetch();
              }}
            />
            <View style={styles.peachBox}>
              <Text style={styles.peachText}>
                {scanSession.disclaimer || disclaimerFor(language)}
              </Text>
            </View>
          </View>
        )}

        <MedicineModal
          visible={!!modalMed}
          medicine={modalMed}
          language={language}
          onClose={() => setModalMed(null)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: {
    paddingHorizontal: spacing.margin,
    paddingTop: 4,
    paddingBottom: 48,
  },
  scanTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: fonts.displayBold,
    color: colors.onSurface,
    marginBottom: spacing.xs,
    letterSpacing: -0.2,
  },
  scanBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    fontFamily: fonts.body,
    marginBottom: spacing.sm,
  },
  h1: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: fonts.displayBold,
    color: colors.onSurface,
    marginBottom: spacing.xs,
    letterSpacing: -0.2,
  },
  h2: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.onSurface,
    marginBottom: 4,
  },
  p: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    fontFamily: fonts.body,
    marginBottom: 4,
  },
  tiny: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.sm,
    lineHeight: 17,
    fontFamily: fonts.body,
  },
  forLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.muted,
    marginBottom: 4,
  },
  forName: {
    fontFamily: fonts.bodyBold,
    color: colors.accent,
  },
  dateChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentSoftBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    marginBottom: spacing.md,
  },
  dateChipText: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
    color: colors.accentDark,
  },
  packBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    marginBottom: spacing.sm,
  },
  packBadgeText: {
    color: colors.onPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  lowConfStrip: {
    backgroundColor: colors.warnBg,
    color: colors.warnText,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    overflow: 'hidden',
  },
  // Kept for renderWhoseStrip add-person actions (above rewrite boundary)
  secondary: {
    backgroundColor: colors.silver,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  secondaryText: {
    color: colors.accentDark,
    fontFamily: fonts.bodyBold,
  },
  row: { flexDirection: 'row', gap: 10 },
  halfBtn: { flex: 1, paddingHorizontal: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    backgroundColor: colors.silver,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipOn: { backgroundColor: colors.accent },
  chipText: { color: colors.graphite, fontFamily: fonts.bodyBold },
  chipTextOn: { color: '#fff', fontFamily: fonts.bodyBold },
  whoseBox: {
    backgroundColor: colors.foilLight,
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    color: colors.graphite,
    fontFamily: fonts.body,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
  },
  demoLink: { alignItems: 'center', marginTop: spacing.sm, paddingVertical: 4 },
  demoLinkText: {
    color: colors.accent,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  peachBox: {
    backgroundColor: colors.peachBg,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.peachBorder,
  },
  peachText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.peachText,
    fontFamily: fonts.body,
  },
  meta: {
    color: colors.accent,
    fontSize: 13,
    marginTop: 6,
    fontFamily: fonts.bodyMedium,
  },
  recentSection: { marginTop: spacing.xl },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  viewAll: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.accent,
  },
  recentCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(197, 198, 202, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recentThumb: {
    width: 48,
    height: 48,
    borderRadius: radii.sm + 4,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentText: { flex: 1 },
  recentTitle: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.onSurface,
    marginBottom: 2,
  },
  recentMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedVariant,
    fontFamily: fonts.body,
  },
  recentDot: { color: colors.silverDeep },
  errorBox: {
    backgroundColor: colors.errorBg,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  errorText: { color: colors.errorText, fontFamily: fonts.bodyBold },
  hint: {
    color: colors.errorText,
    fontSize: 12,
    marginTop: 4,
    fontFamily: fonts.body,
  },
  loadingBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: colors.silver,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  loadingText: {
    color: colors.graphite,
    fontFamily: fonts.bodyBold,
    flex: 1,
  },
  prefetchHint: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 12,
    color: colors.accent,
    lineHeight: 16,
    fontFamily: fonts.body,
  },
  checkRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  link: { alignItems: 'center', marginTop: spacing.md },
  linkText: {
    color: colors.accent,
    fontFamily: fonts.bodyBold,
    marginBottom: 4,
  },
});
