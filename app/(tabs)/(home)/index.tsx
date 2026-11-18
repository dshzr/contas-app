import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AddEditBillModal } from '../../../src/components/AddEditBillModal';
import { AppleIcon } from '../../../src/components/AppleIcon';
import { BillRow } from '../../../src/components/BillRow';
import { MonthlySummaryCard } from '../../../src/components/MonthlySummaryCard';
import { useBills } from '../../../src/context/BillsContext';
import {
  addMonths,
  formatMonthTitle,
  getMonthKey,
  getUrgencyGroup,
  numberToInputBRL,
  parseBRLInput,
  startOfMonth,
  summarizeMonth,
} from '../../../src/services/billService';
import { useAppleTheme } from '../../../src/theme/appleColors';
import { URGENCY_GROUP_TITLES, type BillEntry, type BillUrgencyGroup } from '../../../src/types/bills';

type HomeFilter = 'all' | 'pending' | 'subscription' | 'recurring' | 'manual';

const FILTER_OPTIONS: { id: HomeFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'subscription', label: 'Assinaturas' },
  { id: 'recurring', label: 'Recorrentes' },
  { id: 'manual', label: 'Manuais' },
];

export default function HomeBillsScreen() {
  const colors = useAppleTheme();
  const { entries, ensureMonthPopulated, markEntryPaid, markEntryUnpaid, deleteEntry } = useBills();

  const [selectedMonth, setSelectedMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedFilter, setSelectedFilter] = useState<HomeFilter>('all');
  const [showPaidSection, setShowPaidSection] = useState(false);
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BillEntry | null>(null);
  const [variableEntry, setVariableEntry] = useState<BillEntry | null>(null);
  const [variableInput, setVariableInput] = useState('');

  const selectedMonthKey = getMonthKey(selectedMonth);
  const isCurrentMonth = selectedMonthKey === getMonthKey(new Date());

  useEffect(() => {
    ensureMonthPopulated(selectedMonth);
  }, [selectedMonth, ensureMonthPopulated]);

  const monthEntries = useMemo(
    () => entries.filter((e) => e.monthKey === selectedMonthKey),
    [entries, selectedMonthKey]
  );

  const summary = useMemo(() => summarizeMonth(monthEntries), [monthEntries]);

  const filteredEntries = useMemo(() => {
    return monthEntries.filter((entry) => {
      switch (selectedFilter) {
        case 'all':
          return true;
        case 'pending':
          return !entry.isPaid;
        case 'subscription':
          return entry.kind === 'subscription';
        case 'recurring':
          return entry.kind === 'recurring';
        case 'manual':
          return entry.kind === 'manual';
      }
    });
  }, [monthEntries, selectedFilter]);

  const grouped = useMemo(() => {
    const map: Record<BillUrgencyGroup, BillEntry[]> = {
      overdue: [],
      dueSoon: [],
      upcoming: [],
      paid: [],
    };
    for (const entry of filteredEntries) {
      map[getUrgencyGroup(entry)].push(entry);
    }
    (Object.keys(map) as BillUrgencyGroup[]).forEach((key) => {
      map[key].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    });
    return map;
  }, [filteredEntries]);

  const handleTogglePaid = (entry: BillEntry) => {
    if (entry.isPaid) {
      markEntryUnpaid(entry.id);
      return;
    }
    if (entry.isVariableAmount) {
      const initial = numberToInputBRL(entry.amount);
      if (Platform.OS === 'ios') {
        Alert.prompt(
          'Confirmar valor pago',
          `Informe o valor final pago para ${entry.title}.`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Confirmar',
              onPress: (text?: string) => {
                const value = parseBRLInput(text ?? '') ?? entry.amount;
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                markEntryPaid(entry.id, value);
              },
            },
          ],
          'plain-text',
          initial,
          'decimal-pad'
        );
      } else {
        setVariableInput(initial);
        setVariableEntry(entry);
      }
      return;
    }
    markEntryPaid(entry.id);
  };

  const confirmVariablePayment = () => {
    if (!variableEntry) return;
    const value = parseBRLInput(variableInput) ?? variableEntry.amount;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    markEntryPaid(variableEntry.id, value);
    setVariableEntry(null);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Contas',
          headerRight: () => (
            <Pressable
              onPress={() => setIsAddVisible(true)}
              hitSlop={10}
              style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel="Adicionar conta"
            >
              <AppleIcon name="plus" size={20} color={colors.blue} weight="semibold" />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.groupedBackground }}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Card Mês + Resumo */}
        <View style={[styles.card, { backgroundColor: colors.secondaryGroupedBackground }]}>
          <View style={styles.monthSelectorRow}>
            <Pressable
              onPress={() => setSelectedMonth((m) => addMonths(m, -1))}
              hitSlop={10}
              accessibilityLabel="Mês anterior"
            >
              <AppleIcon name="chevron.left.circle.fill" size={24} color={colors.secondaryLabel} />
            </Pressable>

            <View style={styles.monthTitleWrap}>
              <Text style={[styles.monthTitle, { color: colors.label }]}>
                {formatMonthTitle(selectedMonth)}
              </Text>
              {!isCurrentMonth && (
                <Pressable onPress={() => setSelectedMonth(startOfMonth(new Date()))}>
                  <Text style={[styles.todayLink, { color: colors.blue }]}>Voltar para hoje</Text>
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={() => setSelectedMonth((m) => addMonths(m, 1))}
              hitSlop={10}
              accessibilityLabel="Próximo mês"
            >
              <AppleIcon name="chevron.right.circle.fill" size={24} color={colors.secondaryLabel} />
            </Pressable>
          </View>

          <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

          <View style={styles.summaryWrap}>
            <MonthlySummaryCard summary={summary} />
          </View>
        </View>

        {/* Pílulas de filtro */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_OPTIONS.map((item) => {
            const active = selectedFilter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedFilter(item.id)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.blue : colors.secondaryGroupedBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: active ? '#FFFFFF' : colors.label,
                      fontWeight: active ? '600' : '400',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Lista ou Estado Vazio */}
        {filteredEntries.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.secondaryGroupedBackground }]}>
            <AppleIcon name="checkmark.seal" size={40} color={colors.secondaryLabel} />
            <Text style={[styles.emptyTitle, { color: colors.label }]}>Sem contas por aqui</Text>
            <Text style={[styles.emptySubtitle, { color: colors.secondaryLabel }]}>
              {selectedFilter === 'all'
                ? 'Adicione sua primeira conta ou assinatura para acompanhar o mês.'
                : 'Nenhuma conta encontrada para este filtro.'}
            </Text>
            <Pressable
              onPress={() =>
                selectedFilter === 'all' ? setIsAddVisible(true) : setSelectedFilter('all')
              }
              style={[styles.emptyBtn, { backgroundColor: colors.blue }]}
            >
              <Text style={styles.emptyBtnText}>
                {selectedFilter === 'all' ? 'Adicionar conta' : 'Limpar filtro'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {(['overdue', 'dueSoon', 'upcoming'] as BillUrgencyGroup[]).map((groupKey) => {
              const items = grouped[groupKey];
              if (items.length === 0) return null;
              return (
                <View key={groupKey} style={styles.sectionBlock}>
                  <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>
                    {URGENCY_GROUP_TITLES[groupKey].toUpperCase()}
                  </Text>
                  <View style={[styles.card, { backgroundColor: colors.secondaryGroupedBackground }]}>
                    {items.map((entry, idx) => (
                      <BillRow
                        key={entry.id}
                        entry={entry}
                        onPress={() => setEditingEntry(entry)}
                        onTogglePaid={() => handleTogglePaid(entry)}
                        onDelete={() =>
                          Alert.alert('Excluir conta', `Deseja excluir "${entry.title}"?`, [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Excluir',
                              style: 'destructive',
                              onPress: () => deleteEntry(entry.id),
                            },
                          ])
                        }
                        showSeparator={idx < items.length - 1}
                      />
                    ))}
                  </View>
                </View>
              );
            })}

            {grouped.paid.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={[styles.card, { backgroundColor: colors.secondaryGroupedBackground }]}>
                  <Pressable
                    onPress={() => setShowPaidSection((s) => !s)}
                    style={styles.paidHeaderRow}
                  >
                    <Text style={[styles.paidHeaderTitle, { color: colors.label }]}>Pagas</Text>
                    <View style={styles.paidHeaderRight}>
                      <Text style={[styles.paidCount, { color: colors.secondaryLabel }]}>
                        {grouped.paid.length}
                      </Text>
                      <AppleIcon
                        name={showPaidSection ? 'chevron.up' : 'chevron.down'}
                        size={13}
                        color={colors.secondaryLabel}
                        weight="semibold"
                      />
                    </View>
                  </Pressable>

                  {showPaidSection && (
                    <>
                      <View style={[styles.hairline, { backgroundColor: colors.separator }]} />
                      {grouped.paid.map((entry, idx) => (
                        <BillRow
                          key={entry.id}
                          entry={entry}
                          onPress={() => setEditingEntry(entry)}
                          onTogglePaid={() => handleTogglePaid(entry)}
                          onDelete={() => deleteEntry(entry.id)}
                          showSeparator={idx < grouped.paid.length - 1}
                        />
                      ))}
                    </>
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <AddEditBillModal
        visible={isAddVisible}
        onClose={() => setIsAddVisible(false)}
        defaultMonthDate={selectedMonth}
      />

      <AddEditBillModal
        visible={editingEntry !== null}
        onClose={() => setEditingEntry(null)}
        editingEntry={editingEntry}
        defaultMonthDate={selectedMonth}
      />

      <Modal
        visible={variableEntry !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setVariableEntry(null)}
      >
        <View style={styles.dialogBackdrop}>
          <View style={[styles.dialogCard, { backgroundColor: colors.secondaryGroupedBackground }]}>
            <Text style={[styles.dialogTitle, { color: colors.label }]}>Confirmar valor pago</Text>
            <Text style={[styles.dialogSubtitle, { color: colors.secondaryLabel }]}>
              Informe o valor final pago para {variableEntry?.title}.
            </Text>
            <TextInput
              value={variableInput}
              onChangeText={setVariableInput}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={colors.tertiaryLabel}
              style={[
                styles.dialogInput,
                {
                  color: colors.label,
                  backgroundColor: colors.tertiaryFill,
                },
              ]}
              autoFocus
            />
            <View style={[styles.dialogActions, { borderTopColor: colors.separator }]}>
              <Pressable
                onPress={() => setVariableEntry(null)}
                style={[
                  styles.dialogBtn,
                  { borderRightColor: colors.separator, borderRightWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <Text style={[styles.dialogBtnText, { color: colors.blue }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={confirmVariablePayment} style={styles.dialogBtn}>
                <Text style={[styles.dialogBtnText, { color: colors.blue, fontWeight: '600' }]}>
                  Confirmar
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 16,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  monthSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  monthTitleWrap: {
    alignItems: 'center',
    gap: 2,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  todayLink: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
  },
  summaryWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  filterText: {
    fontSize: 14,
  },
  sectionBlock: {
    gap: 6,
  },
  sectionHeader: {
    fontSize: 13,
    marginLeft: 16,
  },
  paidHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  paidHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  paidHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paidCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyCard: {
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 14,
    overflow: 'hidden',
    paddingTop: 18,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  dialogSubtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
  },
  dialogInput: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 17,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  dialogActions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dialogBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dialogBtnText: {
    fontSize: 16,
  },
});
