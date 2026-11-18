import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { AppleIcon } from '../../../src/components/AppleIcon';
import { useBills } from '../../../src/context/BillsContext';
import { getMonthKey } from '../../../src/services/billService';
import { useAppleTheme } from '../../../src/theme/appleColors';

const REMINDER_DAYS = [
  { label: 'No dia', value: 0 },
  { label: '1 dia antes', value: 1 },
  { label: '2 dias antes', value: 2 },
  { label: '3 dias antes', value: 3 },
  { label: '7 dias antes', value: 7 },
];

export default function SettingsScreen() {
  const colors = useAppleTheme();
  const { settings, updateSettings, loadSampleData, buildBackupJSON, importBackupJSON } =
    useBills();

  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');

  const reminderDateValue = (() => {
    const d = new Date();
    d.setHours(settings.reminderHour, settings.reminderMinute, 0, 0);
    return d;
  })();

  const handleExportBackup = async () => {
    try {
      const json = buildBackupJSON();
      const fileName = `contas-backup-${getMonthKey(new Date())}.json`;
      const file = new File(Paths.cache, fileName);
      file.write(json);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Exportar backup de Contas',
        });
      } else {
        Alert.alert('Backup gerado', `Arquivo salvo em: ${file.uri}`);
      }
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao exportar backup.');
    }
  };

  const handleImportBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const file = new File(result.assets[0].uri);
      const raw = await file.text();
      const imported = importBackupJSON(raw);
      Alert.alert(
        'Backup restaurado',
        `${imported.rules} recorrência(s) e ${imported.entries} lançamento(s) importados.`
      );
    } catch (err) {
      Alert.alert(
        'Erro ao restaurar',
        err instanceof Error ? err.message : 'Arquivo inválido ou corrompido.'
      );
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Ajustes' }} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.groupedBackground }}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>
            NOTIFICAÇÕES LOCAIS
          </Text>
          <View style={[styles.card, { backgroundColor: colors.secondaryGroupedBackground }]}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.label }]}>
                Lembretes de vencimento
              </Text>
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={(val) => updateSettings({ notificationsEnabled: val })}
              />
            </View>

            {settings.notificationsEnabled && (
              <>
                <View style={[styles.hairline, { backgroundColor: colors.separator }]} />
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, { color: colors.label }]}>Horário padrão</Text>
                  {Platform.OS === 'android' && !showTimePicker ? (
                    <Pressable onPress={() => setShowTimePicker(true)}>
                      <Text style={{ color: colors.blue, fontSize: 16 }}>
                        {String(settings.reminderHour).padStart(2, '0')}:
                        {String(settings.reminderMinute).padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ) : (
                    <DateTimePicker
                      value={reminderDateValue}
                      mode="time"
                      display="compact"
                      locale="pt-BR"
                      onChange={(_, date) => {
                        if (Platform.OS === 'android') setShowTimePicker(false);
                        if (date) {
                          updateSettings({
                            reminderHour: date.getHours(),
                            reminderMinute: date.getMinutes(),
                          });
                        }
                      }}
                    />
                  )}
                </View>

                <View style={[styles.hairline, { backgroundColor: colors.separator }]} />
                <View style={styles.daysBlock}>
                  <Text style={[styles.rowLabel, { color: colors.label, marginBottom: 8 }]}>
                    Antecedência padrão
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.pillsRow}>
                      {REMINDER_DAYS.map((opt) => {
                        const active = settings.defaultReminderDays === opt.value;
                        return (
                          <Pressable
                            key={opt.value}
                            onPress={() => updateSettings({ defaultReminderDays: opt.value })}
                            style={[
                              styles.pill,
                              { backgroundColor: active ? colors.blue : colors.tertiaryFill },
                            ]}
                          >
                            <Text
                              style={{
                                color: active ? '#FFFFFF' : colors.label,
                                fontSize: 13,
                                fontWeight: active ? '600' : '400',
                              }}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              </>
            )}
          </View>
          <Text style={[styles.sectionFooter, { color: colors.secondaryLabel }]}>
            Os lembretes são agendados localmente no iPhone, sem necessidade de servidor ou conta paga.
          </Text>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>SEUS DADOS</Text>
          <View style={[styles.card, { backgroundColor: colors.secondaryGroupedBackground }]}>
            <Pressable
              onPress={handleExportBackup}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && { backgroundColor: colors.tertiaryFill },
              ]}
            >
              <AppleIcon name="square.and.arrow.up" size={18} color={colors.blue} />
              <Text style={[styles.actionText, { color: colors.blue }]}>
                Exportar backup (JSON)
              </Text>
            </Pressable>

            <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

            <Pressable
              onPress={handleImportBackup}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && { backgroundColor: colors.tertiaryFill },
              ]}
            >
              <AppleIcon name="square.and.arrow.down" size={18} color={colors.blue} />
              <Text style={[styles.actionText, { color: colors.blue }]}>
                Restaurar backup (JSON)
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>
            TESTES RÁPIDOS
          </Text>
          <View style={[styles.card, { backgroundColor: colors.secondaryGroupedBackground }]}>
            <Pressable
              onPress={() => {
                loadSampleData();
                Alert.alert('Pronto', 'Contas de exemplo adicionadas ao mês atual.');
              }}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && { backgroundColor: colors.tertiaryFill },
              ]}
            >
              <AppleIcon name="sparkles" size={18} color={colors.blue} />
              <Text style={[styles.actionText, { color: colors.blue }]}>
                Carregar contas de exemplo
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>SOBRE</Text>
          <View style={[styles.card, { backgroundColor: colors.secondaryGroupedBackground }]}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.label }]}>Armazenamento</Text>
              <Text style={{ color: colors.secondaryLabel, fontSize: 15 }}>Local (AsyncStorage)</Text>
            </View>
            <View style={[styles.hairline, { backgroundColor: colors.separator }]} />
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.label }]}>Navegação</Text>
              <Text style={{ color: colors.secondaryLabel, fontSize: 15 }}>
                iOS NativeTabs + LargeTitle
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 20 },
  sectionBlock: { gap: 6 },
  sectionHeader: { fontSize: 13, marginLeft: 16 },
  sectionFooter: { fontSize: 12.5, marginHorizontal: 16, lineHeight: 17 },
  card: { borderRadius: 12, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 46,
  },
  rowLabel: { fontSize: 16 },
  hairline: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  daysBlock: { paddingHorizontal: 16, paddingVertical: 12 },
  pillsRow: { flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    minHeight: 46,
  },
  actionText: { fontSize: 16 },
});
