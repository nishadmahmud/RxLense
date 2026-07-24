import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../AppState';
import { t } from '../i18n';
import { colors } from '../theme';
import { MedicineModal } from '../components/MedicineModal';
import { DoseTimingIcons } from '../components/DoseTimingIcons';
import { formatDoseSlots, groupMedsByTimeOfDay } from '../doseTiming';

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

export default function MedicinesScreen() {
  const { language, activePerson, profile, removeRegimenItem } = useAppState();
  const [modalMed, setModalMed] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const person = activePerson || profile.people[0];
  const regimen = person?.regimen || [];
  const groups = useMemo(() => groupByScan(regimen), [regimen]);

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
    <ScrollView style={styles.safe} contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>{t(language, 'medicines')}</Text>
      <Text style={styles.sub}>{person?.name || t(language, 'me')}</Text>
      {regimen.length === 0 ? (
        <Text style={styles.p}>{t(language, 'myMedsEmpty')}</Text>
      ) : (
        groups.map((group) => {
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
            <View key={group.scanId} style={styles.group}>
              <Pressable style={styles.groupHeader} onPress={() => toggleGroup(group.scanId)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupTitle}>{title}</Text>
                  <Text style={styles.meta}>
                    {formatDate(group.scannedAt, language)}
                    {group.scannedAt ? ' · ' : ''}
                    {t(language, 'medsCount').replace('{n}', String(group.items.length))}
                  </Text>
                </View>
                <Ionicons
                  name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={20}
                  color={colors.muted}
                />
              </Pressable>

              {!isCollapsed && (
                <View style={styles.groupBody}>
                  {scheduleRows.map((row, ri) => (
                    <View key={`${group.scanId}-${row.timeOfDay}`} style={styles.timelineRow}>
                      <View style={styles.rail}>
                        <View style={styles.dot} />
                        {ri < scheduleRows.length - 1 || unslotted.length > 0 ? (
                          <View style={styles.line} />
                        ) : null}
                      </View>
                      <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.h2}>{row.timeOfDay}</Text>
                        {row.medicines.map((m) => (
                          <View key={`${m.brandName}-${m._index}`} style={styles.medRow}>
                            <Pressable
                              style={{ flex: 1 }}
                              onPress={() => setModalMed(m)}
                            >
                              <Text style={styles.linkText}>{m.brandName}</Text>
                              {!!m.doseLine && <Text style={styles.meta}>{m.doseLine}</Text>}
                              <DoseTimingIcons doseLine={m.doseLine} size={14} />
                              {m.timingSource === 'assumed' && (
                                <Text style={styles.assumed}>{t(language, 'timingAssumed')}</Text>
                              )}
                            </Pressable>
                            <Pressable
                              style={styles.removeBtn}
                              hitSlop={10}
                              onPress={() => confirmRemove(m._index, m.brandName)}
                              accessibilityLabel={t(language, 'removeMed')}
                            >
                              <Ionicons name="trash-outline" size={18} color={colors.errorText} />
                            </Pressable>
                          </View>
                        ))}
                        {!!row.mealTiming && <Text style={styles.meta}>{row.mealTiming}</Text>}
                      </View>
                    </View>
                  ))}

                  {unslotted.map((m) => (
                    <View key={`u-${m._index}`} style={styles.card}>
                      <View style={styles.medRow}>
                        <Pressable style={{ flex: 1 }} onPress={() => setModalMed(m)}>
                          <Text style={styles.linkText}>{m.brandName}</Text>
                          {!!m.strength && (
                            <Text style={styles.meta}>
                              {t(language, 'strength')}: {m.strength}
                            </Text>
                          )}
                          {!!m.doseLine && <Text style={styles.meta}>{m.doseLine}</Text>}
                          {!!m.timing && (
                            <Text style={styles.meta}>
                              {t(language, 'timing')}: {m.timing}
                            </Text>
                          )}
                        </Pressable>
                        <Pressable
                          style={styles.removeBtn}
                          hitSlop={10}
                          onPress={() => confirmRemove(m._index, m.brandName)}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.errorText} />
                        </Pressable>
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
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '750', color: colors.graphite },
  sub: { color: colors.muted, marginBottom: 14 },
  p: { color: colors.muted, lineHeight: 20 },
  group: { marginBottom: 14 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupTitle: { fontSize: 16, fontWeight: '750', color: colors.graphite },
  groupBody: { marginTop: 8, paddingLeft: 4 },
  timelineRow: { flexDirection: 'row', marginBottom: 8 },
  rail: { width: 16, alignItems: 'center', marginRight: 8 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4 },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  h2: { fontSize: 15, fontWeight: '700', color: colors.graphite, marginBottom: 6 },
  medRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  linkText: { fontSize: 15, fontWeight: '700', color: colors.accent },
  meta: { color: colors.muted, marginTop: 2, fontSize: 12 },
  assumed: { color: colors.muted, fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  removeBtn: { padding: 4, marginTop: 2 },
});
