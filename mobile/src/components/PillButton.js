import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radii } from '../theme';

export function PillButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  iconLeft,
  iconRight,
  style,
  textStyle,
}) {
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  return (
    <Pressable
      style={[
        styles.base,
        isPrimary && styles.primary,
        variant === 'outline' && styles.outline,
        isGhost && styles.ghost,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.onPrimary : colors.graphite} />
      ) : (
        <>
          {iconLeft}
          <Text
            style={[
              styles.label,
              isPrimary && styles.labelPrimary,
              variant === 'outline' && styles.labelOutline,
              isGhost && styles.labelGhost,
              textStyle,
            ]}
          >
            {label}
          </Text>
          {iconRight}
        </>
      )}
    </Pressable>
  );
}

export function OutlinePillButton(props) {
  return <PillButton {...props} variant="outline" />;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    minHeight: 44,
  },
  primary: { backgroundColor: colors.primaryCta },
  outline: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1.5,
    borderColor: colors.graphite,
  },
  ghost: { backgroundColor: 'transparent', minHeight: 36, paddingVertical: 6 },
  disabled: { opacity: 0.45 },
  label: { fontFamily: fonts.bodyBold, fontSize: 14 },
  labelPrimary: { color: colors.onPrimary },
  labelOutline: { color: colors.onSurface },
  labelGhost: { color: colors.accent, fontFamily: fonts.bodyMedium },
});
