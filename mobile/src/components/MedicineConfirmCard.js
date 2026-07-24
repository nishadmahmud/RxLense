import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { t } from '../i18n';
import { formatDoseSlots } from '../doseTiming';
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

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {m.needsReview ? <Text style={styles.badge}>{t(language, 'needsReview')}</Text> : <View />}
        <Pressable
          hitSlop={10}
          onPress={() => setEditing((v) => !v)}
          accessibilityLabel="Edit medicine"
        >
          <Ionicons
            name={editing ? 'checkmark-circle' : 'create-outline'}
            size={22}
            color={colors.accent}
          />
        </Pressable>
      </View>

      {editing ? (
        <View>
          <Text style={styles.label}>Name</Text>
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
          <Text style={styles.label}>Dose</Text>
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
          <Text style={styles.title}>{m.rawName}</Text>
          {!!m.strength && (
            <Text style={styles.line}>
              {t(language, 'strength')}: {m.strength}
            </Text>
          )}
          {!!m.doseLine && <Text style={styles.line}>{m.doseLine}</Text>}
          <DoseTimingIcons doseLine={m.doseLine} />
          {!!slotLabel && (
            <Text style={styles.slotLabel}>
              {t(language, 'timing')}: {slotLabel}
            </Text>
          )}
          {m.kbSnapshot ? (
            <Text style={styles.meta}>
              {t(language, 'matched')}: {m.kbSnapshot.generic}
              {m.kbSnapshot.drugClass ? ` · ${m.kbSnapshot.drugClass}` : ''}
            </Text>
          ) : (
            <Text style={styles.warn}>{t(language, 'notInKb')}</Text>
          )}
          <Text style={styles.tapHint}>Tap for details</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.graphite, marginBottom: 4 },
  line: { fontSize: 14, color: colors.muted, marginBottom: 2 },
  slotLabel: { marginTop: 4, fontSize: 13, color: colors.accent, fontWeight: '600' },
  meta: { marginTop: 8, color: colors.accent, fontSize: 12, fontWeight: '600' },
  warn: { marginTop: 8, color: '#A65B00', fontSize: 12 },
  tapHint: { marginTop: 8, fontSize: 11, color: colors.foil },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warnBg,
    color: colors.warnText,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontWeight: '700',
    overflow: 'hidden',
    fontSize: 12,
  },
  label: { fontSize: 12, color: colors.muted, marginBottom: 4, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.foilLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    color: colors.graphite,
  },
});
