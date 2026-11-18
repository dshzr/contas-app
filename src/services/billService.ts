import type {
  BillCategory,
  BillEntry,
  BillUrgencyGroup,
  MonthlySummary,
  RecurringBillRule,
} from '../types/bills';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const SHORT_MONTH_NAMES = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function formatBRL(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function parseBRLInput(input: string): number | null {
  const cleaned = input.replace(/R\$/g, '').replace(/\s+/g, '').trim();
  if (!cleaned) return null;

  let normalized = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.');
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}

export function numberToInputBRL(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
}

export function addMonths(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1, 12, 0, 0, 0);
}

export function clampedDate(year: number, monthIndex0: number, day: number): Date {
  const lastDayOfMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  const safeDay = Math.min(Math.max(day, 1), lastDayOfMonth);
  return new Date(year, monthIndex0, safeDay, 12, 0, 0, 0);
}

export function formatMonthTitle(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} de ${date.getFullYear()}`;
}

export function formatShortMonthTitle(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2);
  return `${SHORT_MONTH_NAMES[date.getMonth()]}/${yy}`;
}

export function formatShortDayMonth(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getUrgencyGroup(entry: BillEntry, referenceDate = new Date()): BillUrgencyGroup {
  if (entry.isPaid) return 'paid';
  const today = startOfDay(referenceDate).getTime();
  const due = startOfDay(new Date(entry.dueDate)).getTime();
  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'dueSoon';
  return 'upcoming';
}

export function getRelativeDueDescription(entry: BillEntry, referenceDate = new Date()): string {
  if (entry.isPaid) {
    if (entry.paidAt) {
      return `Paga em ${formatShortDayMonth(new Date(entry.paidAt))}`;
    }
    return 'Paga';
  }
  const today = startOfDay(referenceDate).getTime();
  const dueDate = new Date(entry.dueDate);
  const due = startOfDay(dueDate).getTime();
  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

  if (diffDays < -1) return `Atrasada há ${-diffDays} dias`;
  if (diffDays === -1) return 'Venceu ontem';
  if (diffDays === 0) return 'Vence hoje';
  if (diffDays === 1) return 'Vence amanhã';
  if (diffDays <= 7) return `Vence em ${diffDays} dias (${formatShortDayMonth(dueDate)})`;
  return `Vence em ${formatShortDayMonth(dueDate)}`;
}

export function ensureRecurringEntriesForMonth(
  monthDate: Date,
  rules: RecurringBillRule[],
  existingEntries: BillEntry[]
): BillEntry[] {
  const targetKey = getMonthKey(monthDate);
  const year = monthDate.getFullYear();
  const monthIndex0 = monthDate.getMonth();
  const monthNumber = monthIndex0 + 1;

  const existingRuleIds = new Set(
    existingEntries
      .filter((e) => e.monthKey === targetKey && e.recurringRuleID)
      .map((e) => e.recurringRuleID as string)
  );

  const targetMonthStart = startOfMonth(monthDate).getTime();
  const created: BillEntry[] = [];

  for (const rule of rules) {
    if (!rule.isActive) continue;
    if (existingRuleIds.has(rule.id)) continue;

    const ruleCreatedDate = new Date(rule.createdAt);
    const ruleStartMonth = startOfMonth(ruleCreatedDate).getTime();
    if (targetMonthStart < ruleStartMonth) continue;

    if (rule.frequency === 'yearly') {
      const expectedMonth = rule.billingMonth ?? ruleCreatedDate.getMonth() + 1;
      if (expectedMonth !== monthNumber) continue;
    }

    const dueDate = clampedDate(year, monthIndex0, rule.dueDay);
    created.push({
      id: generateUUID(),
      title: rule.title,
      amount: rule.defaultAmount,
      paidAmount: null,
      dueDate: dueDate.toISOString(),
      paidAt: null,
      isPaid: false,
      isVariableAmount: rule.isVariableAmount,
      kind: rule.kind,
      category: rule.category,
      monthKey: targetKey,
      recurringRuleID: rule.id,
      installmentIndex: null,
      installmentTotal: null,
      reminderDaysBefore: rule.reminderDaysBefore,
      notes: rule.notes,
      createdAt: new Date().toISOString(),
    });
  }

  return created;
}

export function createManualEntriesPayload(params: {
  title: string;
  amount: number;
  firstDueDate: Date;
  category: BillCategory;
  installments: number;
  reminderDaysBefore: number;
  notes: string;
}): BillEntry[] {
  const count = Math.max(params.installments, 1);
  const dueDay = params.firstDueDate.getDate();
  const created: BillEntry[] = [];

  for (let i = 0; i < count; i++) {
    const monthDate = addMonths(params.firstDueDate, i);
    const dueDate = clampedDate(monthDate.getFullYear(), monthDate.getMonth(), dueDay);
    created.push({
      id: generateUUID(),
      title: params.title,
      amount: params.amount,
      paidAmount: null,
      dueDate: dueDate.toISOString(),
      paidAt: null,
      isPaid: false,
      isVariableAmount: false,
      kind: 'manual',
      category: params.category,
      monthKey: getMonthKey(dueDate),
      recurringRuleID: null,
      installmentIndex: count > 1 ? i + 1 : null,
      installmentTotal: count > 1 ? count : null,
      reminderDaysBefore: params.reminderDaysBefore,
      notes: params.notes,
      createdAt: new Date().toISOString(),
    });
  }

  return created;
}

export function summarizeMonth(entries: BillEntry[], referenceDate = new Date()): MonthlySummary {
  let totalAmount = 0;
  let paidAmount = 0;
  let remainingAmount = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  let subscriptionsAmount = 0;

  const today = startOfDay(referenceDate).getTime();

  for (const entry of entries) {
    const effective = entry.isPaid ? (entry.paidAmount ?? entry.amount) : entry.amount;
    totalAmount += effective;

    if (entry.kind === 'subscription') {
      subscriptionsAmount += effective;
    }

    if (entry.isPaid) {
      paidAmount += effective;
      paidCount += 1;
    } else {
      remainingAmount += entry.amount;
      pendingCount += 1;
      if (startOfDay(new Date(entry.dueDate)).getTime() < today) {
        overdueCount += 1;
      }
    }
  }

  const progress = totalAmount > 0 ? Math.min(Math.max(paidAmount / totalAmount, 0), 1) : 0;

  return {
    totalAmount,
    paidAmount,
    remainingAmount,
    totalCount: entries.length,
    paidCount,
    pendingCount,
    overdueCount,
    subscriptionsAmount,
    progress,
  };
}

export function buildSampleData(referenceDate = new Date()): {
  rules: RecurringBillRule[];
  entries: BillEntry[];
} {
  const year = referenceDate.getFullYear();
  const monthIndex0 = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();
  const createdAt = startOfMonth(referenceDate).toISOString();

  const rules: RecurringBillRule[] = [
    {
      id: generateUUID(),
      title: 'Aluguel',
      defaultAmount: 1850,
      isVariableAmount: false,
      kind: 'recurring',
      category: 'housing',
      frequency: 'monthly',
      dueDay: 10,
      billingMonth: null,
      reminderDaysBefore: 3,
      isActive: true,
      notes: '',
      createdAt,
    },
    {
      id: generateUUID(),
      title: 'Internet Fibra',
      defaultAmount: 119.9,
      isVariableAmount: false,
      kind: 'recurring',
      category: 'utilities',
      frequency: 'monthly',
      dueDay: 15,
      billingMonth: null,
      reminderDaysBefore: 1,
      isActive: true,
      notes: '',
      createdAt,
    },
    {
      id: generateUUID(),
      title: 'Energia Elétrica',
      defaultAmount: 210,
      isVariableAmount: true,
      kind: 'recurring',
      category: 'utilities',
      frequency: 'monthly',
      dueDay: 20,
      billingMonth: null,
      reminderDaysBefore: 2,
      isActive: true,
      notes: '',
      createdAt,
    },
    {
      id: generateUUID(),
      title: 'iCloud+',
      defaultAmount: 14.9,
      isVariableAmount: false,
      kind: 'subscription',
      category: 'software',
      frequency: 'monthly',
      dueDay: 5,
      billingMonth: null,
      reminderDaysBefore: 0,
      isActive: true,
      notes: '',
      createdAt,
    },
    {
      id: generateUUID(),
      title: 'Streaming',
      defaultAmount: 44.9,
      isVariableAmount: false,
      kind: 'subscription',
      category: 'streaming',
      frequency: 'monthly',
      dueDay: 22,
      billingMonth: null,
      reminderDaysBefore: 1,
      isActive: true,
      notes: '',
      createdAt,
    },
  ];

  const generated = ensureRecurringEntriesForMonth(referenceDate, rules, []).map((entry) => {
    if (entry.title === 'iCloud+' && currentDay > 5) {
      return {
        ...entry,
        isPaid: true,
        paidAmount: entry.amount,
        paidAt: clampedDate(year, monthIndex0, 5).toISOString(),
      };
    }
    return entry;
  });

  const manual = createManualEntriesPayload({
    title: 'Revisão do Carro',
    amount: 320,
    firstDueDate: clampedDate(year, monthIndex0, Math.min(currentDay + 2, 28)),
    category: 'transport',
    installments: 2,
    reminderDaysBefore: 1,
    notes: 'Parcelado em 2x no boleto',
  });

  return {
    rules,
    entries: [...generated, ...manual],
  };
}
