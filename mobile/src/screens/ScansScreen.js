import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppState } from '../AppState';
import { t } from '../i18n';
import { colors } from '../theme';
import { BriefingTabs } from '../components/BriefingTabs';
import { MedicineModal } from '../components/MedicineModal';
import { DoseTimingIcons } from '../components/DoseTimingIcons';

function formatDate(iso, language) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ScansScreen() {
  const navigation = useNavigation();
  const { language, history, openHistoryScan, removeHistoryEntry } = useAppState();
  const [selected, setSelected] = useState(null);
  const [modalMed, setModalMed] = useState(null);

  function confirmRemove(entry) {
    const name = entry.title || t(language, 'scans');
    Alert.alert(
      t(language, 'removeScan'),
      t(language, 'removeScanConfirm').replace('{name}', name),
      [
        { text: t(language, 'close'), style: 'cancel' },
        {
          text: t(language, 'removeScan'),
          style: 'destructive',
          onPress: async () => {
            if (selected?.id === entry.id) setSelected(null);
            await removeHistoryEntry(entry.id);
          },
        },
      ]
    );
  }

  function openOnHome() {
    if (!selected) return;
    openHistoryScan(selected);
    navigation.navigate('Home');
  }

  if (selected) {
    const clinical = selected.clinical || selected.briefing?.clinicalContext;
    return (
      <ScrollView style={styles.safe} contentContainerStyle={styles.pad}>
        <View style={styles.detailHeader}>
          <Pressable style={styles.back} onPress={() => setSelected(null)}>
            <Text style={styles.backText}>{t(language, 'back')}</Text>
          </Pressable>
          <Pressable
            style={styles.removeBtn}
            hitSlop={10}
            onPress={() => confirmRemove(selected)}
            accessibilityLabel={t(language, 'removeScan')}
          >
            <Ionicons name="trash-outline" size={20} color={colors.errorText} />
          </Pressable>
        </View>
        <Text style={styles.h1}>{selected.title || t(language, 'scans')}</Text>
        <Text style={styles.meta}>{formatDate(selected.createdAt, language)}</Text>

        {(selected.medicines || []).length > 0 && (
          <View style={styles.medBlock}>
            <Text style={styles.h2}>{t(language, 'medicines')}</Text>
            {(selected.medicines || []).map((m, i) => (
              <Pressable
                key={`${m.rawName}-${i}`}
                style={styles.medRow}
                onPress={() =>
                  setModalMed({
                    ...m,
                    brandName: m.rawName || m.brandName,
                    examplePrices: m.kbSnapshot?.examplePrices,
                  })
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{m.rawName || m.brandName}</Text>
                  {!!m.doseLine && <Text style={styles.meta}>{m.doseLine}</Text>}
                  <DoseTimingIcons doseLine={m.doseLine} />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {selected.briefing ? (
          <BriefingTabs
            language={language}
            briefing={selected.briefing}
            medicines={selected.medicines || []}
            clinical={clinical}
            onOpenMedicine={setModalMed}
          />
        ) : (
          <Text style={styles.p}>{t(language, 'noBriefing')}</Text>
        )}

        <Pressable style={styles.primary} onPress={openOnHome}>
          <Text style={styles.primaryText}>{t(language, 'scansOpen')}</Text>
        </Pressable>

        <MedicineModal
          visible={!!modalMed}
          medicine={modalMed}
          language={language}
          onClose={() => setModalMed(null)}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>{t(language, 'scans')}</Text>
      {history.length === 0 ? (
        <Text style={styles.p}>{t(language, 'scansEmpty')}</Text>
      ) : (
        history.map((entry) => (
          <View key={entry.id} style={styles.card}>
            <Pressable style={styles.cardBody} onPress={() => setSelected(entry)}>
              <Text style={styles.cardTitle}>{entry.title || t(language, 'scans')}</Text>
              <Text style={styles.meta}>{formatDate(entry.createdAt, language)}</Text>
              <Text style={styles.meta}>
                {t(language, 'medsCount').replace(
                  '{n}',
                  String((entry.medicines || []).length)
                )}
              </Text>
            </Pressable>
            <Pressable
              style={styles.removeBtn}
              hitSlop={10}
              onPress={() => confirmRemove(entry)}
              accessibilityLabel={t(language, 'removeScan')}
            >
              <Ionicons name="trash-outline" size={20} color={colors.errorText} />
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '750', color: colors.graphite, marginBottom: 8 },
  h2: { fontSize: 16, fontWeight: '700', color: colors.graphite, marginBottom: 8 },
  p: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  meta: { fontSize: 12, color: colors.muted, marginBottom: 2 },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  back: { paddingVertical: 4 },
  backText: { color: colors.accent, fontWeight: '700' },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardBody: { flex: 1, paddingRight: 8 },
  removeBtn: { padding: 4, marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: '750', color: colors.graphite, marginBottom: 4 },
  medBlock: { marginBottom: 12 },
  medRow: {
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  medName: { fontSize: 15, fontWeight: '700', color: colors.graphite },
  primary: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
