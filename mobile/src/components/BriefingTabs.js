import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { t, tabLabel } from '../i18n';
import { colors, fonts, radii, spacing } from '../theme';
import { stripEmDashes } from '../stripEmDashes';
import { ClinicalPrescriptionCard, hasClinical } from './ClinicalPrescriptionCard';
import { hasAnyTiming, parseDoseTiming, slotsFromTimingLabel } from '../doseTiming';
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

function severityStyle(severity) {
  if (severity === 'important') {
    return { borderLeftColor: colors.severityImportant, borderLeftWidth: 4 };
  }
  if (severity === 'caution') {
    return { borderLeftColor: colors.severityCaution, borderLeftWidth: 4 };
  }
  return { borderLeftColor: colors.severityInfo, borderLeftWidth: 4 };
}

function EmptyState({ language }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{t(language, 'emptyTab')}</Text>
    </View>
  );
}

function FadeIn({ children, delay = 0 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY, delay]);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>
  );
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
  askBlock,
  initialTab = 'Summary',
}) {
  const [tab, setTab] = useState(initialTab);
  const clinicalData = clinical || briefing?.clinicalContext || null;
  const showNotes = hasClinical(clinicalData);

  const tabs = showNotes ? BRIEF_TAB_KEYS : BRIEF_TAB_KEYS.filter((k) => k !== 'Notes');
  const schedule = briefing?.schedule || [];
  const interactions = briefing?.interactions || [];
  const commonSe = briefing?.sideEffects?.common || [];
  const seekSe = briefing?.sideEffects?.seekCareNow || [];

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((key) => {
          const on = tab === key;
          return (
            <Pressable
              key={key}
              style={[styles.tab, on && styles.tabOn]}
              onPress={() => setTab(key)}
            >
              <Text style={on ? styles.tabTextOn : styles.tabText}>{tabLabel(language, key)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {tab === 'Summary' && (
        <FadeIn key="summary">
          <View style={styles.card}>
            <Text style={styles.h2}>{stripEmDashes(briefing?.summary)}</Text>
            <Text style={styles.p}>{stripEmDashes(briefing?.holisticExplanation)}</Text>
          </View>
          {saveBlock}
          {askBlock}
        </FadeIn>
      )}

      {tab === 'Schedule' && (
        <FadeIn key="schedule">
          {schedule.length === 0 ? (
            <EmptyState language={language} />
          ) : (
            schedule.map((s, i) => (
              <View key={i} style={styles.timelineRow}>
                <View style={styles.rail}>
                  <View style={styles.dot} />
                  {i < schedule.length - 1 ? <View style={styles.line} /> : null}
                </View>
                <View style={[styles.card, styles.timelineCard]}>
                  <Text style={styles.h2}>{s.timeOfDay}</Text>
                  {(s.medicines || []).map((name) => {
                    const med = medicines.find(
                      (m) =>
                        namesMatch(m.rawName || m.brandName, name) ||
                        namesMatch(m.kbSnapshot?.generic, name)
                    );
                    const fromDose = parseDoseTiming(med?.doseLine);
                    const iconTiming = hasAnyTiming(fromDose)
                      ? fromDose
                      : slotsFromTimingLabel(s.timeOfDay);
                    return (
                      <Pressable
                        key={name}
                        onPress={() =>
                          onOpenMedicine?.({
                            brandName: name,
                            ...(med || {}),
                            doseLine: med?.doseLine || '',
                            timing: s.timeOfDay,
                            timeOfDay: s.timeOfDay,
                            examplePrices: med?.kbSnapshot?.examplePrices,
                          })
                        }
                        style={styles.medLink}
                      >
                        <Text style={styles.linkText}>{name}</Text>
                        <DoseTimingIcons timing={iconTiming} size={14} compact language={language} />
                      </Pressable>
                    );
                  })}
                  {!!s.mealTiming && <Text style={styles.meta}>{s.mealTiming}</Text>}
                  {s.timingSource === 'assumed' && (
                    <Text style={styles.meta}>{t(language, 'timingAssumed')}</Text>
                  )}
                  {!!s.notes && s.timingSource !== 'assumed' && (
                    <Text style={styles.meta}>{s.notes}</Text>
                  )}
                </View>
              </View>
            ))
          )}
          {saveBlock}
          {askBlock}
        </FadeIn>
      )}

      {tab === 'Interactions' && (
        <FadeIn key="interactions">
          {interactions.length === 0 ? (
            <EmptyState language={language} />
          ) : (
            interactions.map((x, i) => (
              <View key={i} style={[styles.card, styles.severityCard, severityStyle(x.severity)]}>
                <Text style={styles.h2}>{stripEmDashes(x.title)}</Text>
                <Text style={styles.p}>{stripEmDashes(x.detail)}</Text>
              </View>
            ))
          )}
        </FadeIn>
      )}

      {tab === 'Side effects' && (
        <FadeIn key="se">
          <View style={styles.card}>
            <Text style={styles.h2}>{t(language, 'common')}</Text>
            {commonSe.length === 0 ? (
              <Text style={styles.emptyInline}>{t(language, 'emptyTab')}</Text>
            ) : (
              commonSe.map((x, i) => (
                <Text key={i} style={styles.bullet}>
                  · {x}
                </Text>
              ))
            )}
            <Text style={[styles.h2, styles.seekHeading]}>{t(language, 'seekCare')}</Text>
            {seekSe.length === 0 ? (
              <Text style={styles.emptyInline}>{t(language, 'emptyTab')}</Text>
            ) : (
              seekSe.map((x, i) => (
                <Text key={i} style={[styles.bullet, styles.danger]}>
                  · {x}
                </Text>
              ))
            )}
          </View>
        </FadeIn>
      )}

      {tab === 'Notes' && showNotes && (
        <FadeIn key="notes">
          <ClinicalPrescriptionCard clinical={clinicalData} language={language} />
        </FadeIn>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { marginVertical: spacing.sm },
  tabsContent: { paddingRight: spacing.xs, gap: spacing.xs },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: 'transparent',
    marginRight: spacing.xs,
  },
  tabOn: { backgroundColor: colors.graphite },
  tabText: {
    color: colors.accent,
    fontSize: 12,
    letterSpacing: 0.4,
    fontFamily: fonts.bodyMedium,
  },
  tabTextOn: {
    color: colors.onPrimary,
    fontSize: 12,
    letterSpacing: 0.4,
    fontFamily: fonts.bodyBold,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineCard: { flex: 1, marginBottom: spacing.sm },
  severityCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  emptyCard: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.body,
    textAlign: 'center',
  },
  emptyInline: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.body,
    marginBottom: 4,
  },
  h2: {
    fontSize: 14,
    color: colors.onSurface,
    marginBottom: 4,
    fontFamily: fonts.display,
  },
  p: {
    fontSize: 13,
    color: colors.mutedVariant,
    lineHeight: 19,
    marginBottom: 4,
    fontFamily: fonts.body,
  },
  bullet: {
    fontSize: 13,
    color: colors.onSurface,
    lineHeight: 19,
    marginBottom: 4,
    fontFamily: fonts.body,
  },
  seekHeading: { marginTop: spacing.sm },
  meta: {
    marginTop: 6,
    fontSize: 12,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  danger: { color: colors.errorText },
  linkText: {
    color: colors.accent,
    fontSize: 15,
    fontFamily: fonts.bodyBold,
  },
  medLink: { marginBottom: spacing.xs },
  timelineRow: { flexDirection: 'row', marginBottom: 4 },
  rail: { width: 20, alignItems: 'center', marginRight: spacing.xs },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.graphite,
    marginTop: 6,
  },
  line: { flex: 1, width: 2, backgroundColor: colors.silverDeep, marginTop: 4 },
});
