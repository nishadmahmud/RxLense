import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lookupPrices } from '../api';
import { useAppState } from '../AppState';
import { upsertPerson } from '../profileStore';
import { getCachedMedexPrices, setCachedMedexPrices, normalizePriceKey } from '../priceCache';
import { colors, fonts, radii, spacing } from '../theme';
import { t } from '../i18n';
import { disclaimerFor } from '../config';
import {
  formatDoseSlots,
  hasAnyTiming,
  normalizeDoseLine,
  resolveDoseSlots,
} from '../doseTiming';
import { DoseTimingIcons } from './DoseTimingIcons';

function sameMed(a, b) {
  const ka = normalizePriceKey(a);
  const kb = normalizePriceKey(b);
  if (!ka || !kb) return false;
  return ka === kb || ka.includes(kb) || kb.includes(ka);
}

function linesFromMedexPayload(data) {
  const lines = [];
  for (const item of data.items || []) {
    const title = item.title || '';
    const prices = item.prices || [];
    if (prices.length) {
      for (const p of prices) {
        lines.push(title ? `${title}: ${p}` : p);
      }
    } else if (title) {
      lines.push(title);
    }
  }
  return lines;
}

function SectionHeading({ icon, iconColor, children }) {
  return (
    <View style={styles.sectionHead}>
      <Ionicons name={icon} size={20} color={iconColor || colors.accent} />
      <Text style={styles.h}>{children}</Text>
    </View>
  );
}

function Bullet({ children, danger }) {
  return (
    <Text style={[styles.p, styles.bullet, danger && styles.danger]}>
      {'\u2022  '}
      {children}
    </Text>
  );
}

export function MedicineModal({ visible, medicine, language, onClose }) {
  const { setScanSession, profile, persist, activePerson } = useAppState();
  const [medexLines, setMedexLines] = useState([]);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [fromCache, setFromCache] = useState(false);

  const snap = medicine?.kbSnapshot || {};
  const kbPrices = medicine?.examplePrices || snap.examplePrices || [];
  const query = (medicine?.brandName || medicine?.rawName || '').trim();
  const savedOnMed = medicine?.medexPrices;

  async function persistPrices(q, lines) {
    await setCachedMedexPrices(q, lines);

    setScanSession((s) => ({
      ...s,
      medicines: (s.medicines || []).map((m) =>
        sameMed(m.rawName || m.brandName, q)
          ? { ...m, medexPrices: lines, examplePrices: lines }
          : m
      ),
    }));

    const person = activePerson || profile.people?.[0];
    if (person?.regimen?.length) {
      let changed = false;
      const regimen = (person.regimen || []).map((m) => {
        if (!sameMed(m.brandName, q)) return m;
        changed = true;
        return { ...m, medexPrices: lines, examplePrices: lines };
      });
      if (changed) {
        await persist(upsertPerson(profile, { ...person, regimen }));
      }
    }
  }

  useEffect(() => {
    if (!visible || !medicine || !query) {
      setMedexLines([]);
      setPriceError('');
      setPriceLoading(false);
      setFromCache(false);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      if (savedOnMed?.length) {
        setMedexLines(savedOnMed);
        setFromCache(true);
        setPriceLoading(false);
        setPriceError('');
        return;
      }

      const cached = await getCachedMedexPrices(query);
      if (cancelled) return;
      if (cached?.length) {
        setMedexLines(cached);
        setFromCache(true);
        setPriceLoading(false);
        setPriceError('');
        persistPrices(query, cached);
        return;
      }

      setPriceLoading(true);
      setPriceError('');
      setMedexLines([]);
      setFromCache(false);
      try {
        const data = await lookupPrices(query);
        if (cancelled) return;
        const lines = linesFromMedexPayload(data);
        setMedexLines(lines);
        if (lines.length) {
          await persistPrices(query, lines);
        } else {
          setPriceError(data.error || t(language, 'pricingFailed'));
        }
      } catch {
        if (!cancelled) setPriceError(t(language, 'pricingFailed'));
      } finally {
        if (!cancelled) setPriceLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, query, language, savedOnMed]);

  if (!medicine) return null;

  const doseSlots = resolveDoseSlots({
    doseLine: medicine.doseLine,
    timing: medicine.timing,
    timeOfDay: medicine.timeOfDay,
  });
  const hasTiming =
    hasAnyTiming(doseSlots) || !!medicine.doseLine || !!medicine.timing || !!medicine.timeOfDay;
  const doseSummary = medicine.doseLine
    ? normalizeDoseLine(medicine.doseLine).replace(/\+/g, ' + ')
    : '';
  const fromDose = formatDoseSlots(medicine.doseLine, {
    morning: t(language, 'slotMorning'),
    noon: t(language, 'slotNoon'),
    night: t(language, 'slotNight'),
  });
  const timingLabel = medicine.timing || medicine.timeOfDay || fromDose || '';

  const whyItems =
    (snap.commonUses || []).length > 0
      ? snap.commonUses
      : medicine.why
        ? String(medicine.why)
            .split(',')
            .map((u) => u.trim())
            .filter(Boolean)
        : [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} accessibilityRole="button" />
        <View style={styles.sheet}>
          <View style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>

          <View style={styles.header}>
            <View style={styles.headerText}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={2}>
                  {medicine.brandName || medicine.rawName}
                </Text>
                {!!medicine.strength && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{medicine.strength}</Text>
                  </View>
                )}
              </View>
              {!!snap.generic && (
                <Text style={styles.generic}>
                  {t(language, 'genericLabel')}: {snap.generic}
                </Text>
              )}
            </View>
            <Pressable
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t(language, 'close')}
              hitSlop={8}
            >
              <Ionicons name="close" size={22} color={colors.onSurface} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.pad}
            showsVerticalScrollIndicator={false}
          >
            {hasTiming ? (
              <View style={styles.timingCard}>
                <View style={styles.timingHead}>
                  <Text style={styles.labelCaps}>{t(language, 'prescribedTiming')}</Text>
                  {!!doseSummary && <Text style={styles.doseSummary}>{doseSummary}</Text>}
                </View>
                <DoseTimingIcons
                  timing={doseSlots}
                  size={16}
                  boxed
                  showLabels
                  language={language}
                  style={styles.timingIcons}
                />
                {!!timingLabel && timingLabel !== doseSummary && !hasAnyTiming(doseSlots) ? (
                  <Text style={styles.timingMeta}>
                    {t(language, 'timing')}: {timingLabel}
                  </Text>
                ) : null}
                {!!medicine.mealTiming && (
                  <Text style={styles.timingMeta}>
                    {t(language, 'mealTiming')}: {medicine.mealTiming}
                  </Text>
                )}
                {medicine.timingSource === 'assumed' && (
                  <Text style={styles.timingMeta}>{t(language, 'timingAssumed')}</Text>
                )}
              </View>
            ) : null}

            {!!snap.drugClass && (
              <View style={styles.section}>
                <SectionHeading icon="grid-outline">{t(language, 'drugClass')}</SectionHeading>
                <Text style={styles.bodyLg}>{snap.drugClass}</Text>
              </View>
            )}

            <View style={styles.section}>
              <SectionHeading icon="medkit-outline">{t(language, 'why')}</SectionHeading>
              {whyItems.length > 0 ? (
                whyItems.map((u, i) => <Bullet key={i}>{u}</Bullet>)
              ) : (
                <Text style={styles.p}>{t(language, 'emptyTab')}</Text>
              )}
            </View>

            <View style={styles.section}>
              <SectionHeading icon="warning-outline" iconColor={colors.severityImportant}>
                {t(language, 'sideEffects')}
              </SectionHeading>
              {(snap.commonSideEffects || []).length === 0 &&
              (snap.seriousSideEffects || []).length === 0 ? (
                <Text style={styles.p}>{t(language, 'emptyTab')}</Text>
              ) : (
                <>
                  {(snap.commonSideEffects || []).map((u, i) => (
                    <Bullet key={`c${i}`}>{u}</Bullet>
                  ))}
                  {(snap.seriousSideEffects || []).map((u, i) => (
                    <Bullet key={`s${i}`} danger>
                      {u}
                    </Bullet>
                  ))}
                </>
              )}
            </View>

            <View style={styles.section}>
              <SectionHeading icon="information-circle-outline" iconColor={colors.warnText}>
                {t(language, 'cautions')}
              </SectionHeading>
              {(snap.foodFlags || []).length === 0 && !snap.notes && !snap.pregnancyNote ? (
                <Text style={styles.p}>{t(language, 'emptyTab')}</Text>
              ) : (
                <>
                  {(snap.foodFlags || []).map((u, i) => (
                    <Bullet key={`f${i}`}>{u}</Bullet>
                  ))}
                  {!!snap.notes && <Text style={styles.p}>{snap.notes}</Text>}
                  {!!snap.pregnancyNote && <Text style={styles.p}>{snap.pregnancyNote}</Text>}
                </>
              )}
            </View>

            <View style={styles.section}>
              <SectionHeading icon="pricetag-outline">{t(language, 'pricing')}</SectionHeading>
              {priceLoading ? (
                <View style={styles.priceLoading}>
                  <ActivityIndicator color={colors.accent} />
                  <Text style={styles.p}>{t(language, 'pricingLoading')}</Text>
                </View>
              ) : medexLines.length > 0 ? (
                <>
                  {fromCache ? (
                    <Text style={styles.meta}>{t(language, 'pricingCached')}</Text>
                  ) : null}
                  {medexLines.slice(0, 8).map((p, i) => (
                    <Bullet key={i}>{p}</Bullet>
                  ))}
                </>
              ) : (
                <View>
                  {!!priceError && <Text style={styles.p}>{priceError}</Text>}
                  {kbPrices.length > 0 ? (
                    <>
                      <Text style={styles.meta}>{t(language, 'pricingKbFallback')}</Text>
                      {kbPrices.slice(0, 6).map((p, i) => (
                        <Bullet key={i}>{p}</Bullet>
                      ))}
                    </>
                  ) : (
                    <Text style={styles.p}>{t(language, 'emptyTab')}</Text>
                  )}
                </View>
              )}
              <Text style={styles.tiny}>{t(language, 'pricingNote')}</Text>
              <Text style={styles.tiny}>{disclaimerFor(language)}</Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.btn} onPress={onClose}>
              <Text style={styles.btnText}>{t(language, 'close')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(1, 2, 4, 0.4)',
    justifyContent: 'flex-end',
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderColor: colors.border,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
    zIndex: 1,
  },
  grabberWrap: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  grabber: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(197, 198, 202, 0.5)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.margin,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceHigh,
    gap: spacing.sm,
  },
  headerText: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.graphite,
    fontFamily: fonts.display,
  },
  badge: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.mutedVariant,
    fontFamily: fonts.bodyBold,
  },
  generic: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedVariant,
    fontFamily: fonts.body,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flexShrink: 1 },
  pad: {
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  timingCard: {
    backgroundColor: colors.foilLight,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.silver,
  },
  timingHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  labelCaps: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.mutedVariant,
    fontFamily: fonts.bodyBold,
  },
  doseSummary: {
    fontSize: 13,
    color: colors.graphite,
    fontFamily: fonts.bodyBold,
  },
  timingIcons: {
    marginTop: 2,
    justifyContent: 'space-around',
    gap: 0,
  },
  timingMeta: {
    marginTop: spacing.xs,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  section: { gap: 4 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  h: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.graphite,
    fontFamily: fonts.display,
  },
  bodyLg: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedVariant,
    fontFamily: fonts.body,
    paddingLeft: 26,
  },
  p: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedVariant,
    fontFamily: fonts.body,
    marginBottom: 2,
  },
  bullet: {
    paddingLeft: 26,
  },
  meta: {
    fontSize: 12,
    color: colors.accent,
    marginBottom: 4,
    fontFamily: fonts.bodyMedium,
    paddingLeft: 26,
  },
  tiny: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 8,
    lineHeight: 15,
    fontFamily: fonts.body,
  },
  danger: { color: colors.errorText, fontFamily: fonts.bodyMedium },
  priceLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingLeft: 26,
  },
  footer: {
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceHigh,
    backgroundColor: colors.bgElevated,
  },
  btn: {
    backgroundColor: colors.primaryCta,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  btnText: {
    color: colors.onPrimary,
    fontSize: 17,
    fontFamily: fonts.bodyBold,
  },
});
