import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { t, tabLabel } from '../i18n';
import { colors } from '../theme';
import { ClinicalPrescriptionCard, hasClinical } from './ClinicalPrescriptionCard';
import { DoseTimingIcons } from './DoseTimingIcons';

export const BRIEF_TAB_KEYS = ['Summary', 'Schedule', 'Interactions', 'Side effects', 'Notes'];

function namesMatch(a, b) {
  const normalize = (name) =>
    String(name || '')
      .toLowerCase()
      .replace(/\b(tablet|capsule|syrup|inj|injection|tab|cap)\b/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * Shared briefing tabs UI for Home results and Scans detail.
 */
export function BriefingTabs({
  language,
  briefing,
  medicines = [],
  clinical,
  onOpenMedicine,
  saveBlock,
  initialTab = 'Summary',
}) {
  const [tab, setTab] = useState(initialTab);
  const clinicalData = clinical || briefing?.clinicalContext || null;
  const showNotes = hasClinical(clinicalData);

  const tabs = showNotes ? BRIEF_TAB_KEYS : BRIEF_TAB_KEYS.filter((k) => k !== 'Notes');

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {tabs.map((key) => (
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
            <Text style={styles.h2}>{briefing?.summary}</Text>
            <Text style={styles.p}>{briefing?.holisticExplanation}</Text>
          </View>
          {saveBlock}
        </View>
      )}

      {tab === 'Schedule' && (
        <View>
          {(briefing?.schedule || []).map((s, i) => (
            <View key={i} style={styles.timelineRow}>
              <View style={styles.rail}>
                <View style={styles.dot} />
                {i < (briefing?.schedule || []).length - 1 ? <View style={styles.line} /> : null}
              </View>
              <View style={[styles.card, { flex: 1 }]}>
                <Text style={styles.h2}>{s.timeOfDay}</Text>
                {(s.medicines || []).map((name) => {
                  const med = medicines.find((m) => namesMatch(m.rawName || m.brandName, name));
                  return (
                    <Pressable
                      key={name}
                      onPress={() =>
                        onOpenMedicine?.({
                          brandName: name,
                          ...(med || {}),
                          timing: s.timeOfDay,
                          examplePrices: med?.kbSnapshot?.examplePrices,
                        })
                      }
                      style={styles.medLink}
                    >
                      <Text style={styles.linkText}>{name}</Text>
                      <DoseTimingIcons doseLine={med?.doseLine} size={14} />
                    </Pressable>
                  );
                })}
                {!!s.mealTiming && <Text style={styles.meta}>{s.mealTiming}</Text>}
              </View>
            </View>
          ))}
          {saveBlock}
        </View>
      )}

      {tab === 'Interactions' &&
        (briefing?.interactions || []).map((x, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.h2}>{x.title}</Text>
            <Text style={styles.p}>{x.detail}</Text>
          </View>
        ))}

      {tab === 'Side effects' && (
        <View style={styles.card}>
          <Text style={styles.h2}>{t(language, 'common')}</Text>
          {(briefing?.sideEffects?.common || []).map((x, i) => (
            <Text key={i} style={styles.p}>
              · {x}
            </Text>
          ))}
          <Text style={[styles.h2, { marginTop: 10 }]}>{t(language, 'seekCare')}</Text>
          {(briefing?.sideEffects?.seekCareNow || []).map((x, i) => (
            <Text key={i} style={[styles.p, styles.danger]}>
              · {x}
            </Text>
          ))}
        </View>
      )}

      {tab === 'Notes' && showNotes && (
        <ClinicalPrescriptionCard clinical={clinicalData} language={language} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { marginVertical: 10 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.silver,
    marginRight: 8,
  },
  tabOn: { backgroundColor: colors.accent },
  tabText: { color: colors.graphite, fontWeight: '600', fontSize: 13 },
  tabTextOn: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  h2: { fontSize: 16, fontWeight: '700', color: colors.graphite, marginBottom: 6 },
  p: { fontSize: 14, color: colors.graphite, lineHeight: 21, marginBottom: 4 },
  meta: { marginTop: 6, fontSize: 12, color: colors.muted },
  danger: { color: colors.errorText },
  linkText: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  medLink: { marginBottom: 8 },
  timelineRow: { flexDirection: 'row', marginBottom: 4 },
  rail: { width: 20, alignItems: 'center', marginRight: 8 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4 },
});
