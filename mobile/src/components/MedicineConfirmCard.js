import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, spacing } from '../theme';
import { t } from '../i18n';
import { formatDoseSlots } from '../doseTiming';
import { ConfidenceBadge } from './ConfidenceBadge';
import { DoseTimingIcons } from './DoseTimingIcons';

function slotLabels(language) {
  return {
    morning: t(language, 'slotMorning'),
    noon: t(language, 'slotNoon'),
    night: t(language, 'slotNight'),
  };
}

export function MedicineConfirmCard({
  medicine,
  language,
  onChange,
  onOpenDetail,
}) {
  const [editing, setEditing] = useState(false);
  const m = medicine;
  const slotLabel = formatDoseSlots(m.doseLine, slotLabels(language));
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {!editing ? (
            <Pressable
              style={styles.titleBlock}
              onPress={() =>
                onOpenDetail({
                  ...m,
                  brandName: m.rawName,
                  examplePrices: m.kbSnapshot?.examplePrices,
                })
              }
            >
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={2}>
                  {m.rawName}
                </Text>
                <ConfidenceBadge
                  language={language}
                  confidence={m.confidence}
                  needsReview={m.needsReview}
                  compact
                />
              </View>
              {!!m.strength && (
                <Text style={styles.strength}>
                  {t(language, 'strength')}: {m.strength}
                </Text>
              )}
              {m.kbSnapshot ? (
                <Text style={styles.matched}>
                  {t(language, 'matched')}: {m.kbSnapshot.generic}
                  {m.kbSnapshot.drugClass ? ` · ${m.kbSnapshot.drugClass}` : ''}
                </Text>
              ) : (
                <Text style={styles.warn}>{t(language, 'notInKb')}</Text>
              )}
            </Pressable>
          ) : (
            <Text style={styles.editHeading}>{t(language, 'fieldName')}</Text>
          )}
        </View>
        <Pressable
          hitSlop={10}
          onPress={() => setEditing((v) => !v)}
          accessibilityLabel={t(language, 'editProfile')}
          style={styles.editBtn}
        >
          <Ionicons
            name={editing ? 'checkmark-circle' : 'create-outline'}
            size={22}
            color={editing ? colors.accent : colors.outline}
          />
        </Pressable>
      </View>

      {editing ? (
        <View>
          <TextInput
            style={styles.input}
            value={m.rawName}
            onChangeText={(txt) => onChange('rawName', txt)}
          />
          <Text style={styles.label}>{t(language, 'strength')}</Text>
          <TextInput
            style={styles.input}
            value={m.strength || ''}
            onChangeText={(txt) => onChange('strength', txt)}
          />
          <Text style={styles.label}>{t(language, 'fieldDose')}</Text>
          <TextInput
            style={styles.input}
            value={m.doseLine || ''}
            onChangeText={(txt) => onChange('doseLine', txt)}
          />
        </View>
      ) : (
        <Pressable
          onPress={() =>
            onOpenDetail({
              ...m,
              brandName: m.rawName,
              examplePrices: m.kbSnapshot?.examplePrices,
            })
          }
        >
          {(!!m.doseLine || !!slotLabel) && (
            <View style={styles.doseBox}>
              <View style={styles.doseLeft}>
                {!!m.doseLine && <Text style={styles.doseLine}>{m.doseLine}</Text>}
                {!!slotLabel && (
                  <Text style={styles.slotLabel}>
                    {t(language, 'timing')}: {slotLabel}
                  </Text>
                )}
              </View>
              <DoseTimingIcons
                doseLine={m.doseLine}
                language={language}
                compact
                size={14}
                style={styles.doseIcons}
              />
            </View>
          )}
          <Text style={styles.tapHint}>{t(language, 'tapForDetails')}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  headerLeft: { flex: 1, marginRight: spacing.xs },
  titleBlock: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    color: colors.onSurface,
    fontFamily: fonts.display,
    flexShrink: 1,
  },
  editHeading: {
    fontSize: 12,
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    marginBottom: 4,
  },
  editBtn: { padding: 2 },
  strength: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.body,
    marginBottom: 2,
  },
  matched: {
    marginTop: 2,
    color: colors.accent,
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
  },
  warn: {
    marginTop: 2,
    color: colors.warnText,
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
  },
  doseBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  doseLeft: { flex: 1, marginRight: spacing.sm },
  doseLine: {
    fontSize: 14,
    color: colors.onSurface,
    fontFamily: fonts.bodyMedium,
    letterSpacing: 0.4,
  },
  slotLabel: {
    marginTop: 2,
    fontSize: 11,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  doseIcons: { marginTop: 0 },
  tapHint: {
    marginTop: spacing.xs,
    fontSize: 11,
    color: colors.foil,
    fontFamily: fonts.body,
  },
  label: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
    marginTop: 4,
    fontFamily: fonts.bodyMedium,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.foilLight,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    color: colors.onSurface,
    fontFamily: fonts.body,
    fontSize: 15,
  },
});
