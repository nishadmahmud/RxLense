import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppState } from '../AppState';
import { t } from '../i18n';
import { colors, fonts, radii, spacing } from '../theme';
import { BriefingTabs } from '../components/BriefingTabs';
import { MedicineModal } from '../components/MedicineModal';
import { DoseTimingIcons } from '../components/DoseTimingIcons';
import { AppChromeHeader } from '../components/AppChromeHeader';
import { PillButton, OutlinePillButton } from '../components/PillButton';

function formatDate(iso, language) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB', {
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

export default function ScansScreen() {
  const navigation = useNavigation();
  const {
    language,
    setLanguage,
    history,
    openHistoryScan,
    removeHistoryEntry,
    setChatHandoff,
  } = useAppState();
  const [selected, setSelected] = useState(null);
  const [modalMed, setModalMed] = useState(null);

  async function toggleLanguage() {
    await setLanguage(language === 'en' ? 'bn' : 'en');
  }

  function confirmRemove(entry) {
    const name = entry.title || t(language, 'scans');
    Alert.alert(
      t(language, 'removeScan'),
      t(language, 'removeScanConfirm').replace('{name}', name),
      [
        { text: t(language, 'close'), style: 'cancel' },
        {
          text: t(language, 'removeScan'),
          style: 'destructive',
          onPress: async () => {
            if (selected?.id === entry.id) setSelected(null);
            await removeHistoryEntry(entry.id);
          },
        },
      ]
    );
  }

  function openOnHome() {
    if (!selected) return;
    openHistoryScan(selected);
    navigation.navigate('Home');
  }

  if (selected) {
    const clinical = selected.clinical || selected.briefing?.clinicalContext;
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.pad}>
          <AppChromeHeader language={language} onToggleLanguage={toggleLanguage} />
          <View style={styles.detailHeader}>
            <Pressable style={styles.back} onPress={() => setSelected(null)} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color={colors.graphite} />
              <Text style={styles.backText}>{t(language, 'back')}</Text>
            </Pressable>
            <Pressable
              style={styles.trashHit}
              hitSlop={10}
              onPress={() => confirmRemove(selected)}
              accessibilityLabel={t(language, 'removeScan')}
            >
              <Ionicons name="trash-outline" size={20} color={colors.mutedVariant} />
            </Pressable>
          </View>

          <Text style={styles.h1}>{selected.title || t(language, 'scans')}</Text>
          <Text style={styles.meta}>{formatDate(selected.createdAt, language)}</Text>

          {(selected.medicines || []).length > 0 && (
            <View style={styles.medBlock}>
              <Text style={styles.sectionLabel}>{t(language, 'medicines')}</Text>
              {(selected.medicines || []).map((m, i) => (
                <Pressable
                  key={`${m.rawName}-${i}`}
                  style={styles.medRow}
                  onPress={() =>
                    setModalMed({
                      ...m,
                      brandName: m.rawName || m.brandName,
                      examplePrices: m.kbSnapshot?.examplePrices,
                    })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{m.rawName || m.brandName}</Text>
                    {!!m.doseLine && <Text style={styles.metaInline}>{m.doseLine}</Text>}
                    <DoseTimingIcons
                      doseLine={m.doseLine}
                      timing={m.timing}
                      language={language}
                      compact
                      size={14}
                    />
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.silverDeep} />
                </Pressable>
              ))}
            </View>
          )}

          {selected.briefing ? (
            <BriefingTabs
              language={language}
              briefing={selected.briefing}
              medicines={selected.medicines || []}
              clinical={clinical}
              onOpenMedicine={setModalMed}
              askBlock={
                <OutlinePillButton
                  label={t(language, 'askAboutRx')}
                  onPress={() => {
                    openHistoryScan(selected);
                    setChatHandoff({ type: 'prompt', text: t(language, 'chipScan') });
                    navigation.navigate('Chat');
                  }}
                  style={{ marginTop: 8, marginBottom: 8 }}
                />
              }
            />
          ) : (
            <Text style={styles.p}>{t(language, 'noBriefing')}</Text>
          )}

          <PillButton
            label={t(language, 'scansOpen')}
            onPress={openOnHome}
            style={{ marginTop: 12 }}
          />

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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.pad}>
        <AppChromeHeader language={language} onToggleLanguage={toggleLanguage} />
        <Text style={styles.h1}>{t(language, 'scans')}</Text>

        {history.length === 0 ? (
          <Text style={styles.p}>{t(language, 'scansEmpty')}</Text>
        ) : (
          <View style={styles.list}>
            {history.map((entry) => {
              const count = (entry.medicines || []).length;
              return (
                <View key={entry.id} style={styles.card}>
                  <Pressable style={styles.cardBody} onPress={() => setSelected(entry)}>
                    <View style={styles.thumb}>
                      <Ionicons name="receipt-outline" size={24} color={colors.mutedVariant} />
                    </View>
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {entry.title || t(language, 'scans')}
                      </Text>
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {t(language, 'medsCount').replace('{n}', String(count))}
                        <Text style={styles.dot}>{'  \u2022  '}</Text>
                        {formatDate(entry.createdAt, language)}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={styles.trashHit}
                    hitSlop={10}
                    onPress={() => confirmRemove(entry)}
                    accessibilityLabel={t(language, 'removeScan')}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.mutedVariant} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: spacing.margin, paddingBottom: 40, paddingTop: 4 },
  h1: {
    fontSize: 22,
    lineHeight: 36,
    fontFamily: fonts.displayBold,
    color: colors.onSurface,
    marginBottom: spacing.md,
    letterSpacing: -0.2,
  },
  p: { fontSize: 15, lineHeight: 22, color: colors.muted, fontFamily: fonts.body },
  meta: {
    fontSize: 15,
    color: colors.mutedVariant,
    fontFamily: fonts.body,
    marginBottom: spacing.md,
  },
  metaInline: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.body,
    marginTop: 2,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },
  backText: {
    color: colors.graphite,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  list: { gap: spacing.md },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 198, 202, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBody: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radii.sm + 4,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, paddingRight: 4 },
  cardTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontFamily: fonts.display,
    color: colors.onSurface,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedVariant,
    fontFamily: fonts.body,
    opacity: 0.9,
  },
  dot: { color: colors.silverDeep },
  trashHit: {
    padding: 8,
    borderRadius: radii.pill,
  },
  medBlock: { marginBottom: spacing.md },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.accent,
    fontFamily: fonts.bodyBold,
    marginBottom: spacing.sm,
  },
  medRow: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  medName: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.onSurface,
  },
});
