import type { ApplePalette } from '../theme/appleColors';

export type BillKind = 'manual' | 'recurring' | 'subscription';

export type BillCategory =
  | 'housing'
  | 'utilities'
  | 'streaming'
  | 'software'
  | 'card'
  | 'health'
  | 'education'
  | 'transport'
  | 'other';

export type RecurrenceFrequency = 'monthly' | 'yearly';

export type BillUrgencyGroup = 'overdue' | 'dueSoon' | 'upcoming' | 'paid';

export interface RecurringBillRule {
  id: string;
  title: string;
  defaultAmount: number;
  isVariableAmount: boolean;
  kind: 'recurring' | 'subscription';
  category: BillCategory;
  frequency: RecurrenceFrequency;
  dueDay: number;
  billingMonth?: number | null;
  reminderDaysBefore: number;
  isActive: boolean;
  notes: string;
  createdAt: string; // ISO
}

export interface BillEntry {
  id: string;
  title: string;
  amount: number;
  paidAmount?: number | null;
  dueDate: string; // ISO
  paidAt?: string | null;
  isPaid: boolean;
  isVariableAmount: boolean;
  kind: BillKind;
  category: BillCategory;
  monthKey: string; // YYYY-MM
  recurringRuleID?: string | null;
  installmentIndex?: number | null;
  installmentTotal?: number | null;
  reminderDaysBefore: number;
  notes: string;
  createdAt: string; // ISO
}

export interface AppSettings {
  notificationsEnabled: boolean;
  defaultReminderDays: number;
  reminderHour: number;
  reminderMinute: number;
}

export interface MonthlySummary {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  subscriptionsAmount: number;
  progress: number;
}

export const BILL_KIND_META: Record<BillKind, { label: string; symbol: string }> = {
  manual: { label: 'Manual', symbol: 'doc.text' },
  recurring: { label: 'Recorrente', symbol: 'arrow.clockwise' },
  subscription: { label: 'Assinatura', symbol: 'repeat.circle' },
};

export const BILL_CATEGORY_META: Record<
  BillCategory,
  { label: string; symbol: string; colorKey: keyof ApplePalette }
> = {
  housing: { label: 'Moradia', symbol: 'house.fill', colorKey: 'blue' },
  utilities: { label: 'Luz, Água & Net', symbol: 'bolt.fill', colorKey: 'orange' },
  streaming: { label: 'Streaming', symbol: 'play.tv.fill', colorKey: 'purple' },
  software: { label: 'Apps & Nuvem', symbol: 'icloud.fill', colorKey: 'indigo' },
  card: { label: 'Cartão', symbol: 'creditcard.fill', colorKey: 'teal' },
  health: { label: 'Saúde', symbol: 'heart.fill', colorKey: 'red' },
  education: { label: 'Educação', symbol: 'book.fill', colorKey: 'cyan' },
  transport: { label: 'Transporte', symbol: 'car.fill', colorKey: 'mint' },
  other: { label: 'Outros', symbol: 'tray.fill', colorKey: 'gray' },
};

export const ALL_CATEGORIES: BillCategory[] = [
  'housing',
  'utilities',
  'streaming',
  'software',
  'card',
  'health',
  'education',
  'transport',
  'other',
];

export const URGENCY_GROUP_TITLES: Record<BillUrgencyGroup, string> = {
  overdue: 'Atrasadas',
  dueSoon: 'Vence hoje ou em breve',
  upcoming: 'Ainda este mês',
  paid: 'Pagas',
};
