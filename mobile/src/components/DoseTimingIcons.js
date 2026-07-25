import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { hasAnyTiming, resolveDoseSlots } from '../doseTiming';
import { t } from '../i18n';

const SLOTS = [
  { key: 'morning', icon: 'sunny-outline', labelKey: 'slotMorning' },
  { key: 'noon', icon: 'partly-sunny-outline', labelKey: 'slotNoon' },
  { key: 'night', icon: 'moon-outline', labelKey: 'slotNight' },
];

/** Three timing icons; slate when active, muted outline when off. */
export function DoseTimingIcons({
  doseLine,
  timing,
  timeOfDay,
  size = 16,
  style,
  showLabels = false,
  language = 'en',
  boxed = false,
  /** Small graphite status squares (regimen rows). */
  compact = false,
}) {
  const slots =
    timing && typeof timing === 'object' && !Array.isArray(timing)
      ? timing
      : resolveDoseSlots({
          doseLine,
          timing: typeof timing === 'string' ? timing : undefined,
          timeOfDay,
        });
  if (!hasAnyTiming(slots) && !boxed && !compact) return null;
  return (
    <View style={[styles.row, compact && styles.rowCompact, style]}>
      {SLOTS.map(({ key, icon, labelKey }) => {
        const on = !!slots[key];
        if (compact) {
          return (
            <View
              key={key}
              style={[styles.statusSq, on ? styles.statusSqOn : styles.statusSqOff]}
              accessibilityLabel={`${t(language, labelKey)}${on ? ' on' : ' off'}`}
            >
              <Ionicons
                name={icon}
                size={Math.min(size, 14)}
                color={on ? colors.onPrimary : colors.outline}
              />
            </View>
          );
        }
        if (boxed) {
          return (
            <View key={key} style={styles.boxWrap}>
              <View style={[styles.box, on && styles.boxOn]}>
                <Ionicons
                  name={icon}
                  size={size}
                  color={on ? colors.onPrimary : colors.outline}
                />
              </View>
              {showLabels ? (
                <Text style={[styles.label, on && styles.labelOn]}>
                  {t(language, labelKey)}
                </Text>
              ) : null}
            </View>
          );
        }
        return (
          <Ionicons
            key={key}
            name={icon}
            size={size}
            color={on ? colors.graphite : colors.silverDeep}
            style={styles.icon}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  rowCompact: { gap: 4, marginTop: 0 },
  icon: { marginRight: 2 },
  statusSq: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSqOn: { backgroundColor: colors.graphite },
  statusSqOff: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.silverDeep,
  },
  boxWrap: { alignItems: 'center', gap: 4, flex: 1 },
  box: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.silverDeep,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
  },
  boxOn: {
    borderWidth: 2,
    borderColor: colors.graphite,
    backgroundColor: colors.graphite,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.3,
    color: colors.outline,
    fontFamily: fonts.bodyBold,
    textTransform: 'uppercase',
  },
  labelOn: { color: colors.graphite },
});
