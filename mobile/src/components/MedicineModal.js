import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme';
import { t } from '../i18n';
import { disclaimerFor } from '../config';

export function MedicineModal({ visible, medicine, language, onClose }) {
  if (!medicine) return null;
  const snap = medicine.kbSnapshot || {};
  const prices = medicine.examplePrices || snap.examplePrices || [];

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
            {!!(medicine.timing || medicine.timeOfDay) && (
              <Text style={styles.meta}>
                {t(language, 'timing')}: {medicine.timing || medicine.timeOfDay}
                {medicine.doseLine ? ` · ${medicine.doseLine}` : ''}
              </Text>
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
            {prices.length === 0 ? (
              <Text style={styles.p}>{t(language, 'emptyTab')}</Text>
            ) : (
              prices.slice(0, 6).map((p, i) => (
                <Text key={i} style={styles.p}>
                  · {p}
                </Text>
              ))
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
  btn: {
    margin: 16,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
