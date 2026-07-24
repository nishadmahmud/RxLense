import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../AppState';
import { t } from '../i18n';
import { colors } from '../theme';
import { MedicineModal } from '../components/MedicineModal';
import { DoseTimingIcons } from '../components/DoseTimingIcons';

export default function MedicinesScreen() {
  const { language, activePerson, profile, removeRegimenItem } = useAppState();
  const [modalMed, setModalMed] = useState(null);
  const person = activePerson || profile.people[0];
  const regimen = person?.regimen || [];

  function confirmRemove(index, brandName) {
    Alert.alert(
      t(language, 'removeMed'),
      t(language, 'removeMedConfirm').replace('{name}', brandName || ''),
      [
        { text: t(language, 'close'), style: 'cancel' },
        {
          text: t(language, 'removeMed'),
          style: 'destructive',
          onPress: async () => {
            if (modalMed && regimen[index] === modalMed) setModalMed(null);
            await removeRegimenItem(person.id, index);
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>{t(language, 'medicines')}</Text>
      <Text style={styles.sub}>{person?.name || t(language, 'me')}</Text>
      {regimen.length === 0 ? (
        <Text style={styles.p}>{t(language, 'myMedsEmpty')}</Text>
      ) : (
        regimen.map((m, i) => (
          <View key={`${m.brandName}-${m.strength || ''}-${i}`} style={styles.card}>
            <Pressable style={styles.cardBody} onPress={() => setModalMed(m)}>
              <Text style={styles.title}>{m.brandName}</Text>
              {!!m.strength && (
                <Text style={styles.meta}>
                  {t(language, 'strength')}: {m.strength}
                </Text>
              )}
              {!!m.timing && (
                <Text style={styles.meta}>
                  {t(language, 'timing')}: {m.timing}
                </Text>
              )}
              {!!m.doseLine && <Text style={styles.meta}>{m.doseLine}</Text>}
              <DoseTimingIcons doseLine={m.doseLine} />
            </Pressable>
            <Pressable
              style={styles.removeBtn}
              hitSlop={10}
              onPress={() => confirmRemove(i, m.brandName)}
              accessibilityLabel={t(language, 'removeMed')}
            >
              <Ionicons name="trash-outline" size={20} color={colors.errorText} />
            </Pressable>
          </View>
        ))
      )}
      <MedicineModal
        visible={!!modalMed}
        medicine={modalMed}
        language={language}
        onClose={() => setModalMed(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '750', color: colors.graphite },
  sub: { color: colors.muted, marginBottom: 14 },
  p: { color: colors.muted, lineHeight: 20 },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardBody: { flex: 1, paddingRight: 8 },
  removeBtn: { padding: 4, marginTop: 2 },
  title: { fontSize: 17, fontWeight: '700', color: colors.graphite },
  meta: { color: colors.accent, marginTop: 4, fontSize: 13 },
});
