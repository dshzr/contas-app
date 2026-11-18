import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { formatBRL, getRelativeDueDescription, getUrgencyGroup } from '../services/billService';
import { useAppleTheme } from '../theme/appleColors';
import { BILL_CATEGORY_META, BILL_KIND_META, type BillEntry } from '../types/bills';
import { AppleIcon } from './AppleIcon';

interface BillRowProps {
  entry: BillEntry;
  onPress: () => void;
  onTogglePaid: () => void;
  onDelete: () => void;
  showSeparator?: boolean;
}

export function BillRow({
  entry,
  onPress,
  onTogglePaid,
  onDelete,
  showSeparator = true,
}: BillRowProps) {
  const colors = useAppleTheme();
  const swipeRef = useRef<SwipeableMethods>(null);

  const urgency = getUrgencyGroup(entry);
  const categoryMeta = BILL_CATEGORY_META[entry.category] ?? BILL_CATEGORY_META.other;
  const tintColor = colors[categoryMeta.colorKey] as string;

  const dueColor =
    urgency === 'overdue'
      ? colors.red
      : urgency === 'dueSoon'
      ? colors.orange
      : urgency === 'paid'
      ? colors.green
      : colors.secondaryLabel;

  const checkColor = entry.isPaid
    ? colors.green
    : urgency === 'overdue'
    ? colors.red
    : colors.secondaryLabel;

  const installmentBadge =
    entry.installmentIndex && entry.installmentTotal && entry.installmentTotal > 1
      ? `${entry.installmentIndex}/${entry.installmentTotal}`
      : null;

  const effectiveAmount = entry.isPaid ? (entry.paidAmount ?? entry.amount) : entry.amount;

  const handleToggle = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    swipeRef.current?.close();
    onTogglePaid();
  };

  const renderLeftActions = () => (
    <Pressable
      onPress={handleToggle}
      style={[
        styles.swipeAction,
        { backgroundColor: entry.isPaid ? colors.orange : colors.green },
      ]}
    >
      <AppleIcon
        name={entry.isPaid ? 'arrow.uturn.backward' : 'checkmark.circle.fill'}
        size={20}
        color="#FFFFFF"
        weight="semibold"
      />
      <Text style={styles.swipeText}>{entry.isPaid ? 'Desfazer' : 'Pagar'}</Text>
    </Pressable>
  );

  const renderRightActions = () => (
    <Pressable
      onPress={() => {
        swipeRef.current?.close();
        onDelete();
      }}
      style={[styles.swipeAction, { backgroundColor: colors.red }]}
    >
      <AppleIcon name="trash.fill" size={20} color="#FFFFFF" weight="semibold" />
      <Text style={styles.swipeText}>Excluir</Text>
    </Pressable>
  );

  return (
    <View style={{ backgroundColor: colors.secondaryGroupedBackground }}>
      <Swipeable
        ref={swipeRef}
        containerStyle={{ backgroundColor: colors.secondaryGroupedBackground, overflow: 'hidden' }}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        overshootLeft={false}
        overshootRight={false}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: pressed
                ? colors.cellHighlight
                : colors.secondaryGroupedBackground,
            },
          ]}
        >
        <Pressable
          onPress={handleToggle}
          hitSlop={10}
          accessibilityLabel={entry.isPaid ? 'Marcar como não paga' : 'Marcar como paga'}
        >
          <AppleIcon
            name={entry.isPaid ? 'checkmark.circle.fill' : 'circle'}
            size={24}
            color={checkColor}
          />
        </Pressable>

        <View style={[styles.iconBox, { backgroundColor: `${tintColor}22` }]}>
          <AppleIcon name={categoryMeta.symbol} size={16} color={tintColor} weight="semibold" />
        </View>

        <View style={styles.middle}>
          <View style={styles.titleRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.title,
                {
                  color: entry.isPaid ? colors.secondaryLabel : colors.label,
                  textDecorationLine: entry.isPaid ? 'line-through' : 'none',
                },
              ]}
            >
              {entry.title}
            </Text>

            {installmentBadge ? (
              <View style={[styles.badge, { backgroundColor: colors.tertiaryFill }]}>
                <Text style={[styles.badgeText, { color: colors.secondaryLabel }]}>
                  {installmentBadge}
                </Text>
              </View>
            ) : entry.kind !== 'manual' ? (
              <AppleIcon
                name={BILL_KIND_META[entry.kind].symbol}
                size={12}
                color={colors.secondaryLabel}
              />
            ) : null}
          </View>

          <View style={styles.dueRow}>
            {urgency === 'overdue' && (
              <AppleIcon name="exclamationmark.triangle.fill" size={11} color={dueColor} />
            )}
            <Text style={[styles.dueText, { color: dueColor }]}>
              {getRelativeDueDescription(entry)}
            </Text>
          </View>
        </View>

        <View style={styles.right}>
          <Text
            style={[
              styles.amount,
              { color: entry.isPaid ? colors.secondaryLabel : colors.label },
            ]}
          >
            {formatBRL(effectiveAmount)}
          </Text>
          {entry.isVariableAmount && !entry.isPaid && (
            <Text style={[styles.variableLabel, { color: colors.secondaryLabel }]}>Variável</Text>
          )}
        </View>
      </Pressable>
      </Swipeable>
      {showSeparator && (
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontSize: 12.5,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  variableLabel: {
    fontSize: 11,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
  swipeAction: {
    width: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  swipeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
