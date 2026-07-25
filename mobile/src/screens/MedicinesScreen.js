import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppState } from '../AppState';
import { t } from '../i18n';
import { colors, fonts, radii, spacing } from '../theme';
import { MedicineModal } from '../components/MedicineModal';
import { DoseTimingIcons } from '../components/DoseTimingIcons';
import { AppChromeHeader } from '../components/AppChromeHeader';
import { PillButton } from '../components/PillButton';
import { formatDoseSlots, groupMedsByTimeOfDay } from '../doseTiming';

const SLOT_ICONS = {
  Morning: 'sunny-outline',
  Afternoon: 'partly-sunny-outline',
  Night: 'moon-outline',
};

const SLOT_LABEL_KEYS = {
  Morning: 'slotMorning',
  Afternoon: 'slotNoon',
  Night: 'slotNight',
};

function formatDate(iso, language) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function groupByScan(regimen) {
  const map = new Map();
  (regimen || []).forEach((m, index) => {
    const key = m.scanId || '__ungrouped__';
    if (!map.has(key)) {
      map.set(key, {
        scanId: key,
        scanTitle: m.scanTitle || '',
        scannedAt: m.scannedAt || m.updatedAt || '',
        items: [],
      });
    }
    const g = map.get(key);
    if (!g.scanTitle && m.scanTitle) g.scanTitle = m.scanTitle;
    if (!g.scannedAt && (m.scannedAt || m.updatedAt)) g.scannedAt = m.scannedAt || m.updatedAt;
    g.items.push({ ...m, _index: index });
  });
  return Array.from(map.values()).sort((a, b) => {
    const ta = a.scannedAt ? new Date(a.scannedAt).getTime() : 0;
    const tb = b.scannedAt ? new Date(b.scannedAt).getTime() : 0;
    return tb - ta;
  });
}

function MedRow({ m, language, onOpen, onMissed, onRemove, showTimingSquares }) {
  return (
    <View style={styles.medRow}>
      <Pressable style={{ flex: 1 }} onPress={() => onOpen(m)}>
        <View style={styles.medTop}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.medName}>{m.brandName}</Text>
            {!!m.doseLine && <Text style={styles.medDose}>{m.doseLine}</Text>}
            {!!m.strength && !m.doseLine && (
              <Text style={styles.medDose}>
                {t(language, 'strength')}: {m.strength}
              </Text>
            )}
            {!!m.timing && !m.doseLine && (
              <Text style={styles.medDose}>
                {t(language, 'timing')}: {m.timing}
              </Text>
            )}
            {m.timingSource === 'assumed' && (
              <Text style={styles.assumed}>{t(language, 'timingAssumed')}</Text>
            )}
          </View>
          {showTimingSquares ? (
            <DoseTimingIcons
              doseLine={m.doseLine}
              language={language}
              compact
              size={14}
              style={{ marginTop: 2 }}
            />
          ) : null}
        </View>
        <Pressable onPress={() => onMissed(m)} hitSlop={6} style={styles.missedLink}>
          <Text style={styles.missedText}>{t(language, 'missedDoseShort')}</Text>
        </Pressable>
      </Pressable>
      <Pressable
        style={styles.removeBtn}
        hitSlop={10}
        onPress={() => onRemove(m._index, m.brandName)}
        accessibilityLabel={t(language, 'removeMed')}
      >
        <Ionicons name="trash-outline" size={18} color={colors.mutedVariant} />
      </Pressable>
    </View>
  );
}

export default function MedicinesScreen() {
  const navigation = useNavigation();
  const {
    language,
    setLanguage,
    activePerson,
    profile,
    removeRegimenItem,
    setChatHandoff,
  } = useAppState();
  const [modalMed, setModalMed] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const person = activePerson || profile.people[0];
  const regimen = person?.regimen || [];
  const groups = useMemo(() => groupByScan(regimen), [regimen]);

  async function toggleLanguage() {
    await setLanguage(language === 'en' ? 'bn' : 'en');
  }

  function openMissedDose(med) {
    setModalMed(null);
    setChatHandoff({
      type: 'missedDose',
      medicine: {
        brandName: med.brandName || med.rawName,
        rawName: med.rawName || med.brandName,
        strength: med.strength || '',
        doseLine: med.doseLine || '',
      },
    });
    navigation.navigate('Chat');
  }

  function confirmRemove(index, brandName) {
    Alert.alert(
      t(language, 'removeMed'),
      t(language, 'removeMedConfirm').replace('{name}', brandName || ''),
      [
        { text: t(language, 'close'), style: 'cancel' },
        {
          text: t(language, 'removeMed'),
          style: 'destructive',
          onPress: async () => {
            if (modalMed && regimen[index] === modalMed) setModalMed(null);
            await removeRegimenItem(person.id, index);
          },
        },
      ]
    );
  }

  function toggleGroup(scanId) {
    setCollapsed((c) => ({ ...c, [scanId]: !c[scanId] }));
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.pad}>
        <AppChromeHeader language={language} onToggleLanguage={toggleLanguage} />

        <Text style={styles.h1}>{t(language, 'myRegimen')}</Text>
        <Text style={styles.personName}>{person?.name || t(language, 'me')}</Text>

        {regimen.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.p}>{t(language, 'myMedsEmpty')}</Text>
            <PillButton
              label={t(language, 'scanPrescriptionCta')}
              onPress={() => navigation.navigate('Home')}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : (
          groups.map((group, gi) => {
            const isCollapsed = !!collapsed[group.scanId];
            const title =
              group.scanId === '__ungrouped__'
                ? t(language, 'ungroupedScan')
                : group.scanTitle || t(language, 'scans');
            const scheduleRows = groupMedsByTimeOfDay(group.items);
            const unslotted = group.items.filter((m) => {
              const label = formatDoseSlots(m.doseLine) || m.timing;
              return !label;
            });

            return (
              <View
                key={group.scanId}
                style={[styles.group, gi > 0 && isCollapsed && styles.groupDim]}
              >
                <Pressable style={styles.groupHeader} onPress={() => toggleGroup(group.scanId)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    <View style={styles.groupMetaRow}>
                      <View style={styles.countPill}>
                        <Text style={styles.countPillText}>
                          {t(language, 'medsCount').replace('{n}', String(group.items.length))}
                        </Text>
                      </View>
                      {!!group.scannedAt && (
                        <Text style={styles.groupDate}>{formatDate(group.scannedAt, language)}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.chevronCircle}>
                    <Ionicons
                      name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                      size={18}
                      color={colors.graphite}
                    />
                  </View>
                </Pressable>

                {!isCollapsed && (
                  <View style={styles.groupBody}>
                    {scheduleRows.map((row) => (
                      <View key={`${group.scanId}-${row.timeOfDay}`} style={styles.slotBlock}>
                        <View style={styles.slotHeader}>
                          <View style={styles.slotIconWrap}>
                            <Ionicons
                              name={SLOT_ICONS[row.timeOfDay] || 'time-outline'}
                              size={16}
                              color={colors.accentDark}
                            />
                          </View>
                          <Text style={styles.slotLabel}>
                            {t(language, SLOT_LABEL_KEYS[row.timeOfDay] || 'slotMorning')}
                          </Text>
                        </View>
                        <View style={styles.slotMeds}>
                          {row.medicines.map((m, mi) => (
                            <View
                              key={`${m.brandName}-${m._index}`}
                              style={[styles.slotMedItem, mi > 0 && styles.slotMedDivider]}
                            >
                              <MedRow
                                m={m}
                                language={language}
                                onOpen={setModalMed}
                                onMissed={openMissedDose}
                                onRemove={confirmRemove}
                                showTimingSquares
                              />
                            </View>
                          ))}
                          {!!row.mealTiming && (
                            <Text style={styles.mealNote}>{row.mealTiming}</Text>
                          )}
                        </View>
                      </View>
                    ))}

                    {unslotted.map((m) => (
                      <View key={`u-${m._index}`} style={styles.slotBlock}>
                        <MedRow
                          m={m}
                          language={language}
                          onOpen={setModalMed}
                          onMissed={openMissedDose}
                          onRemove={confirmRemove}
                          showTimingSquares={false}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
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
  pad: { paddingHorizontal: spacing.margin, paddingBottom: 40, paddingTop: 4 },
  h1: {
    fontSize: 22,
    lineHeight: 36,
    fontFamily: fonts.displayBold,
    color: colors.onSurface,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  personName: {
    fontSize: 17,
    lineHeight: 24,
    fontFamily: fonts.body,
    color: colors.accent,
    marginBottom: spacing.lg,
  },
  p: { color: colors.muted, lineHeight: 22, fontSize: 15, fontFamily: fonts.body },
  emptyWrap: { marginTop: spacing.xs },
  group: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  groupDim: { opacity: 0.72 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.foilLight,
    padding: spacing.md,
  },
  groupTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontFamily: fonts.bodyBold,
    color: colors.onSurface,
  },
  groupMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  countPill: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  countPillText: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: fonts.bodyBold,
    color: colors.accent,
  },
  groupDate: {
    fontSize: 14,
    color: colors.outline,
    fontFamily: fonts.body,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  groupBody: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  slotBlock: {
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  slotIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(179, 209, 253, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotLabel: {
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: fonts.bodyBold,
    color: colors.accent,
  },
  slotMeds: { paddingLeft: 8 },
  slotMedItem: { paddingTop: 0 },
  slotMedDivider: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceHigh,
  },
  medRow: { flexDirection: 'row', alignItems: 'flex-start' },
  medTop: { flexDirection: 'row', alignItems: 'flex-start' },
  medName: {
    fontSize: 17,
    lineHeight: 24,
    fontFamily: fonts.bodyMedium,
    color: colors.onSurface,
  },
  medDose: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.accent,
    fontFamily: fonts.body,
    marginTop: 2,
  },
  assumed: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
    fontFamily: fonts.body,
  },
  missedLink: { marginTop: 6, alignSelf: 'flex-start' },
  missedText: {
    color: colors.accent,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontFamily: fonts.bodyBold,
    textDecorationLine: 'underline',
  },
  mealNote: {
    marginTop: 8,
    fontSize: 12,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  removeBtn: { padding: 4, marginTop: 2, marginLeft: 4 },
});
