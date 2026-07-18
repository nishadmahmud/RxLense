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
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { chatWithGemma, missedDoseCoach } from '../api';
import { useAppState } from '../AppState';
import { ageBandFromYears } from '../conditions';
import { t } from '../i18n';
import { colors } from '../theme';

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
  body: { color: colors.graphite, fontSize: 15, lineHeight: 22 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  strong: { fontWeight: '700', color: colors.graphite },
  bullet_list: { marginBottom: 6 },
  ordered_list: { marginBottom: 6 },
  list_item: { marginBottom: 4 },
  bullet_list_icon: { color: colors.accent, marginLeft: 0 },
  heading1: { fontSize: 18, fontWeight: '750', color: colors.graphite, marginBottom: 6 },
  heading2: { fontSize: 16, fontWeight: '700', color: colors.graphite, marginBottom: 4 },
  heading3: { fontSize: 15, fontWeight: '700', color: colors.accentDark, marginBottom: 4 },
  link: { color: colors.accent },
  code_inline: {
    backgroundColor: colors.silver,
    color: colors.accentDark,
    borderRadius: 4,
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

function formatCoachMarkdown(coach) {
  if (!coach) return '...';
  const lines = [`**${coach.title || 'Missed dose'}**`, ''];
  if ((coach.whatToKnow || []).length) {
    lines.push('**What to know**');
    for (const x of coach.whatToKnow) lines.push(`- ${x}`);
    lines.push('');
  }
  if ((coach.options || []).length) {
    lines.push('**Options to consider**');
    for (const x of coach.options) lines.push(`- ${x}`);
    lines.push('');
  }
  if ((coach.seekCareIf || []).length) {
    lines.push('**Seek care if**');
    for (const x of coach.seekCareIf) lines.push(`- ${x}`);
    lines.push('');
  }
  if (coach.disclaimer) lines.push(`_${coach.disclaimer}_`);
  return lines.join('\n');
}

function ChatThinkingBubble({ language }) {
  const [statusIdx, setStatusIdx] = useState(0);
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const statusTimer = setInterval(() => {
      setStatusIdx((i) => {
        if (i >= STATUS_KEYS.length - 1) return i;
        return i + 1;
      });
    }, STATUS_STEP_MS);
    const dotTimer = setInterval(() => {
      setDots((d) => (d % 3) + 1);
    }, 450);
    return () => {
      clearInterval(statusTimer);
      clearInterval(dotTimer);
    };
  }, []);

  const label = t(language, STATUS_KEYS[statusIdx]);
  return (
    <View style={[styles.bubble, styles.bot, styles.thinkingBubble]}>
      <Text style={styles.thinkingText}>
        {label}
        {'.'.repeat(dots)}
      </Text>
    </View>
  );
}

export default function ChatScreen() {
  const { language, activePerson, history, scanSession } = useAppState();
  const inputRef = useRef(null);
  const [messages, setMessages] = useState(() => [
    welcomeMessage(language, activePerson?.name),
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [pricePicker, setPricePicker] = useState(false);
  const [missedStep, setMissedStep] = useState(null);
  const [missedMed, setMissedMed] = useState(null);
  const [placeholder, setPlaceholder] = useState(null);
  const [pendingImage, setPendingImage] = useState(null); // { uri, base64 }
  const [attachError, setAttachError] = useState('');

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

  function startNewChat() {
    Speech.stop();
    setSpeakingId(null);
    setMessages([welcomeMessage(language, activePerson?.name)]);
    setInput('');
    setLoading(false);
    setPricePicker(false);
    setMissedStep(null);
    setMissedMed(null);
    setPlaceholder(null);
    setPendingImage(null);
    setAttachError('');
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

  function toggleSpeak(index, text) {
    if (speakingId === index) {
      Speech.stop();
      setSpeakingId(null);
      return;
    }
    Speech.stop();
    setSpeakingId(index);
    Speech.speak(text.replace(/[*_#`]/g, ''), {
      language: language === 'bn' ? 'bn-BD' : 'en-US',
      onDone: () => setSpeakingId(null),
      onStopped: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
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
    const userLine = `${medLabel} — ${whenLabel}`;
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
      const md = formatCoachMarkdown(data.coach);
      setMessages([...nextUi, { role: 'assistant', content: md }]);
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

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Text style={styles.h1}>{t(language, 'chat')}</Text>
          <Pressable style={styles.newChatBtn} onPress={startNewChat}>
            <Text style={styles.newChatText}>{t(language, 'newChat')}</Text>
          </Pressable>
        </View>
        <Text style={styles.welcome}>{t(language, 'chatSubtitle')}</Text>
        <View style={styles.chips}>
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
        </View>
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
                <Text style={styles.userText}>{m.content}</Text>
              </View>
            ) : (
              <View>
                <Markdown style={mdStyles}>{m.content}</Markdown>
                {!m.local ? (
                  <Pressable
                    style={styles.speakBtn}
                    onPress={() => toggleSpeak(i, m.content)}
                    disabled={loading}
                  >
                    <Text style={styles.speakText}>
                      {speakingId === i ? t(language, 'stopSpeak') : t(language, 'speak')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        ))}
        {pricePicker && (
          <View style={styles.chips}>
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
          <View style={styles.chips}>
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
          <View style={styles.chips}>
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
      <View style={styles.composer}>
        <Pressable
          style={[styles.attachBtn, loading && styles.attachDisabled]}
          disabled={loading}
          onPress={() => pickChatImage(false)}
          onLongPress={() => pickChatImage(true)}
        >
          <Text style={styles.attachText}>{t(language, 'chatAttachImage')}</Text>
        </Pressable>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={placeholder || t(language, 'chatPlaceholder')}
          editable={!loading}
          onSubmitEditing={() => send()}
        />
        <Pressable
          style={styles.send}
          onPress={() => send()}
          disabled={loading || (!input.trim() && !pendingImage)}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 20, paddingBottom: 24 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  h1: { fontSize: 24, fontWeight: '750', color: colors.graphite, flex: 1 },
  newChatBtn: {
    backgroundColor: colors.silver,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newChatText: { color: colors.accentDark, fontWeight: '700', fontSize: 12 },
  welcome: { color: colors.muted, marginVertical: 10, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { backgroundColor: colors.silver, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  chipAccent: { backgroundColor: colors.accent },
  chipText: { color: colors.accentDark, fontWeight: '600', fontSize: 12 },
  chipTextOn: { color: '#fff', fontWeight: '600', fontSize: 12 },
  bubble: { padding: 12, borderRadius: 12, marginBottom: 8, maxWidth: '92%' },
  user: { alignSelf: 'flex-end', backgroundColor: colors.accent },
  bot: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thinkingBubble: { paddingVertical: 10 },
  thinkingText: { color: colors.muted, fontSize: 14, fontStyle: 'italic' },
  userText: { color: '#fff' },
  bubbleImage: {
    width: 180,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.silver,
  },
  speakBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.silver,
  },
  speakText: { color: colors.accentDark, fontWeight: '700', fontSize: 11 },
  attachError: { color: colors.errorText, fontSize: 12, marginTop: 4 },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pendingThumb: { width: 44, height: 44, borderRadius: 6, backgroundColor: colors.silver },
  pendingLabel: { flex: 1, color: colors.muted, fontSize: 13 },
  pendingRemove: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  composer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  attachBtn: {
    backgroundColor: colors.silver,
    borderRadius: 10,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  attachDisabled: { opacity: 0.5 },
  attachText: { color: colors.accentDark, fontWeight: '700', fontSize: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.graphite,
  },
  send: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  sendText: { color: '#fff', fontWeight: '700' },
});
