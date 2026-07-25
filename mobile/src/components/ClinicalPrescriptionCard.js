import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme';
import { t } from '../i18n';

function hasClinical(clinical) {
  if (!clinical) return false;
  return !!(
    (clinical.diagnosis || '').trim() ||
    (clinical.investigations || []).length ||
    (clinical.clinicalNotes || []).length
  );
}

/** Read-only card for diagnosis / tests / notes from the prescription. */
export function ClinicalPrescriptionCard({ clinical, language, style }) {
  if (!hasClinical(clinical)) return null;
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.eyebrow}>{t(language, 'onPrescription').toUpperCase()}</Text>
      <Text style={styles.hint}>{t(language, 'clinicalEducational')}</Text>
      {!!(clinical.diagnosis || '').trim() && (
        <View style={styles.block}>
          <Text style={styles.label}>{t(language, 'diagnosis')}</Text>
          <Text style={styles.value}>{clinical.diagnosis.trim()}</Text>
        </View>
      )}
      {(clinical.investigations || []).length > 0 && (
        <View style={styles.block}>
          <Text style={styles.label}>{t(language, 'investigations')}</Text>
          {clinical.investigations.map((x, i) => (
            <Text key={i} style={styles.bullet}>
              · {x}
            </Text>
          ))}
        </View>
      )}
      {(clinical.clinicalNotes || []).length > 0 && (
        <View style={styles.block}>
          <Text style={styles.label}>{t(language, 'clinicalNotes')}</Text>
          {clinical.clinicalNotes.map((x, i) => (
            <Text key={i} style={styles.bullet}>
              · {x}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

export { hasClinical };

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.silverDeep + '4D',
  },
  eyebrow: {
    fontSize: 12,
    color: colors.mutedVariant,
    marginBottom: 6,
    letterSpacing: 0.8,
    fontFamily: fonts.bodyBold,
  },
  hint: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: spacing.sm,
    lineHeight: 17,
    fontFamily: fonts.body,
  },
  block: { marginBottom: spacing.sm },
  label: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 4,
    fontFamily: fonts.bodyMedium,
  },
  value: {
    fontSize: 15,
    color: colors.onSurface,
    fontFamily: fonts.display,
  },
  bullet: {
    fontSize: 13,
    color: colors.onSurface,
    lineHeight: 19,
    marginBottom: 2,
    fontFamily: fonts.bodyMedium,
  },
});
