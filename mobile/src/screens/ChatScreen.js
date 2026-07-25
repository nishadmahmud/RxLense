import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { chatWithGemma, missedDoseCoach } from '../api';
import { useAppState } from '../AppState';
import { ageBandFromYears } from '../conditions';
import { t } from '../i18n';
import { colors, fonts, radii, spacing } from '../theme';
import { stripEmDashes } from '../stripEmDashes';
import { AppChromeHeader } from '../components/AppChromeHeader';

const STATUS_KEYS = [
  'chatStatusLooking',
  'chatStatusChecking',
  'chatStatusDrafting',
  'chatStatusThinking',
];

const STATUS_STEP_MS = 5000;

const WHEN_OPTIONS = [
  ['last_night', 'missedDoseLastNight'],
  ['this_morning', 'missedDoseThisMorning'],
  ['earlier_today', 'missedDoseEarlierToday'],
  ['unsure', 'missedDoseUnsure'],
];

const mdStyles = StyleSheet.create({
  body: { color: colors.onSurface, fontSize: 15, lineHeight: 22, fontFamily: fonts.body },
  paragraph: { marginTop: 0, marginBottom: 8 },
  strong: { fontFamily: fonts.bodyBold, color: colors.onSurface },
  bullet_list: { marginBottom: 6 },
  ordered_list: { marginBottom: 6 },
  list_item: { marginBottom: 4 },
  bullet_list_icon: { color: colors.accent, marginLeft: 0 },
  heading1: {
    fontSize: 18,
    color: colors.onSurface,
    marginBottom: 6,
    fontFamily: fonts.display,
  },
  heading2: {
    fontSize: 16,
    color: colors.onSurface,
    marginBottom: 4,
    fontFamily: fonts.display,
  },
  heading3: {
    fontSize: 15,
    color: colors.accentDark,
    marginBottom: 4,
    fontFamily: fonts.bodyBold,
  },
  link: { color: colors.accent },
  code_inline: {
    backgroundColor: colors.surfaceLow,
    color: colors.accentDark,
    borderRadius: radii.sm,
    paddingHorizontal: 4,
  },
});

function welcomeMessage(language, name) {
  const trimmed = (name || '').trim();
  const text = trimmed
    ? t(language, 'chatWelcomeNamed').replace('{name}', trimmed)
    : t(language, 'chatWelcomeAnon');
  return { role: 'assistant', content: text, local: true };
}

function formatCoachMarkdown(coach, language) {
  if (!coach) return '...';
  const lines = [`**${coach.title || 'Missed dose'}**`, ''];
  if ((coach.whatToKnow || []).length) {
    lines.push(`**${t(language, 'coachWhatToKnow')}**`);
    for (const x of coach.whatToKnow) lines.push(`- ${x}`);
    lines.push('');
  }
  if ((coach.options || []).length) {
    lines.push(`**${t(language, 'coachOptions')}**`);
    for (const x of coach.options) lines.push(`- ${x}`);
    lines.push('');
  }
  if ((coach.seekCareIf || []).length) {
    lines.push(`**${t(language, 'coachSeekCare')}**`);
    for (const x of coach.seekCareIf) lines.push(`- ${x}`);
    lines.push('');
  }
  if (coach.disclaimer) lines.push(`_${coach.disclaimer}_`);
  return lines.join('\n');
}

function ClinicalNoteCard({ text }) {
  if (!text) return null;
  return (
    <View style={styles.clinicalNote}>
      <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
      <View style={styles.clinicalNoteBody}>
        <Text style={styles.clinicalNoteLabel}>Clinical Note</Text>
        <Text style={styles.clinicalNoteText}>{text}</Text>
      </View>
    </View>
  );
}

function ChatThinkingBubble({ language }) {
  const [statusIdx, setStatusIdx] = useState(0);
  const [dots, setDots] = useState(1);
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const statusTimer = setInterval(() => {
      setStatusIdx((i) => (i >= STATUS_KEYS.length - 1 ? i : i + 1));
    }, STATUS_STEP_MS);
    const dotTimer = setInterval(() => setDots((d) => (d % 3) + 1), 450);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => {
      clearInterval(statusTimer);
      clearInterval(dotTimer);
      loop.stop();
    };
  }, [pulse]);

  const label = t(language, STATUS_KEYS[statusIdx]);
  return (
    <Animated.View style={[styles.bubble, styles.bot, styles.thinkingBubble, { opacity: pulse }]}>
      <Text style={styles.thinkingText}>
        {label}
        {'.'.repeat(dots)}
      </Text>
    </Animated.View>
  );
}

export default function ChatScreen() {
  const {
    language,
    setLanguage,
    activePerson,
    history,
    scanSession,
    chatHandoff,
    clearChatHandoff,
  } = useAppState();
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const [messages, setMessages] = useState(() => [
    welcomeMessage(language, activePerson?.name),
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pricePicker, setPricePicker] = useState(false);
  const [missedStep, setMissedStep] = useState(null);
  const [missedMed, setMissedMed] = useState(null);
  const [placeholder, setPlaceholder] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [attachError, setAttachError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);

  const hasUserMessage = messages.some((m) => m.role === 'user' && !m.local);

  const priceMedNames = useMemo(() => {
    const names = [];
    const seen = new Set();
    for (const m of activePerson?.regimen || []) {
      const n = (m.brandName || '').trim();
      if (n && !seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        names.push(n);
      }
    }
    for (const m of scanSession?.medicines || []) {
      const n = (m.rawName || m.brandName || '').trim();
      if (n && !seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        names.push(n);
      }
    }
    return names;
  }, [activePerson?.regimen, scanSession?.medicines]);

  const coachMeds = useMemo(() => {
    const list = [];
    const seen = new Set();
    for (const m of activePerson?.regimen || []) {
      const n = (m.brandName || '').trim();
      if (!n || seen.has(n.toLowerCase())) continue;
      seen.add(n.toLowerCase());
      list.push({
        brandName: n,
        rawName: n,
        strength: m.strength || '',
        doseLine: m.doseLine || m.timing || '',
      });
    }
    for (const m of scanSession?.medicines || []) {
      const n = (m.rawName || m.brandName || '').trim();
      if (!n || seen.has(n.toLowerCase())) continue;
      seen.add(n.toLowerCase());
      list.push({
        brandName: n,
        rawName: n,
        strength: m.strength || '',
        doseLine: m.doseLine || '',
      });
    }
    return list;
  }, [activePerson?.regimen, scanSession?.medicines]);

  function scrollToEnd() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
    });
  }

  useEffect(() => {
    scrollToEnd();
  }, [messages, loading, missedStep, pricePicker]);

  useEffect(() => {
    if (!chatHandoff) return;
    const handoff = chatHandoff;
    clearChatHandoff();
    if (handoff.type === 'prompt' && handoff.text) {
      setShowSuggestions(false);
      send(handoff.text);
    } else if (handoff.type === 'missedDose') {
      setShowSuggestions(false);
      if (handoff.medicine) {
        pickMissedMed({
          brandName: handoff.medicine.brandName || handoff.medicine.rawName,
          rawName: handoff.medicine.rawName || handoff.medicine.brandName,
          strength: handoff.medicine.strength || '',
          doseLine: handoff.medicine.doseLine || '',
        });
      } else {
        openMissedDose();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatHandoff]);

  function startNewChat() {
    setMessages([welcomeMessage(language, activePerson?.name)]);
    setInput('');
    setLoading(false);
    setPricePicker(false);
    setMissedStep(null);
    setMissedMed(null);
    setPlaceholder(null);
    setPendingImage(null);
    setAttachError('');
    setShowSuggestions(true);
    setAttachMenuOpen(false);
  }

  function scanContextForApi() {
    const latest = history[0];
    if (scanSession.briefing) {
      return {
        medicines: scanSession.medicines,
        briefing: scanSession.briefing,
        personLabel: scanSession.guest?.name || activePerson?.name,
      };
    }
    if (latest) {
      return {
        medicines: latest.medicines,
        briefing: latest.briefing,
        personLabel: latest.patientContext?.personLabel,
      };
    }
    return null;
  }

  function profileContextForApi() {
    return {
      name: activePerson?.name,
      ageYears: activePerson?.ageYears,
      gender: activePerson?.gender || undefined,
      conditions: activePerson?.conditions,
      chronicMeds: activePerson?.chronicMeds,
      regimen: activePerson?.regimen,
    };
  }

  function patientContextForApi() {
    return {
      ageBand: ageBandFromYears(activePerson?.ageYears),
      ageYears: activePerson?.ageYears,
      gender: activePerson?.gender || undefined,
      conditions: (activePerson?.conditions || []).map((c) => c.label || c),
      otherMedsText: (activePerson?.chronicMeds || []).map((m) => m.brandName).join(', '),
      personLabel: activePerson?.name || 'Me',
    };
  }

  async function pickChatImage(fromCamera) {
    if (loading) return;
    setAttachMenuOpen(false);
    setAttachError('');
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setAttachError(t(language, 'chatPermissionImage'));
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.65 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.65 });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const asset = result.assets[0];
    setPendingImage({ uri: asset.uri, base64: asset.base64 });
  }

  async function send(text) {
    const typed = (text || input).trim();
    const content = typed || (pendingImage ? t(language, 'chatImageOnly') : '');
    if ((!content && !pendingImage) || loading) return;
    const imageBase64 = pendingImage?.base64;
    const imageUri = pendingImage?.uri;
    setPricePicker(false);
    setMissedStep(null);
    setMissedMed(null);
    setPlaceholder(null);
    setPendingImage(null);
    setAttachError('');
    setShowSuggestions(false);
    const userMsg = {
      role: 'user',
      content,
      imageUri: imageUri || undefined,
    };
    const nextUi = [...messages, userMsg];
    setMessages(nextUi);
    setInput('');
    setLoading(true);
    const forApi = nextUi
      .filter((m) => !m.local)
      .map(({ role, content: c }) => ({ role, content: c }));
    try {
      const data = await chatWithGemma({
        messages: forApi,
        language,
        profileContext: profileContextForApi(),
        scanContext: scanContextForApi(),
        imageBase64: imageBase64 || undefined,
      });
      setMessages([...nextUi, { role: 'assistant', content: data.reply || '...' }]);
    } catch (e) {
      setMessages([...nextUi, { role: 'assistant', content: e.message }]);
    } finally {
      setLoading(false);
    }
  }

  function openPricePicker() {
    if (loading) return;
    setMissedStep(null);
    setPricePicker(true);
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: t(language, 'priceAsk'), local: true },
    ]);
  }

  function openMissedDose() {
    if (loading) return;
    setPricePicker(false);
    if (!coachMeds.length) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t(language, 'missedDoseNoMeds'), local: true },
      ]);
      return;
    }
    setMissedStep('med');
    setMissedMed(null);
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: t(language, 'missedDoseAsk'), local: true },
    ]);
  }

  function pickMissedMed(med) {
    setMissedMed(med);
    setMissedStep('when');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: med.brandName || med.rawName, local: true },
      { role: 'assistant', content: t(language, 'missedDoseWhen'), local: true },
    ]);
  }

  async function pickMissedWhen(whenKey, whenLabel) {
    if (!missedMed || loading) return;
    const medLabel = missedMed.brandName || missedMed.rawName;
    const userLine = `${medLabel}  -  ${whenLabel}`;
    const nextUi = [...messages, { role: 'user', content: userLine }];
    setMessages(nextUi);
    setMissedStep(null);
    setLoading(true);
    try {
      const data = await missedDoseCoach({
        medicine: missedMed,
        whenMissed: whenKey,
        patientContext: patientContextForApi(),
        language,
      });
      const md = formatCoachMarkdown(data.coach, language);
      const note =
        data.coach?.disclaimer ||
        (data.coach?.seekCareIf || [])[0] ||
        null;
      setMessages([
        ...nextUi,
        { role: 'assistant', content: md, clinicalNote: note || undefined },
      ]);
    } catch (e) {
      setMessages([...nextUi, { role: 'assistant', content: e.message }]);
    } finally {
      setMissedMed(null);
      setLoading(false);
    }
  }

  function pickPriceMed(name) {
    send(t(language, 'priceForOne').replace('{name}', name));
  }

  function pickPriceAll() {
    send(t(language, 'priceForAll'));
  }

  function pickTypeOwn() {
    setPlaceholder(t(language, 'priceTypeHint'));
    setTimeout(() => inputRef.current?.focus?.(), 100);
  }

  const showStarterChips = showSuggestions && !hasUserMessage;
  const canSend = !loading && (!!input.trim() || !!pendingImage);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={styles.chromePad}>
          <AppChromeHeader
            language={language}
            onToggleLanguage={() => setLanguage(language === 'en' ? 'bn' : 'en')}
          />
        </View>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.pad}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
        >
          <View style={styles.headerRow}>
            <Text style={styles.h1}>{t(language, 'chat')}</Text>
            <Pressable style={styles.newChatBtn} onPress={startNewChat} hitSlop={8}>
              <Text style={styles.newChatText}>{t(language, 'newChat')}</Text>
            </Pressable>
          </View>
          <Text style={styles.welcome}>{t(language, 'chatSubtitle')}</Text>

          {showStarterChips ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              style={styles.chipsScroll}
            >
              <Pressable style={styles.chip} onPress={() => send(t(language, 'chipScan'))}>
                <Text style={styles.chipText}>{t(language, 'chipScan')}</Text>
              </Pressable>
              <Pressable style={styles.chip} onPress={() => send(t(language, 'chipMeds'))}>
                <Text style={styles.chipText}>{t(language, 'chipMeds')}</Text>
              </Pressable>
              <Pressable style={styles.chip} onPress={openPricePicker}>
                <Text style={styles.chipText}>{t(language, 'chipPrice')}</Text>
              </Pressable>
              <Pressable style={styles.chip} onPress={openMissedDose}>
                <Text style={styles.chipText}>{t(language, 'chipMissedDose')}</Text>
              </Pressable>
            </ScrollView>
          ) : (
            <Pressable style={styles.suggestToggle} onPress={() => setShowSuggestions((v) => !v)}>
              <Text style={styles.suggestToggleText}>
                {showSuggestions ? '▾ ' : '▸ '}
                {t(language, 'suggestions')}
              </Text>
            </Pressable>
          )}
          {showSuggestions && hasUserMessage ? (
            <View style={styles.chipsWrap}>
              <Pressable style={styles.chip} onPress={() => send(t(language, 'chipScan'))}>
                <Text style={styles.chipText}>{t(language, 'chipScan')}</Text>
              </Pressable>
              <Pressable style={styles.chip} onPress={openMissedDose}>
                <Text style={styles.chipText}>{t(language, 'chipMissedDose')}</Text>
              </Pressable>
              <Pressable style={styles.chip} onPress={openPricePicker}>
                <Text style={styles.chipText}>{t(language, 'chipPrice')}</Text>
              </Pressable>
            </View>
          ) : null}

          {messages.map((m, i) => (
            <View
              key={i}
              style={[styles.bubble, m.role === 'user' ? styles.user : styles.bot]}
            >
              {m.role === 'user' ? (
                <View>
                  {!!m.imageUri && (
                    <Image source={{ uri: m.imageUri }} style={styles.bubbleImage} />
                  )}
                  <Text style={styles.userText}>{stripEmDashes(m.content)}</Text>
                </View>
              ) : (
                <View>
                  <Markdown style={mdStyles}>{stripEmDashes(m.content)}</Markdown>
                  {!!m.clinicalNote && (
                    <ClinicalNoteCard text={stripEmDashes(m.clinicalNote)} />
                  )}
                </View>
              )}
            </View>
          ))}
          {pricePicker && (
            <View style={styles.chipsWrap}>
              {priceMedNames.map((name) => (
                <Pressable key={name} style={styles.chip} onPress={() => pickPriceMed(name)}>
                  <Text style={styles.chipText}>{name}</Text>
                </Pressable>
              ))}
              <Pressable style={[styles.chip, styles.chipAccent]} onPress={pickPriceAll}>
                <Text style={styles.chipTextOn}>{t(language, 'priceAll')}</Text>
              </Pressable>
              <Pressable style={styles.chip} onPress={pickTypeOwn}>
                <Text style={styles.chipText}>{t(language, 'priceTypeOwn')}</Text>
              </Pressable>
            </View>
          )}
          {missedStep === 'med' && (
            <View style={styles.chipsWrap}>
              {coachMeds.map((med) => {
                const label = med.brandName || med.rawName;
                return (
                  <Pressable key={label} style={styles.chip} onPress={() => pickMissedMed(med)}>
                    <Text style={styles.chipText}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {missedStep === 'when' && (
            <View style={styles.chipsWrap}>
              {WHEN_OPTIONS.map(([key, i18nKey]) => (
                <Pressable
                  key={key}
                  style={[styles.chip, styles.chipAccent]}
                  onPress={() => pickMissedWhen(key, t(language, i18nKey))}
                >
                  <Text style={styles.chipTextOn}>{t(language, i18nKey)}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {loading ? <ChatThinkingBubble language={language} /> : null}
          {!!attachError && <Text style={styles.attachError}>{attachError}</Text>}
        </ScrollView>
        {pendingImage ? (
          <View style={styles.pendingRow}>
            <Image source={{ uri: pendingImage.uri }} style={styles.pendingThumb} />
            <Text style={styles.pendingLabel}>{t(language, 'chatImageAttached')}</Text>
            <Pressable onPress={() => setPendingImage(null)}>
              <Text style={styles.pendingRemove}>{t(language, 'chatRemoveImage')}</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.composerWrap}>
          {attachMenuOpen ? (
            <View style={styles.attachBubble}>
              <Pressable
                style={styles.attachBubbleItem}
                disabled={loading}
                onPress={() => pickChatImage(true)}
                accessibilityLabel={t(language, 'chatAttachCamera')}
              >
                <Ionicons name="camera-outline" size={18} color={colors.onSurface} />
                <Text style={styles.attachBubbleText}>{t(language, 'chatAttachCamera')}</Text>
              </Pressable>
              <View style={styles.attachBubbleDivider} />
              <Pressable
                style={styles.attachBubbleItem}
                disabled={loading}
                onPress={() => pickChatImage(false)}
                accessibilityLabel={t(language, 'chatAttachGallery')}
              >
                <Ionicons name="images-outline" size={18} color={colors.onSurface} />
                <Text style={styles.attachBubbleText}>{t(language, 'chatAttachGallery')}</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.composer}>
            <Pressable
              style={[styles.attachIconBtn, loading && styles.attachDisabled]}
              disabled={loading}
              onPress={() => setAttachMenuOpen((v) => !v)}
              accessibilityLabel={t(language, 'chatAttachImage')}
            >
              <Ionicons
                name={attachMenuOpen ? 'close' : 'add'}
                size={22}
                color={colors.onSurface}
              />
            </Pressable>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={input}
              onChangeText={(txt) => {
                if (attachMenuOpen) setAttachMenuOpen(false);
                setInput(txt);
              }}
              placeholder={placeholder || t(language, 'chatPlaceholder')}
              placeholderTextColor={colors.outline}
              editable={!loading}
              onSubmitEditing={() => send()}
              onFocus={() => setAttachMenuOpen(false)}
            />
            <Pressable
              style={[styles.send, !canSend && styles.sendDisabled]}
              onPress={() => {
                setAttachMenuOpen(false);
                send();
              }}
              disabled={!canSend}
              accessibilityLabel={t(language, 'send')}
            >
              <Ionicons name="paper-plane" size={18} color={colors.onPrimary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  chromePad: { paddingHorizontal: spacing.margin, paddingTop: spacing.xs },
  pad: { paddingHorizontal: spacing.margin, paddingBottom: 24, paddingTop: 4 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: spacing.sm,
  },
  h1: {
    fontSize: 20,
    lineHeight: 26,
    color: colors.onSurface,
    flex: 1,
    fontFamily: fonts.display,
  },
  newChatBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceLow,
  },
  newChatText: {
    color: colors.accent,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.04,
  },
  welcome: {
    color: colors.muted,
    marginBottom: spacing.sm,
    lineHeight: 20,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  chipsScroll: { marginBottom: spacing.sm, marginHorizontal: -spacing.margin },
  chips: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.margin,
    paddingBottom: 4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(197, 198, 202, 0.5)',
  },
  chipAccent: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.mutedVariant,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  chipTextOn: {
    color: colors.onPrimary,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  suggestToggle: { marginBottom: 8 },
  suggestToggleText: {
    color: colors.accent,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  bubble: {
    padding: 14,
    borderRadius: radii.md,
    marginBottom: 10,
    maxWidth: '90%',
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: colors.userBubble,
    borderTopRightRadius: 4,
  },
  bot: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: 'rgba(197, 198, 202, 0.2)',
    borderTopLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  clinicalNote: {
    marginTop: 10,
    backgroundColor: colors.surfaceLow,
    padding: 12,
    borderRadius: radii.sm + 4,
    borderWidth: 1,
    borderColor: 'rgba(197, 198, 202, 0.3)',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  clinicalNoteBody: { flex: 1 },
  clinicalNoteLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.onSurface,
    marginBottom: 4,
  },
  clinicalNoteText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedVariant,
  },
  thinkingBubble: { paddingVertical: 12 },
  thinkingText: {
    color: colors.muted,
    fontSize: 14,
    fontStyle: 'italic',
    fontFamily: fonts.body,
  },
  userText: {
    color: colors.accentDark,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleImage: {
    width: 180,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.silver,
  },
  attachError: {
    color: colors.errorText,
    fontSize: 12,
    marginTop: 4,
    fontFamily: fonts.body,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.margin,
    paddingTop: 8,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(197, 198, 202, 0.35)',
  },
  pendingThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: colors.silver,
  },
  pendingLabel: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    fontFamily: fonts.body,
  },
  pendingRemove: {
    color: colors.accent,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  composerWrap: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.margin,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(197, 198, 202, 0.2)',
    position: 'relative',
  },
  attachBubble: {
    position: 'absolute',
    left: spacing.margin,
    bottom: '100%',
    marginBottom: 8,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 198, 202, 0.25)',
    minWidth: 168,
    zIndex: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  attachBubbleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  attachBubbleDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  attachBubbleText: {
    color: colors.onSurface,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  composer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: 'rgba(197, 198, 202, 0.35)',
    borderRadius: 24,
    padding: 6,
  },
  attachIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachDisabled: { opacity: 0.5 },
  input: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: colors.onSurface,
    fontFamily: fonts.body,
    fontSize: 15,
    maxHeight: 100,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryCta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
});
