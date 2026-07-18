import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

/** Silvery foil lens artwork for onboarding hero */
export function SilverHeroArt() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.band, styles.band1]} />
      <View style={[styles.band, styles.band2]} />
      <View style={styles.lensOuter}>
        <View style={styles.lensMid}>
          <View style={styles.lensCore} />
        </View>
      </View>
      <View style={styles.shine} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 220,
    width: '100%',
    backgroundColor: colors.graphite,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  band: {
    position: 'absolute',
    height: 28,
    width: '140%',
    backgroundColor: colors.foil,
    opacity: 0.25,
  },
  band1: { top: 48, transform: [{ rotate: '-8deg' }] },
  band2: { bottom: 56, backgroundColor: colors.silverDeep, opacity: 0.35, transform: [{ rotate: '6deg' }] },
  lensOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: colors.foil,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,235,238,0.12)',
  },
  lensMid: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.silverDeep,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,246,248,0.15)',
  },
  lensCore: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    opacity: 0.85,
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
