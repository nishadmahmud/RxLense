import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii } from '../theme';
import { t } from '../i18n';

export function ConfidenceBadge({ language, confidence, needsReview, compact }) {
  const conf = typeof confidence === 'number' ? Math.round(confidence * 100) : null;
  const unsure = !!needsReview || (conf !== null && conf < 70);
  if (!unsure && conf === null) return null;
  if (!unsure) {
    return (
      <View style={[styles.ok, compact && styles.compact]}>
        <Text style={styles.okText}>
          {t(language, 'confidencePct').replace('{n}', String(conf))}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.warn, compact && styles.compact]}>
      <Ionicons name="warning" size={12} color={colors.warnText} />
      <Text style={styles.warnText}>{t(language, 'confidenceUnsure')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.warnBg,
    borderWidth: 1,
    borderColor: colors.warnBorder,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  warnText: {
    color: colors.warnText,
    fontSize: 11,
    fontFamily: fonts.bodyBold,
  },
  ok: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  okText: { color: colors.accentDark, fontSize: 11, fontFamily: fonts.bodyBold },
  compact: { marginTop: 0 },
});
