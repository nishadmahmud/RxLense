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
import { lookupPrices } from '../api';
import { useAppState } from '../AppState';
import { upsertPerson } from '../profileStore';
import { getCachedMedexPrices, setCachedMedexPrices, normalizePriceKey } from '../priceCache';
import { colors } from '../theme';
import { t } from '../i18n';
import { disclaimerFor } from '../config';
import { formatDoseSlots } from '../doseTiming';
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
        // also stamp onto regimen/scan for next open
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.pad}>
            <Text style={styles.title}>{medicine.brandName || medicine.rawName}</Text>
            {!!medicine.strength && (
              <Text style={styles.meta}>
                {t(language, 'strength')}: {medicine.strength}
              </Text>
            )}
            <DoseTimingIcons doseLine={medicine.doseLine} size={18} />
            {(() => {
              const fromDose = formatDoseSlots(medicine.doseLine, {
                morning: t(language, 'slotMorning'),
                noon: t(language, 'slotNoon'),
                night: t(language, 'slotNight'),
              });
              const timingLabel =
                medicine.timing || medicine.timeOfDay || fromDose || '';
              if (!timingLabel && !medicine.doseLine) return null;
              return (
                <Text style={styles.meta}>
                  {t(language, 'timing')}: {timingLabel}
                  {medicine.doseLine && timingLabel !== medicine.doseLine
                    ? ` · ${medicine.doseLine}`
                    : !timingLabel && medicine.doseLine
                      ? medicine.doseLine
                      : ''}
                </Text>
              );
            })()}
            {!!medicine.mealTiming && (
              <Text style={styles.meta}>
                {t(language, 'mealTiming')}: {medicine.mealTiming}
              </Text>
            )}
            {medicine.timingSource === 'assumed' && (
              <Text style={styles.meta}>{t(language, 'timingAssumed')}</Text>
            )}
            {!!snap.generic && <Text style={styles.meta}>Generic: {snap.generic}</Text>}
            {!!snap.drugClass && <Text style={styles.meta}>{snap.drugClass}</Text>}

            <Text style={styles.h}>{t(language, 'why')}</Text>
            {(snap.commonUses || []).length > 0 ? (
              (snap.commonUses || []).map((u, i) => (
                <Text key={i} style={styles.p}>
                  · {u}
                </Text>
              ))
            ) : medicine.why ? (
              String(medicine.why)
                .split(',')
                .map((u) => u.trim())
                .filter(Boolean)
                .map((u, i) => (
                  <Text key={i} style={styles.p}>
                    · {u}
                  </Text>
                ))
            ) : (
              <Text style={styles.p}>{t(language, 'emptyTab')}</Text>
            )}

            <Text style={styles.h}>{t(language, 'sideEffects')}</Text>
            {(snap.commonSideEffects || []).length === 0 &&
            (snap.seriousSideEffects || []).length === 0 ? (
              <Text style={styles.p}>{t(language, 'emptyTab')}</Text>
            ) : (
              <>
                {(snap.commonSideEffects || []).map((u, i) => (
                  <Text key={`c${i}`} style={styles.p}>
                    · {u}
                  </Text>
                ))}
                {(snap.seriousSideEffects || []).map((u, i) => (
                  <Text key={`s${i}`} style={[styles.p, styles.danger]}>
                    · {u}
                  </Text>
                ))}
              </>
            )}

            <Text style={styles.h}>{t(language, 'cautions')}</Text>
            {(snap.foodFlags || []).length === 0 && !snap.notes && !snap.pregnancyNote ? (
              <Text style={styles.p}>{t(language, 'emptyTab')}</Text>
            ) : (
              <>
                {(snap.foodFlags || []).map((u, i) => (
                  <Text key={`f${i}`} style={styles.p}>
                    · {u}
                  </Text>
                ))}
                {!!snap.notes && <Text style={styles.p}>{snap.notes}</Text>}
                {!!snap.pregnancyNote && <Text style={styles.p}>{snap.pregnancyNote}</Text>}
              </>
            )}

            <Text style={styles.h}>{t(language, 'pricing')}</Text>
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
                  <Text key={i} style={styles.p}>
                    · {p}
                  </Text>
                ))}
              </>
            ) : (
              <View>
                {!!priceError && <Text style={styles.p}>{priceError}</Text>}
                {kbPrices.length > 0 ? (
                  <>
                    <Text style={styles.meta}>{t(language, 'pricingKbFallback')}</Text>
                    {kbPrices.slice(0, 6).map((p, i) => (
                      <Text key={i} style={styles.p}>
                        · {p}
                      </Text>
                    ))}
                  </>
                ) : (
                  <Text style={styles.p}>{t(language, 'emptyTab')}</Text>
                )}
              </View>
            )}
            <Text style={styles.tiny}>{t(language, 'pricingNote')}</Text>
            <Text style={styles.tiny}>{disclaimerFor(language)}</Text>
          </ScrollView>
          <Pressable style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>{t(language, 'close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,29,33,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
  },
  pad: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: colors.graphite, marginBottom: 6 },
  h: { fontSize: 15, fontWeight: '700', color: colors.graphite, marginTop: 14, marginBottom: 4 },
  p: { fontSize: 14, lineHeight: 20, color: colors.muted, marginBottom: 3 },
  meta: { fontSize: 13, color: colors.accent, marginBottom: 2 },
  tiny: { fontSize: 11, color: colors.muted, marginTop: 10, lineHeight: 16 },
  danger: { color: colors.errorText, fontWeight: '600' },
  priceLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  btn: {
    margin: 16,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
