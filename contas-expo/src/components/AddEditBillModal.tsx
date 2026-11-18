import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBills } from '../context/BillsContext';
import { numberToInputBRL, parseBRLInput } from '../services/billService';
import { useAppleTheme } from '../theme/appleColors';
import {
  ALL_CATEGORIES,
  BILL_CATEGORY_META,
  BILL_KIND_META,
  type BillCategory,
  type BillEntry,
  type BillKind,
  type RecurrenceFrequency,
  type RecurringBillRule,
} from '../types/bills';
import { AppleIcon } from './AppleIcon';

interface AddEditBillModalProps {
  visible: boolean;
  onClose: () => void;
  editingEntry?: BillEntry | null;
  editingRule?: RecurringBillRule | null;
  defaultMonthDate?: Date;
  initialKind?: BillKind;
}

const REMINDER_OPTIONS = [
  { label: 'No dia', value: 0 },
  { label: '1 dia antes', value: 1 },
  { label: '2 dias antes', value: 2 },
  { label: '3 dias antes', value: 3 },
  { label: '7 dias antes', value: 7 },
];

export function AddEditBillModal({
  visible,
  onClose,
  editingEntry = null,
  editingRule = null,
  defaultMonthDate = new Date(),
  initialKind = 'manual',
}: AddEditBillModalProps) {
  const colors = useAppleTheme();
  const { settings, addManualBill, addRecurringRule, updateEntry, updateRule } = useBills();

  const isEditing = Boolean(editingEntry || editingRule);

  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [kind, setKind] = useState<BillKind>(initialKind);
  const [category, setCategory] = useState<BillCategory>('other');
  const [dueDate, setDueDate] = useState<Date>(defaultMonthDate);
  const [dueDay, setDueDay] = useState<number>(new Date().getDate());
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [isVariableAmount, setIsVariableAmount] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(settings.defaultReminderDays);
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');

  useEffect(() => {
    if (!visible) return;
    if (editingEntry) {
      setTitle(editingEntry.title);
      setAmountText(numberToInputBRL(editingEntry.amount));
      setKind(editingEntry.kind);
      setCategory(editingEntry.category);
      const d = new Date(editingEntry.dueDate);
      setDueDate(d);
      setDueDay(d.getDate());
      setIsVariableAmount(editingEntry.isVariableAmount);
      setInstallments(1);
      setReminderDaysBefore(editingEntry.reminderDaysBefore);
      setNotes(editingEntry.notes);
    } else if (editingRule) {
      setTitle(editingRule.title);
      setAmountText(numberToInputBRL(editingRule.defaultAmount));
      setKind(editingRule.kind);
      setCategory(editingRule.category);
      setDueDay(editingRule.dueDay);
      setFrequency(editingRule.frequency);
      setIsVariableAmount(editingRule.isVariableAmount);
      setReminderDaysBefore(editingRule.reminderDaysBefore);
      setNotes(editingRule.notes);
    } else {
      setTitle('');
      setAmountText('');
      setKind(initialKind);
      setCategory('other');
      setDueDate(defaultMonthDate);
      setDueDay(new Date().getDate());
      setFrequency('monthly');
      setIsVariableAmount(false);
      setInstallments(1);
      setReminderDaysBefore(settings.defaultReminderDays);
      setNotes('');
    }
  }, [visible, editingEntry, editingRule, initialKind, defaultMonthDate, settings.defaultReminderDays]);

  const parsedAmount = parseBRLInput(amountText);
  const canSave = title.trim().length > 0 && parsedAmount !== null && parsedAmount > 0;

  const handleSave = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle || !parsedAmount) {
      Alert.alert('Confira os campos', 'Informe um nome e um valor maior que zero.');
      return;
    }

    if (editingEntry) {
      updateEntry(editingEntry.id, {
        title: cleanTitle,
        amount: parsedAmount,
        dueDate: dueDate.toISOString(),
        category,
        reminderDaysBefore,
        notes,
      });
      onClose();
      return;
    }

    if (editingRule) {
      updateRule(editingRule.id, {
        title: cleanTitle,
        defaultAmount: parsedAmount,
        isVariableAmount,
        category,
        frequency,
        dueDay,
        reminderDaysBefore,
        notes,
      });
      onClose();
      return;
    }

    if (kind === 'manual') {
      addManualBill({
        title: cleanTitle,
        amount: parsedAmount,
        firstDueDate: dueDate,
        category,
        installments,
        reminderDaysBefore,
        notes,
      });
    } else {
      addRecurringRule({
        title: cleanTitle,
        defaultAmount: parsedAmount,
        isVariableAmount,
        kind,
        category,
        frequency,
        dueDay,
        billingMonth: frequency === 'yearly' ? defaultMonthDate.getMonth() + 1 : null,
        reminderDaysBefore,
        notes,
        targetMonthDate: defaultMonthDate,
      });
    }
    onClose();
  };

  const modalTitle = editingEntry
    ? 'Editar Conta'
    : editingRule
    ? 'Editar Recorrência'
    : 'Nova Conta';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.groupedBackground }]}>
        {/* Header estilo Apple Modal */}
        <View style={[styles.header, { borderBottomColor: colors.separator }]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.headerBtn, { color: colors.blue }]}>Cancelar</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.label }]}>{modalTitle}</Text>
          <Pressable onPress={handleSave} disabled={!canSave} hitSlop={8}>
            <Text
              style={[
                styles.headerBtn,
                styles.headerSave,
                { color: canSave ? colors.blue : colors.tertiaryLabel },
              ]}
            >
              Salvar
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {!isEditing && (
            <View style={styles.section}>
              <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>
                TIPO DE CONTA
              </Text>
              <View style={[styles.segmented, { backgroundColor: colors.tertiaryFill }]}>
                {(['manual', 'recurring', 'subscription'] as BillKind[]).map((item) => {
                  const selected = kind === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => setKind(item)}
                      style={[
                        styles.segmentItem,
                        selected && {
                          backgroundColor: colors.secondaryGroupedBackground,
                          shadowColor: '#000',
                          shadowOpacity: 0.08,
                          shadowRadius: 2,
                          shadowOffset: { width: 0, height: 1 },
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          {
                            color: colors.label,
                            fontWeight: selected ? '600' : '400',
                          },
                        ]}
                      >
                        {BILL_KIND_META[item].label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.sectionFooter, { color: colors.secondaryLabel }]}>
                {kind === 'manual'
                  ? 'Lançamento avulso ou parcelado para meses específicos.'
                  : kind === 'recurring'
                  ? 'Contas fixas ou variáveis como aluguel, luz e internet.'
                  : 'Serviços recorrentes como streaming, apps e academia.'}
              </Text>
            </View>
          )}

          {/* Essencial */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>ESSENCIAL</Text>
            <View style={[styles.card, { backgroundColor: colors.secondaryGroupedBackground }]}>
              <View style={styles.inputRow}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Nome (ex: Aluguel, Netflix, Luz)"
                  placeholderTextColor={colors.tertiaryLabel}
                  style={[styles.textInput, { color: colors.label }]}
                  autoCapitalize="words"
                />
              </View>

              <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

              <View style={styles.inputRow}>
                <Text style={[styles.prefix, { color: colors.secondaryLabel }]}>R$</Text>
                <TextInput
                  value={amountText}
                  onChangeText={setAmountText}
                  placeholder="0,00"
                  placeholderTextColor={colors.tertiaryLabel}
                  keyboardType="decimal-pad"
                  style={[styles.textInput, styles.monoInput, { color: colors.label }]}
                />
              </View>

              <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

              {editingEntry || kind === 'manual' ? (
                <View style={styles.pickerRow}>
                  <Text style={[styles.rowLabel, { color: colors.label }]}>Vencimento</Text>
                  {Platform.OS === 'android' && !showDatePicker ? (
                    <Pressable onPress={() => setShowDatePicker(true)}>
                      <Text style={{ color: colors.blue, fontSize: 16 }}>
                        {dueDate.toLocaleDateString('pt-BR')}
                      </Text>
                    </Pressable>
                  ) : (
                    <DateTimePicker
                      value={dueDate}
                      mode="date"
                      display="compact"
                      locale="pt-BR"
                      onChange={(_, date) => {
                        if (Platform.OS === 'android') setShowDatePicker(false);
                        if (date) setDueDate(date);
                      }}
                    />
                  )}
                </View>
              ) : (
                <>
                  <View style={styles.pickerRow}>
                    <Text style={[styles.rowLabel, { color: colors.label }]}>Dia do vencimento</Text>
                    <View style={styles.stepperRow}>
                      <Pressable
                        onPress={() => setDueDay((d) => Math.max(1, d - 1))}
                        style={[styles.stepBtn, { backgroundColor: colors.tertiaryFill }]}
                      >
                        <Text style={[styles.stepText, { color: colors.label }]}>−</Text>
                      </Pressable>
                      <Text style={[styles.stepValue, { color: colors.label }]}>Dia {dueDay}</Text>
                      <Pressable
                        onPress={() => setDueDay((d) => Math.min(31, d + 1))}
                        style={[styles.stepBtn, { backgroundColor: colors.tertiaryFill }]}
                      >
                        <Text style={[styles.stepText, { color: colors.label }]}>+</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={[styles.hairline, { backgroundColor: colors.separator }]} />

                  <View style={styles.pickerRow}>
                    <Text style={[styles.rowLabel, { color: colors.label }]}>Frequência</Text>
                    <View style={styles.inlinePills}>
                      {(['monthly', 'yearly'] as RecurrenceFrequency[]).map((f) => {
                        const active = frequency === f;
                        return (
                          <Pressable
                            key={f}
                            onPress={() => setFrequency(f)}
                            style={[
                              styles.miniPill,
                              {
                                backgroundColor: active ? colors.blue : colors.tertiaryFill,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: active ? '#FFFFFF' : colors.label,
                                fontSize: 13,
                                fontWeight: active ? '600' : '400',
                              }}
                            >
                              {f === 'monthly' ? 'Mensal' : 'Anual'}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Categoria */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>CATEGORIA</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {ALL_CATEGORIES.map((cat) => {
                const meta = BILL_CATEGORY_META[cat];
                const selected = category === cat;
                const tint = colors[meta.colorKey] as string;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: selected
                          ? tint
                          : colors.secondaryGroupedBackground,
                      },
                    ]}
                  >
                    <AppleIcon
                      name={meta.symbol}
                      size={14}
                      color={selected ? '#FFFFFF' : tint}
                      weight="semibold"
                    />
                    <Text
                      style={{
                        color: selected ? '#FFFFFF' : colors.label,
                        fontSize: 13.5,
                        fontWeight: selected ? '600' : '400',
                      }}
                    >
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Opções */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>OPÇÕES</Text>
            <View style={[styles.card, { backgroundColor: colors.secondaryGroupedBackground }]}>
              {!isEditing && kind === 'manual' && (
                <>
                  <View style={styles.pickerRow}>
                    <Text style={[styles.rowLabel, { color: colors.label }]}>
                      {installments === 1 ? 'Pagamento único' : `Parcelado em ${installments}x`}
                    </Text>
                    <View style={styles.stepperRow}>
                      <Pressable
                        onPress={() => setInstallments((n) => Math.max(1, n - 1))}
                        style={[styles.stepBtn, { backgroundColor: colors.tertiaryFill }]}
                      >
                        <Text style={[styles.stepText, { color: colors.label }]}>−</Text>
                      </Pressable>
                      <Text style={[styles.stepValue, { color: colors.label }]}>
                        {installments}x
                      </Text>
                      <Pressable
                        onPress={() => setInstallments((n) => Math.min(36, n + 1))}
                        style={[styles.stepBtn, { backgroundColor: colors.tertiaryFill }]}
                      >
                        <Text style={[styles.stepText, { color: colors.label }]}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={[styles.hairline, { backgroundColor: colors.separator }]} />
                </>
              )}

              {kind !== 'manual' && !editingEntry && (
                <>
                  <View style={styles.pickerRow}>
                    <Text style={[styles.rowLabel, { color: colors.label }]}>
                      Valor variável todo mês
                    </Text>
                    <Switch value={isVariableAmount} onValueChange={setIsVariableAmount} />
                  </View>
                  <View style={[styles.hairline, { backgroundColor: colors.separator }]} />
                </>
              )}

              <View style={styles.reminderBlock}>
                <Text style={[styles.rowLabel, { color: colors.label, marginBottom: 8 }]}>
                  Lembrar
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.inlinePills}>
                    {REMINDER_OPTIONS.map((opt) => {
                      const active = reminderDaysBefore === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() => setReminderDaysBefore(opt.value)}
                          style={[
                            styles.miniPill,
                            {
                              backgroundColor: active ? colors.blue : colors.tertiaryFill,
                            },
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
            </View>
          </View>

          {/* Observações */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: colors.secondaryLabel }]}>
              OBSERVAÇÕES
            </Text>
            <View style={[styles.card, { backgroundColor: colors.secondaryGroupedBackground }]}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Opcional (ex: código, PIX, observação)"
                placeholderTextColor={colors.tertiaryLabel}
                multiline
                style={[styles.notesInput, { color: colors.label }]}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    fontSize: 17,
  },
  headerSave: {
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 22,
    paddingBottom: 40,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    marginLeft: 16,
  },
  sectionFooter: {
    fontSize: 12.5,
    marginHorizontal: 16,
    lineHeight: 17,
  },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13.5,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 46,
    gap: 8,
  },
  prefix: {
    fontSize: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  monoInput: {
    fontVariant: ['tabular-nums'],
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 46,
  },
  rowLabel: {
    fontSize: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 18,
    fontWeight: '500',
  },
  stepValue: {
    fontSize: 15,
    fontWeight: '600',
    minWidth: 46,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  inlinePills: {
    flexDirection: 'row',
    gap: 8,
  },
  miniPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  reminderBlock: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  notesInput: {
    padding: 16,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
