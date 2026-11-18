import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatBRL } from '../services/billService';
import { useAppleTheme } from '../theme/appleColors';
import type { MonthlySummary } from '../types/bills';
import { AppleIcon } from './AppleIcon';

interface MonthlySummaryCardProps {
  summary: MonthlySummary;
}

export function MonthlySummaryCard({ summary }: MonthlySummaryCardProps) {
  const colors = useAppleTheme();
  const allPaid = summary.totalCount > 0 && summary.pendingCount === 0;
  const remainingColor = allPaid && summary.remainingAmount === 0 ? colors.green : colors.label;
  const progressTint = summary.overdueCount > 0 ? colors.orange : colors.blue;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.amountBlock}>
          <Text style={[styles.caption, { color: colors.secondaryLabel }]}>Falta pagar</Text>
          <Text style={[styles.heroAmount, { color: remainingColor }]}>
            {formatBRL(summary.remainingAmount)}
          </Text>
        </View>

        {summary.overdueCount > 0 ? (
          <View style={[styles.statusPill, { backgroundColor: `${colors.red}1F` }]}>
            <AppleIcon name="exclamationmark.circle.fill" size={14} color={colors.red} weight="semibold" />
            <Text style={[styles.statusPillText, { color: colors.red }]}>
              {summary.overdueCount} atrasada{summary.overdueCount > 1 ? 's' : ''}
            </Text>
          </View>
        ) : allPaid ? (
          <View style={[styles.statusPill, { backgroundColor: `${colors.green}1F` }]}>
            <AppleIcon name="checkmark.circle.fill" size={14} color={colors.green} weight="semibold" />
            <Text style={[styles.statusPillText, { color: colors.green }]}>Tudo em dia</Text>
          </View>
        ) : null}
      </View>

      {summary.totalCount > 0 ? (
        <>
          <View style={[styles.progressTrack, { backgroundColor: colors.tertiaryFill }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: progressTint,
                  width: `${Math.round(summary.progress * 100)}%`,
                },
              ]}
            />
          </View>

          <View style={styles.bottomRow}>
            <View>
              <Text style={[styles.metaLabel, { color: colors.secondaryLabel }]}>
                Pago ({summary.paidCount}/{summary.totalCount})
              </Text>
              <Text style={[styles.metaValue, { color: colors.label }]}>
                {formatBRL(summary.paidAmount)}
              </Text>
            </View>

            <View style={styles.rightMeta}>
              <Text style={[styles.metaLabel, { color: colors.secondaryLabel }]}>Total do mês</Text>
              <Text style={[styles.metaValue, { color: colors.label }]}>
                {formatBRL(summary.totalAmount)}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <Text style={[styles.emptyHint, { color: colors.secondaryLabel }]}>
          Nenhuma conta registrada para este mês.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  amountBlock: {
    gap: 2,
    flex: 1,
  },
  caption: {
    fontSize: 15,
    fontWeight: '400',
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rightMeta: {
    alignItems: 'flex-end',
  },
  metaLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  emptyHint: {
    fontSize: 14,
  },
});
