import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { AppSettings, BillEntry } from '../types/bills';
import { formatBRL } from '../services/billService';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function syncLocalNotifications(
  entries: BillEntry[],
  settings: AppSettings
): Promise<void> {
  if (Platform.OS === 'web') return;

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.notificationsEnabled) return;

  const granted = await ensureNotificationPermission();
  if (!granted) return;

  const now = Date.now();

  for (const entry of entries) {
    if (entry.isPaid) continue;

    const due = new Date(entry.dueDate);
    const fireDate = new Date(
      due.getFullYear(),
      due.getMonth(),
      due.getDate() - entry.reminderDaysBefore,
      settings.reminderHour,
      settings.reminderMinute,
      0,
      0
    );

    if (fireDate.getTime() <= now) continue;

    const amountText = formatBRL(entry.amount);
    let body = `Vence em ${entry.reminderDaysBefore} dias • ${amountText}`;
    if (entry.reminderDaysBefore === 0) {
      body = `Vence hoje • ${amountText}`;
    } else if (entry.reminderDaysBefore === 1) {
      body = `Vence amanhã • ${amountText}`;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: entry.title,
        body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    });
  }
}
