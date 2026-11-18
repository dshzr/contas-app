import Foundation
import UserNotifications

@MainActor
final class NotificationService {
    static let shared = NotificationService()

    private let center = UNUserNotificationCenter.current()

    private init() {}

    func authorizationStatus() async -> UNAuthorizationStatus {
        let settings = await center.notificationSettings()
        return settings.authorizationStatus
    }

    @discardableResult
    func requestAuthorizationIfNeeded() async -> Bool {
        let status = await authorizationStatus()
        switch status {
        case .authorized, .provisional, .ephemeral:
            return true
        case .notDetermined:
            do {
                return try await center.requestAuthorization(options: [.alert, .sound, .badge])
            } catch {
                return false
            }
        case .denied:
            return false
        @unknown default:
            return false
        }
    }

    func syncNotifications(
        for entries: [BillEntry],
        enabled: Bool,
        reminderHour: Int,
        reminderMinute: Int
    ) async {
        guard enabled else {
            center.removeAllPendingNotificationRequests()
            return
        }

        let granted = await requestAuthorizationIfNeeded()
        guard granted else { return }

        let now = Date()
        let calendar = Calendar.current

        for entry in entries {
            let identifier = notificationID(for: entry.id)
            center.removePendingNotificationRequests(withIdentifiers: [identifier])

            if entry.isPaid { continue }

            guard let targetDate = calendar.date(
                byAdding: .day,
                value: -entry.reminderDaysBefore,
                to: entry.dueDate
            ) else { continue }

            var comps = calendar.dateComponents([.year, .month, .day], from: targetDate)
            comps.hour = reminderHour
            comps.minute = reminderMinute
            comps.second = 0

            guard let fireDate = calendar.date(from: comps), fireDate > now else {
                continue
            }

            let content = UNMutableNotificationContent()
            content.title = entry.title
            let amountText = CurrencyFormatter.string(from: entry.amount)
            if entry.reminderDaysBefore == 0 {
                content.body = "Vence hoje • \(amountText)"
            } else if entry.reminderDaysBefore == 1 {
                content.body = "Vence amanhã • \(amountText)"
            } else {
                content.body = "Vence em \(entry.reminderDaysBefore) dias • \(amountText)"
            }
            content.sound = .default

            let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
            let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)
            try? await center.add(request)
        }
    }

    func cancelNotification(for entryID: UUID) {
        center.removePendingNotificationRequests(withIdentifiers: [notificationID(for: entryID)])
    }

    private func notificationID(for entryID: UUID) -> String {
        "bill-reminder-\(entryID.uuidString)"
    }
}
