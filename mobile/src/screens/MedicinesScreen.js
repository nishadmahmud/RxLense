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
  const doseHint =
    m.doseLine ||
    (m.strength ? `${t(language, 'strength')}: ${m.strength}` : '') ||
    (m.timing ? `${t(language, 'timing')}: ${m.timing}` : '');

  return (
    <View style={styles.medRow}>
      <Pressable style={styles.medCopy} onPress={() => onOpen(m)}>
        <Text style={styles.medName} numberOfLines={2} ellipsizeMode="tail">
          {m.brandName}
        </Text>
        {!!doseHint && (
          <Text style={styles.medDose} numberOfLines={2} ellipsizeMode="tail">
            {doseHint}
          </Text>
        )}
        {m.timingSource === 'assumed' && (
          <Text style={styles.assumed} numberOfLines={2} ellipsizeMode="tail">
            {t(language, 'timingAssumed')}
          </Text>
        )}
      </Pressable>
      <View style={styles.medRight}>
        {showTimingSquares ? (
          <DoseTimingIcons
            doseLine={m.doseLine}
            timing={m.timing}
            language={language}
            compact
            size={13}
          />
        ) : null}
        <Pressable onPress={() => onMissed(m)} hitSlop={6} style={styles.missedLink}>
          <Text style={styles.missedText} numberOfLines={1} ellipsizeMode="tail">
            {t(language, 'missedDoseShort')}
          </Text>
        </Pressable>
      </View>
      <Pressable
        style={styles.removeBtn}
        hitSlop={10}
        onPress={() => onRemove(m._index, m.brandName)}
        accessibilityLabel={t(language, 'removeMed')}
      >
        <Ionicons name="trash-outline" size={17} color={colors.mutedVariant} />
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
                    {scheduleRows.map((row, ri) => (
                      <View key={`${group.scanId}-${row.timeOfDay}`} style={styles.timelineRow}>
                        <View style={styles.rail}>
                          <View style={styles.railDot}>
                            <Ionicons
                              name={SLOT_ICONS[row.timeOfDay] || 'time-outline'}
                              size={12}
                              color={colors.onPrimary}
                            />
                          </View>
                          {ri < scheduleRows.length - 1 || unslotted.length > 0 ? (
                            <View style={styles.railLine} />
                          ) : null}
                        </View>
                        <View style={styles.slotCard}>
                          <Text style={styles.slotLabel}>
                            {t(language, SLOT_LABEL_KEYS[row.timeOfDay] || 'slotMorning')}
                          </Text>
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
                            <Text style={styles.mealNote} numberOfLines={2} ellipsizeMode="tail">
                              {row.mealTiming}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}

                    {unslotted.map((m, ui) => (
                      <View key={`u-${m._index}`} style={styles.timelineRow}>
                        <View style={styles.rail}>
                          <View style={[styles.railDot, styles.railDotMuted]}>
                            <Ionicons name="ellipse" size={6} color={colors.outline} />
                          </View>
                          {ui < unslotted.length - 1 ? <View style={styles.railLine} /> : null}
                        </View>
                        <View style={styles.slotCard}>
                          <MedRow
                            m={m}
                            language={language}
                            onOpen={setModalMed}
                            onMissed={openMissedDose}
                            onRemove={confirmRemove}
                            showTimingSquares={false}
                          />
                        </View>
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
    lineHeight: 28,
    fontFamily: fonts.displayBold,
    color: colors.onSurface,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  personName: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.body,
    color: colors.accent,
    marginBottom: spacing.md,
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    maxWidth: '100%',
  },
  rail: {
    width: 22,
    alignItems: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  railDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railDotMuted: {
    backgroundColor: colors.surfaceHigh,
  },
  railLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.accentSoft,
    marginVertical: 4,
    minHeight: 12,
  },
  slotCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    marginBottom: spacing.sm,
  },
  slotLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    fontFamily: fonts.bodyBold,
    color: colors.accent,
    marginBottom: 6,
  },
  slotMedItem: { paddingTop: 0, width: '100%' },
  slotMedDivider: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: '100%',
  },
  medCopy: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    paddingRight: 8,
  },
  medRight: {
    alignItems: 'flex-end',
    gap: 4,
    width: 78,
    flexShrink: 0,
  },
  medName: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.bodyMedium,
    color: colors.onSurface,
    flexShrink: 1,
  },
  medDose: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.accent,
    fontFamily: fonts.body,
    marginTop: 1,
    flexShrink: 1,
  },
  assumed: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 13,
    marginTop: 2,
    fontStyle: 'italic',
    fontFamily: fonts.body,
    flexShrink: 1,
  },
  missedLink: { alignSelf: 'stretch', maxWidth: '100%' },
  missedText: {
    color: colors.accent,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontFamily: fonts.bodyBold,
    textDecorationLine: 'underline',
    textAlign: 'right',
  },
  mealNote: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 14,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  removeBtn: { padding: 2, marginTop: 0, marginLeft: 2, flexShrink: 0 },
});
