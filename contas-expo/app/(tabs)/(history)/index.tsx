import { Stack } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppleIcon } from '../../../src/components/AppleIcon';
import { useBills } from '../../../src/context/BillsContext';
import {
  addMonths,
  formatBRL,
  formatMonthTitle,
  formatShortMonthTitle,
  getMonthKey,
  getRelativeDueDescription,
} from '../../../src/services/billService';
import { useAppleTheme } from '../../../src/theme/appleColors';
import { BILL_CATEGORY_META, type BillEntry } from '../../../src/types/bills';

type StatusFilter = 'all' | 'paid' | 'pending';

export default function HistoryScreen() {
  const colors = useAppleTheme();
  const { entries } = useBills();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const chartBars = useMemo(() => {
    const now = new Date();
    const bars: { key: string; label: string; paid: number; pending: number }[] = [];
    for (let offset = -5; offset <= 0; offset++) {
      const m = addMonths(now, offset);
      const key = getMonthKey(m);
      const items = entries.filter((e) => e.monthKey === key);
      const paid = items
        .filter((e) => e.isPaid)
        .reduce((s, e) => s + (e.paidAmount ?? e.amount), 0);
      const pending = items
        .filter((e) => !e.isPaid)
        .reduce((s, e) => s + e.amount, 0);
      bars.push({
        key,
        label: formatShortMonthTitle(m),
        paid,
        pending,
      });
    }
    return bars;
  }, [entries]);

  const maxChartValue = useMemo(
    () => Math.max(...chartBars.map((b) => b.paid + b.pending), 1),
    [chartBars]
  );

  const filteredEntries = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return entries.filter((entry) => {
      const catLabel = BILL_CATEGORY_META[entry.category]?.label.toLowerCase() ?? '';
      const matchesQuery =
        query.length === 0 ||
        entry.title.toLowerCase().includes(query) ||
        catLabel.includes(query);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'paid' && entry.isPaid) ||
        (statusFilter === 'pending' && !entry.isPaid);

      return matchesQuery && matchesStatus;
    });
  }, [entries, searchText, statusFilter]);

  const groupedMonths = useMemo(() => {
    const map = new Map<string, BillEntry[]>();
    for (const entry of filteredEntries) {
      const list = map.get(entry.monthKey) ?? [];
      list.push(entry);
      map.set(entry.monthKey, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([monthKey, items]) => {
        const sorted = [...items].sort(
          (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
        );
        const totalPaid = sorted
          .filter((e) => e.isPaid)
          .reduce((s, e) => s + (e.paidAmount ?? e.amount), 0);
        const firstDate = new Date(sorted[0].dueDate);
        return {
          monthKey,
          title: formatMonthTitle(firstDate),
          totalPaid,
          items: sorted,
        };
      });
  }, [filteredEntries]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Histórico',
          headerSearchBarOptions: {
            placeholder: 'Buscar conta ou categoria',
            onChangeText: (event) => setSearchText(event.nativeEvent.text),
            onCancelButtonPress: () => setSearchText(''),
          },
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.groupedBackground }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {entries.length > 0 && (
          <>
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>
                ÚLTIMOS 6 MESES
              </Text>
              <View style={[styles.card, { backgroundColor: colors.secondaryGroupedBackground }]}>
                <View style={styles.chartArea}>
                  {chartBars.map((bar) => {
                    const paidHeight = Math.round((bar.paid / maxChartValue) * 110);
                    const pendingHeight = Math.round((bar.pending / maxChartValue) * 110);
                    return (
                      <View key={bar.key} style={styles.barColumn}>
                        <View style={styles.barTrack}>
                          {pendingHeight > 0 && (
                            <View
                              style={[
                                styles.barSegment,
                                {
                                  height: Math.max(pendingHeight, 4),
                                  backgroundColor: colors.orange,
                                  borderTopLeftRadius: 4,
                                  borderTopRightRadius: 4,
                                  borderBottomLeftRadius: paidHeight === 0 ? 4 : 0,
                                  borderBottomRightRadius: paidHeight === 0 ? 4 : 0,
                                },
                              ]}
                            />
                          )}
                          {paidHeight > 0 && (
                            <View
                              style={[
                                styles.barSegment,
                                {
                                  height: Math.max(paidHeight, 4),
                                  backgroundColor: colors.green,
                                  borderBottomLeftRadius: 4,
                                  borderBottomRightRadius: 4,
                                  borderTopLeftRadius: pendingHeight === 0 ? 4 : 0,
                                  borderTopRightRadius: pendingHeight === 0 ? 4 : 0,
                                },
                              ]}
                            />
                          )}
                          {paidHeight === 0 && pendingHeight === 0 && (
                            <View
                              style={[
                                styles.barSegment,
                                { height: 4, backgroundColor: colors.tertiaryFill, borderRadius: 2 },
                              ]}
                            />
                          )}
                        </View>
                        <Text style={[styles.barLabel, { color: colors.secondaryLabel }]}>
                          {bar.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <View style={[styles.legendRow, { borderTopColor: colors.separator }]}>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: colors.green }]} />
                    <Text style={[styles.legendText, { color: colors.secondaryLabel }]}>Pago</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: colors.orange }]} />
                    <Text style={[styles.legendText, { color: colors.secondaryLabel }]}>
                      Pendente
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.segmented, { backgroundColor: colors.tertiaryFill }]}>
              {(
                [
                  { id: 'all', label: 'Tudo' },
                  { id: 'paid', label: 'Pagas' },
                  { id: 'pending', label: 'Pendentes' },
                ] as { id: StatusFilter; label: string }[]
              ).map((item) => {
                const selected = statusFilter === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setStatusFilter(item.id)}
                    style={[
                      styles.segmentItem,
                      selected && { backgroundColor: colors.secondaryGroupedBackground },
                    ]}
                  >
                    <Text
                      style={{
                        color: colors.label,
                        fontSize: 13.5,
                        fontWeight: selected ? '600' : '400',
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {groupedMonths.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.secondaryGroupedBackground }]}>
            <AppleIcon name="clock.arrow.circlepath" size={40} color={colors.secondaryLabel} />
            <Text style={[styles.emptyTitle, { color: colors.label }]}>Sem histórico</Text>
            <Text style={[styles.emptySubtitle, { color: colors.secondaryLabel }]}>
              {entries.length === 0
                ? 'Seu histórico de pagamentos aparecerá aqui conforme os meses forem registrados.'
                : 'Nenhum lançamento encontrado para a busca atual.'}
            </Text>
          </View>
        ) : (
          groupedMonths.map((group) => (
            <View key={group.monthKey} style={styles.sectionBlock}>
              <View style={styles.monthHeaderRow}>
                <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>
                  {group.title.toUpperCase()}
                </Text>
                <Text style={[styles.monthPaidText, { color: colors.secondaryLabel }]}>
                  Pago: {formatBRL(group.totalPaid)}
                </Text>
              </View>

              <View style={[styles.card, { backgroundColor: colors.secondaryGroupedBackground }]}>
                {group.items.map((entry, idx) => {
                  const cat = BILL_CATEGORY_META[entry.category] ?? BILL_CATEGORY_META.other;
                  const tint = colors[cat.colorKey] as string;
                  return (
                    <View key={entry.id}>
                      <View style={styles.historyRow}>
                        <View style={[styles.iconBox, { backgroundColor: `${tint}22` }]}>
                          <AppleIcon name={cat.symbol} size={15} color={tint} weight="semibold" />
                        </View>
                        <View style={styles.historyMiddle}>
                          <Text style={[styles.historyTitle, { color: colors.label }]}>
                            {entry.title}
                          </Text>
                          <Text
                            style={[
                              styles.historySub,
                              { color: entry.isPaid ? colors.green : colors.secondaryLabel },
                            ]}
                          >
                            {getRelativeDueDescription(entry)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.historyAmount,
                            { color: entry.isPaid ? colors.label : colors.secondaryLabel },
                          ]}
                        >
                          {formatBRL(entry.isPaid ? (entry.paidAmount ?? entry.amount) : entry.amount)}
                        </Text>
                      </View>
                      {idx < group.items.length - 1 && (
                        <View style={[styles.hairline, { backgroundColor: colors.separator }]} />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 16 },
  sectionBlock: { gap: 6 },
  sectionHeader: { fontSize: 13, marginLeft: 16 },
  card: { borderRadius: 12, overflow: 'hidden' },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    height: 160,
  },
  barColumn: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: {
    height: 112,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barSegment: { width: 22 },
  barLabel: { fontSize: 11, fontWeight: '500' },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12.5 },
  segmented: { flexDirection: 'row', padding: 3, borderRadius: 10 },
  segmentItem: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
  },
  monthPaidText: { fontSize: 12.5, fontVariant: ['tabular-nums'] },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 12,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyMiddle: { flex: 1, gap: 2 },
  historyTitle: { fontSize: 15.5, fontWeight: '500' },
  historySub: { fontSize: 12 },
  historyAmount: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  hairline: { height: StyleSheet.hairlineWidth, marginLeft: 58 },
  emptyCard: { borderRadius: 12, padding: 28, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
