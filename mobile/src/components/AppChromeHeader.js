import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '../theme';
import { t } from '../i18n';

/**
 * Centered RxLens wordmark + optional EN|বাংলা control.
 * No hamburger / bell.
 */
export function AppChromeHeader({ language, onToggleLanguage, showLang = true, rightExtra }) {
  return (
    <View style={styles.row}>
      <View style={styles.side} />
      <Text style={styles.brand}>{t(language, 'brand')}</Text>
      <View style={[styles.side, styles.sideRight]}>
        {rightExtra}
        {showLang && onToggleLanguage ? (
          <Pressable style={styles.langPill} onPress={onToggleLanguage} hitSlop={8}>
            <Text style={[styles.langOpt, language === 'en' && styles.langOptOn]}>EN</Text>
            <Text style={styles.langSep}>|</Text>
            <Text style={[styles.langOpt, language === 'bn' && styles.langOptOn]}>বাংলা</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
    minHeight: 36,
  },
  side: { width: 88, flexDirection: 'row', alignItems: 'center' },
  sideRight: { justifyContent: 'flex-end' },
  brand: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: colors.onSurface,
    letterSpacing: -0.2,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  langOpt: {
    fontSize: 11,
    fontFamily: fonts.bodyMedium,
    color: colors.accent,
  },
  langOptOn: {
    color: colors.onSurface,
    fontFamily: fonts.bodyBold,
  },
  langSep: { color: colors.silverDeep, fontSize: 11 },
});
