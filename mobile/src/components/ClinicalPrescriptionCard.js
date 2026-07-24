import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
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
      <Text style={styles.eyebrow}>{t(language, 'onPrescription')}</Text>
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
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  hint: { fontSize: 12, color: colors.muted, marginBottom: 10, lineHeight: 17 },
  block: { marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '750', color: colors.graphite },
  bullet: { fontSize: 14, color: colors.graphite, lineHeight: 20, marginBottom: 2 },
});
