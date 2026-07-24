import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { hasAnyTiming, parseDoseTiming } from '../doseTiming';

const SLOTS = [
  { key: 'morning', iconOn: 'sunny', iconOff: 'sunny-outline' },
  { key: 'noon', iconOn: 'partly-sunny', iconOff: 'cloudy-outline' },
  { key: 'night', iconOn: 'moon', iconOff: 'moon-outline' },
];

/** Three timing icons; accent when that dose slot is active. */
export function DoseTimingIcons({ doseLine, timing, size = 16, style }) {
  const slots = timing || parseDoseTiming(doseLine);
  if (!hasAnyTiming(slots)) return null;
  return (
    <View style={[styles.row, style]}>
      {SLOTS.map(({ key, iconOn, iconOff }) => {
        const on = !!slots[key];
        return (
          <Ionicons
            key={key}
            name={on ? iconOn : iconOff}
            size={size}
            color={on ? colors.accent : colors.foil}
            style={styles.icon}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  icon: { marginRight: 2 },
});
