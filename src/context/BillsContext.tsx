import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  buildSampleData,
  createManualEntriesPayload,
  ensureRecurringEntriesForMonth,
  generateUUID,
  getMonthKey,
} from '../services/billService';
import { syncLocalNotifications } from '../services/notificationService';
import type {
  AppSettings,
  BillCategory,
  BillEntry,
  RecurrenceFrequency,
  RecurringBillRule,
} from '../types/bills';

const STORAGE_KEY_RULES = '@contas_rules_v1';
const STORAGE_KEY_ENTRIES = '@contas_entries_v1';
const STORAGE_KEY_SETTINGS = '@contas_settings_v1';

const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  defaultReminderDays: 1,
  reminderHour: 9,
  reminderMinute: 0,
};

interface BackupPayload {
  exportedAt: string;
  rules: RecurringBillRule[];
  entries: BillEntry[];
}

interface BillsContextValue {
  isReady: boolean;
  rules: RecurringBillRule[];
  entries: BillEntry[];
  settings: AppSettings;
  ensureMonthPopulated: (monthDate: Date) => void;
  addManualBill: (params: {
    title: string;
    amount: number;
    firstDueDate: Date;
    category: BillCategory;
    installments: number;
    reminderDaysBefore: number;
    notes: string;
  }) => void;
  addRecurringRule: (params: {
    title: string;
    defaultAmount: number;
    isVariableAmount: boolean;
    kind: 'recurring' | 'subscription';
    category: BillCategory;
    frequency: RecurrenceFrequency;
    dueDay: number;
    billingMonth?: number | null;
    reminderDaysBefore: number;
    notes: string;
    targetMonthDate: Date;
  }) => void;
  updateEntry: (id: string, patch: Partial<BillEntry>) => void;
  deleteEntry: (id: string) => void;
  markEntryPaid: (id: string, paidAmount?: number) => void;
  markEntryUnpaid: (id: string) => void;
  updateRule: (id: string, patch: Partial<RecurringBillRule>) => void;
  toggleRuleActive: (id: string) => void;
  deleteRule: (id: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  loadSampleData: () => void;
  buildBackupJSON: () => string;
  importBackupJSON: (raw: string) => { rules: number; entries: number };
}

const BillsContext = createContext<BillsContextValue | null>(null);

export function BillsProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [rules, setRules] = useState<RecurringBillRule[]>([]);
  const [entries, setEntries] = useState<BillEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [rawRules, rawEntries, rawSettings] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_RULES),
          AsyncStorage.getItem(STORAGE_KEY_ENTRIES),
          AsyncStorage.getItem(STORAGE_KEY_SETTINGS),
        ]);

        if (!mounted) return;
        const parsedRules: RecurringBillRule[] = rawRules ? JSON.parse(rawRules) : [];
        const parsedEntries: BillEntry[] = rawEntries ? JSON.parse(rawEntries) : [];
        const parsedSettings: AppSettings = rawSettings
          ? { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) }
          : DEFAULT_SETTINGS;

        const initialGenerated = ensureRecurringEntriesForMonth(
          new Date(),
          parsedRules,
          parsedEntries
        );
        const mergedEntries =
          initialGenerated.length > 0 ? [...parsedEntries, ...initialGenerated] : parsedEntries;

        setRules(parsedRules);
        setEntries(mergedEntries);
        setSettings(parsedSettings);
      } finally {
        if (mounted) setIsReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(rules)).catch(() => {});
  }, [isReady, rules]);

  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries)).catch(() => {});
    syncLocalNotifications(entries, settings).catch(() => {});
  }, [isReady, entries, settings]);

  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings)).catch(() => {});
  }, [isReady, settings]);

  const ensureMonthPopulated = useCallback(
    (monthDate: Date) => {
      setEntries((prev) => {
        const generated = ensureRecurringEntriesForMonth(monthDate, rules, prev);
        if (generated.length === 0) return prev;
        return [...prev, ...generated];
      });
    },
    [rules]
  );

  const addManualBill = useCallback(
    (params: {
      title: string;
      amount: number;
      firstDueDate: Date;
      category: BillCategory;
      installments: number;
      reminderDaysBefore: number;
      notes: string;
    }) => {
      const created = createManualEntriesPayload(params);
      setEntries((prev) => [...prev, ...created]);
    },
    []
  );

  const addRecurringRule = useCallback(
    (params: {
      title: string;
      defaultAmount: number;
      isVariableAmount: boolean;
      kind: 'recurring' | 'subscription';
      category: BillCategory;
      frequency: RecurrenceFrequency;
      dueDay: number;
      billingMonth?: number | null;
      reminderDaysBefore: number;
      notes: string;
      targetMonthDate: Date;
    }) => {
      const newRule: RecurringBillRule = {
        id: generateUUID(),
        title: params.title,
        defaultAmount: params.defaultAmount,
        isVariableAmount: params.isVariableAmount,
        kind: params.kind,
        category: params.category,
        frequency: params.frequency,
        dueDay: Math.min(Math.max(params.dueDay, 1), 31),
        billingMonth: params.frequency === 'yearly' ? (params.billingMonth ?? null) : null,
        reminderDaysBefore: params.reminderDaysBefore,
        isActive: true,
        notes: params.notes,
        createdAt: new Date().toISOString(),
      };

      setRules((prev) => [...prev, newRule]);
      setEntries((prev) => {
        const generated = ensureRecurringEntriesForMonth(params.targetMonthDate, [newRule], prev);
        return generated.length > 0 ? [...prev, ...generated] : prev;
      });
    },
    []
  );

  const updateEntry = useCallback((id: string, patch: Partial<BillEntry>) => {
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextDue = patch.dueDate ? new Date(patch.dueDate) : new Date(item.dueDate);
        return {
          ...item,
          ...patch,
          monthKey: patch.dueDate ? getMonthKey(nextDue) : item.monthKey,
        };
      })
    );
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const markEntryPaid = useCallback((id: string, paidAmount?: number) => {
    setEntries((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isPaid: true,
              paidAmount: paidAmount ?? item.amount,
              paidAt: new Date().toISOString(),
            }
          : item
      )
    );
  }, []);

  const markEntryUnpaid = useCallback((id: string) => {
    setEntries((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isPaid: false,
              paidAmount: null,
              paidAt: null,
            }
          : item
      )
    );
  }, []);

  const updateRule = useCallback((id: string, patch: Partial<RecurringBillRule>) => {
    setRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule))
    );
  }, []);

  const toggleRuleActive = useCallback((id: string) => {
    setRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, isActive: !rule.isActive } : rule))
    );
  }, []);

  const deleteRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((rule) => rule.id !== id));
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const loadSampleData = useCallback(() => {
    const sample = buildSampleData(new Date());
    setRules((prev) => [...prev, ...sample.rules]);
    setEntries((prev) => [...prev, ...sample.entries]);
  }, []);

  const buildBackupJSON = useCallback(() => {
    const payload: BackupPayload = {
      exportedAt: new Date().toISOString(),
      rules,
      entries,
    };
    return JSON.stringify(payload, null, 2);
  }, [rules, entries]);

  const importBackupJSON = useCallback(
    (raw: string) => {
      const parsed = JSON.parse(raw) as BackupPayload;
      if (!Array.isArray(parsed.rules) || !Array.isArray(parsed.entries)) {
        throw new Error('Formato de backup inválido.');
      }

      const existingRuleIds = new Set(rules.map((r) => r.id));
      const existingEntryIds = new Set(entries.map((e) => e.id));

      const newRules = parsed.rules.filter((r) => !existingRuleIds.has(r.id));
      const newEntries = parsed.entries.filter((e) => !existingEntryIds.has(e.id));

      if (newRules.length > 0) setRules((prev) => [...prev, ...newRules]);
      if (newEntries.length > 0) setEntries((prev) => [...prev, ...newEntries]);

      return { rules: newRules.length, entries: newEntries.length };
    },
    [rules, entries]
  );

  return (
    <BillsContext.Provider
      value={{
        isReady,
        rules,
        entries,
        settings,
        ensureMonthPopulated,
        addManualBill,
        addRecurringRule,
        updateEntry,
        deleteEntry,
        markEntryPaid,
        markEntryUnpaid,
        updateRule,
        toggleRuleActive,
        deleteRule,
        updateSettings,
        loadSampleData,
        buildBackupJSON,
        importBackupJSON,
      }}
    >
      {children}
    </BillsContext.Provider>
  );
}

export function useBills(): BillsContextValue {
  const ctx = useContext(BillsContext);
  if (!ctx) {
    throw new Error('useBills deve ser usado dentro de BillsProvider');
  }
  return ctx;
}
