import { Stack } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { AddEditBillModal } from '../../../src/components/AddEditBillModal';
import { AppleIcon } from '../../../src/components/AppleIcon';
import { useBills } from '../../../src/context/BillsContext';
import { formatBRL } from '../../../src/services/billService';
import { useAppleTheme } from '../../../src/theme/appleColors';
import { BILL_CATEGORY_META, type BillKind, type RecurringBillRule } from '../../../src/types/bills';

function RuleRow({
  rule,
  onPress,
  onToggleActive,
  onDelete,
  showSeparator,
}: {
  rule: RecurringBillRule;
  onPress: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  showSeparator: boolean;
}) {
  const colors = useAppleTheme();
  const swipeRef = useRef<SwipeableMethods>(null);
  const cat = BILL_CATEGORY_META[rule.category] ?? BILL_CATEGORY_META.other;
  const tint = rule.isActive ? (colors[cat.colorKey] as string) : colors.gray;

  return (
    <View style={{ backgroundColor: colors.secondaryGroupedBackground }}>
      <Swipeable
        ref={swipeRef}
        containerStyle={{ backgroundColor: colors.secondaryGroupedBackground, overflow: 'hidden' }}
        overshootLeft={false}
        overshootRight={false}
        renderLeftActions={() => (
        <Pressable
          onPress={() => {
            swipeRef.current?.close();
            onToggleActive();
          }}
          style={[
            styles.swipeAction,
            { backgroundColor: rule.isActive ? colors.orange : colors.green },
          ]}
        >
          <AppleIcon
            name={rule.isActive ? 'pause.circle.fill' : 'play.circle.fill'}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.swipeText}>{rule.isActive ? 'Pausar' : 'Reativar'}</Text>
        </Pressable>
      )}
      renderRightActions={() => (
        <Pressable
          onPress={() => {
            swipeRef.current?.close();
            onDelete();
          }}
          style={[styles.swipeAction, { backgroundColor: colors.red }]}
        >
          <AppleIcon name="trash.fill" size={20} color="#FFFFFF" />
          <Text style={styles.swipeText}>Excluir</Text>
        </Pressable>
      )}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: pressed ? colors.cellHighlight : colors.secondaryGroupedBackground,
          },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: `${tint}22` }]}>
          <AppleIcon name={cat.symbol} size={16} color={tint} weight="semibold" />
        </View>
        <View style={styles.middle}>
          <Text
            style={[styles.title, { color: rule.isActive ? colors.label : colors.secondaryLabel }]}
            numberOfLines={1}
          >
            {rule.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.secondaryLabel }]}>
            Dia {rule.dueDay} • {rule.frequency === 'monthly' ? 'Mensal' : 'Anual'}
            {rule.isVariableAmount ? ' • Variável' : ''}
          </Text>
        </View>
        <Text
          style={[styles.amount, { color: rule.isActive ? colors.label : colors.secondaryLabel }]}
        >
          {formatBRL(rule.defaultAmount)}
        </Text>
      </Pressable>
      </Swipeable>
      {showSeparator && <View style={[styles.hairline, { backgroundColor: colors.separator }]} />}
    </View>
  );
}

export default function SubscriptionsAndFixedScreen() {
  const colors = useAppleTheme();
  const { rules, toggleRuleActive, deleteRule } = useBills();

  const [isAddVisible, setIsAddVisible] = useState(false);
  const [initialKind, setInitialKind] = useState<BillKind>('subscription');
  const [editingRule, setEditingRule] = useState<RecurringBillRule | null>(null);

  const activeSubs = useMemo(
    () => rules.filter((r) => r.isActive && r.kind === 'subscription').sort((a, b) => a.dueDay - b.dueDay),
    [rules]
  );
  const activeRecurring = useMemo(
    () => rules.filter((r) => r.isActive && r.kind === 'recurring').sort((a, b) => a.dueDay - b.dueDay),
    [rules]
  );
  const pausedRules = useMemo(() => rules.filter((r) => !r.isActive), [rules]);

  const monthlySubs = useMemo(
    () =>
      activeSubs.reduce(
        (sum, r) => sum + (r.frequency === 'yearly' ? r.defaultAmount / 12 : r.defaultAmount),
        0
      ),
    [activeSubs]
  );

  const monthlyFixed = useMemo(
    () =>
      activeRecurring.reduce(
        (sum, r) => sum + (r.frequency === 'yearly' ? r.defaultAmount / 12 : r.defaultAmount),
        0
      ),
    [activeRecurring]
  );

  const openAddMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Nova assinatura', 'Nova conta recorrente'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setInitialKind('subscription');
            setIsAddVisible(true);
          } else if (buttonIndex === 2) {
            setInitialKind('recurring');
            setIsAddVisible(true);
          }
        }
      );
    } else {
      Alert.alert('Adicionar recorrência', 'Qual tipo deseja cadastrar?', [
        {
          text: 'Nova assinatura',
          onPress: () => {
            setInitialKind('subscription');
            setIsAddVisible(true);
          },
        },
        {
          text: 'Nova conta recorrente',
          onPress: () => {
            setInitialKind('recurring');
            setIsAddVisible(true);
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Fixas',
          headerRight: () => (
            <Pressable
              onPress={openAddMenu}
              hitSlop={10}
              style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel="Adicionar recorrência"
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
        {rules.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>
              RESUMO ESTIMADO
            </Text>
            <View style={[styles.card, { backgroundColor: colors.secondaryGroupedBackground }]}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={[styles.metaLabel, { color: colors.secondaryLabel }]}>
                    Assinaturas / mês
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.label }]}>
                    {formatBRL(monthlySubs)}
                  </Text>
                </View>
                <View style={styles.rightAlign}>
                  <Text style={[styles.metaLabel, { color: colors.secondaryLabel }]}>
                    Projeção anual
                  </Text>
                  <Text style={[styles.summarySubValue, { color: colors.secondaryLabel }]}>
                    {formatBRL(monthlySubs * 12)}
                  </Text>
                </View>
              </View>
              <View style={[styles.hairlineFull, { backgroundColor: colors.separator }]} />
              <View style={styles.summaryBottom}>
                <Text style={[styles.fixedLabel, { color: colors.secondaryLabel }]}>
                  Contas fixas / mês
                </Text>
                <Text style={[styles.fixedValue, { color: colors.label }]}>
                  {formatBRL(monthlyFixed)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {rules.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.secondaryGroupedBackground }]}>
            <AppleIcon name="repeat.circle" size={40} color={colors.secondaryLabel} />
            <Text style={[styles.emptyTitle, { color: colors.label }]}>
              Sem assinaturas ou fixas
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.secondaryLabel }]}>
              Cadastre suas assinaturas e contas fixas para serem lembradas automaticamente todo mês.
            </Text>
            <Pressable
              onPress={() => {
                setInitialKind('subscription');
                setIsAddVisible(true);
              }}
              style={[styles.emptyBtn, { backgroundColor: colors.blue }]}
            >
              <Text style={styles.emptyBtnText}>Adicionar assinatura</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {activeSubs.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>
                  ASSINATURAS ({activeSubs.length})
                </Text>
                <View style={[styles.card, { backgroundColor: colors.secondaryGroupedBackground }]}>
                  {activeSubs.map((rule, idx) => (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      onPress={() => setEditingRule(rule)}
                      onToggleActive={() => toggleRuleActive(rule.id)}
                      onDelete={() => deleteRule(rule.id)}
                      showSeparator={idx < activeSubs.length - 1}
                    />
                  ))}
                </View>
              </View>
            )}

            {activeRecurring.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>
                  CONTAS RECORRENTES ({activeRecurring.length})
                </Text>
                <View style={[styles.card, { backgroundColor: colors.secondaryGroupedBackground }]}>
                  {activeRecurring.map((rule, idx) => (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      onPress={() => setEditingRule(rule)}
                      onToggleActive={() => toggleRuleActive(rule.id)}
                      onDelete={() => deleteRule(rule.id)}
                      showSeparator={idx < activeRecurring.length - 1}
                    />
                  ))}
                </View>
              </View>
            )}

            {pausedRules.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>
                  PAUSADAS ({pausedRules.length})
                </Text>
                <View style={[styles.card, { backgroundColor: colors.secondaryGroupedBackground }]}>
                  {pausedRules.map((rule, idx) => (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      onPress={() => setEditingRule(rule)}
                      onToggleActive={() => toggleRuleActive(rule.id)}
                      onDelete={() => deleteRule(rule.id)}
                      showSeparator={idx < pausedRules.length - 1}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <AddEditBillModal
        visible={isAddVisible}
        onClose={() => setIsAddVisible(false)}
        initialKind={initialKind}
      />

      <AddEditBillModal
        visible={editingRule !== null}
        onClose={() => setEditingRule(null)}
        editingRule={editingRule}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 16 },
  sectionBlock: { gap: 6 },
  sectionHeader: { fontSize: 13, marginLeft: 16 },
  card: { borderRadius: 12, overflow: 'hidden' },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  rightAlign: { alignItems: 'flex-end' },
  metaLabel: { fontSize: 12.5, marginBottom: 3 },
  summaryValue: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  summarySubValue: { fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  hairlineFull: { height: StyleSheet.hairlineWidth },
  summaryBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fixedLabel: { fontSize: 15 },
  fixedValue: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '500' },
  subtitle: { fontSize: 12.5 },
  amount: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  hairline: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  swipeAction: {
    width: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  swipeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  emptyCard: {
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
