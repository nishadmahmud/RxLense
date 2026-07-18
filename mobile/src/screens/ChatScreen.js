import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { chatWithGemma } from '../api';
import { useAppState } from '../AppState';
import { t } from '../i18n';
import { colors } from '../theme';

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

export default function ChatScreen() {
  const { language, activePerson, history, scanSession } = useAppState();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function send(text) {
    const content = (text || input).trim();
    if (!content || loading) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const latest = history[0];
      const data = await chatWithGemma({
        messages: next,
        language,
        profileContext: {
          name: activePerson?.name,
          ageYears: activePerson?.ageYears,
          conditions: activePerson?.conditions,
          chronicMeds: activePerson?.chronicMeds,
          regimen: activePerson?.regimen,
        },
        scanContext: scanSession.briefing
          ? {
              medicines: scanSession.medicines,
              briefing: scanSession.briefing,
              personLabel: scanSession.guest?.name || activePerson?.name,
            }
          : latest
            ? {
                medicines: latest.medicines,
                briefing: latest.briefing,
                personLabel: latest.patientContext?.personLabel,
              }
            : null,
      });
      setMessages([...next, { role: 'assistant', content: data.reply || '...' }]);
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: e.message }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.h1}>{t(language, 'chat')}</Text>
        <Text style={styles.welcome}>{t(language, 'chatWelcome')}</Text>
        <View style={styles.chips}>
          <Pressable style={styles.chip} onPress={() => send(t(language, 'chipScanPrompt'))}>
            <Text style={styles.chipText}>{t(language, 'chipScan')}</Text>
          </Pressable>
          <Pressable style={styles.chip} onPress={() => send(t(language, 'chipMedsPrompt'))}>
            <Text style={styles.chipText}>{t(language, 'chipMeds')}</Text>
          </Pressable>
          <Pressable style={styles.chip} onPress={() => send(t(language, 'chipPricePrompt'))}>
            <Text style={styles.chipText}>{t(language, 'chipPrice')}</Text>
          </Pressable>
        </View>
        {messages.map((m, i) => (
          <View
            key={i}
            style={[styles.bubble, m.role === 'user' ? styles.user : styles.bot]}
          >
            {m.role === 'user' ? (
              <Text style={styles.userText}>{m.content}</Text>
            ) : (
              <Markdown style={mdStyles}>{m.content}</Markdown>
            )}
          </View>
        ))}
        {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} /> : null}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={t(language, 'chatPlaceholder')}
          onSubmitEditing={() => send()}
        />
        <Pressable style={styles.send} onPress={() => send()}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 20, paddingBottom: 24 },
  h1: { fontSize: 24, fontWeight: '750', color: colors.graphite },
  welcome: { color: colors.muted, marginVertical: 10, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { backgroundColor: colors.silver, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  chipText: { color: colors.accentDark, fontWeight: '600', fontSize: 12 },
  bubble: { padding: 12, borderRadius: 12, marginBottom: 8, maxWidth: '92%' },
  user: { alignSelf: 'flex-end', backgroundColor: colors.accent },
  bot: { alignSelf: 'flex-start', backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  userText: { color: '#fff' },
  composer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
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
