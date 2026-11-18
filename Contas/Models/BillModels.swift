import Foundation
import SwiftData
import SwiftUI

// MARK: - Enums de Domínio

enum BillKind: String, Codable, CaseIterable, Identifiable {
    case manual
    case recurring
    case subscription

    var id: String { rawValue }

    var label: String {
        switch self {
        case .manual: return "Manual"
        case .recurring: return "Recorrente"
        case .subscription: return "Assinatura"
        }
    }

    var systemImage: String {
        switch self {
        case .manual: return "doc.text"
        case .recurring: return "arrow.clockwise"
        case .subscription: return "repeat.circle"
        }
    }
}

enum BillCategory: String, Codable, CaseIterable, Identifiable {
    case housing
    case utilities
    case streaming
    case software
    case card
    case health
    case education
    case transport
    case other

    var id: String { rawValue }

    var label: String {
        switch self {
        case .housing: return "Moradia"
        case .utilities: return "Luz, Água & Net"
        case .streaming: return "Streaming"
        case .software: return "Apps & Nuvem"
        case .card: return "Cartão"
        case .health: return "Saúde"
        case .education: return "Educação"
        case .transport: return "Transporte"
        case .other: return "Outros"
        }
    }

    var systemImage: String {
        switch self {
        case .housing: return "house.fill"
        case .utilities: return "bolt.fill"
        case .streaming: return "play.tv.fill"
        case .software: return "icloud.fill"
        case .card: return "creditcard.fill"
        case .health: return "heart.fill"
        case .education: return "book.fill"
        case .transport: return "car.fill"
        case .other: return "tray.fill"
        }
    }

    var tintColor: Color {
        switch self {
        case .housing: return .blue
        case .utilities: return .orange
        case .streaming: return .purple
        case .software: return .indigo
        case .card: return .teal
        case .health: return .red
        case .education: return .cyan
        case .transport: return .mint
        case .other: return .gray
        }
    }
}

enum RecurrenceFrequency: String, Codable, CaseIterable, Identifiable {
    case monthly
    case yearly

    var id: String { rawValue }

    var label: String {
        switch self {
        case .monthly: return "Mensal"
        case .yearly: return "Anual"
        }
    }
}

enum BillUrgencyGroup: Int, CaseIterable, Identifiable {
    case overdue = 0
    case dueSoon = 1
    case upcoming = 2
    case paid = 3

    var id: Int { rawValue }

    var title: String {
        switch self {
        case .overdue: return "Atrasadas"
        case .dueSoon: return "Vence hoje ou em breve"
        case .upcoming: return "Ainda este mês"
        case .paid: return "Pagas"
        }
    }
}

// MARK: - Modelos SwiftData

@Model
final class RecurringBillRule {
    var id: UUID = UUID()
    var title: String = ""
    var defaultAmount: Decimal = 0
    var isVariableAmount: Bool = false
    var kindRaw: String = BillKind.recurring.rawValue
    var categoryRaw: String = BillCategory.other.rawValue
    var frequencyRaw: String = RecurrenceFrequency.monthly.rawValue
    var dueDay: Int = 10
    var billingMonth: Int?
    var reminderDaysBefore: Int = 1
    var isActive: Bool = true
    var notes: String = ""
    var createdAt: Date = Date()

    init(
        id: UUID = UUID(),
        title: String,
        defaultAmount: Decimal,
        isVariableAmount: Bool = false,
        kind: BillKind = .recurring,
        category: BillCategory = .other,
        frequency: RecurrenceFrequency = .monthly,
        dueDay: Int = 10,
        billingMonth: Int? = nil,
        reminderDaysBefore: Int = 1,
        isActive: Bool = true,
        notes: String = "",
        createdAt: Date = Date()
    ) {
        self.id = id
        self.title = title
        self.defaultAmount = defaultAmount
        self.isVariableAmount = isVariableAmount
        self.kindRaw = kind == .manual ? BillKind.recurring.rawValue : kind.rawValue
        self.categoryRaw = category.rawValue
        self.frequencyRaw = frequency.rawValue
        self.dueDay = min(max(dueDay, 1), 31)
        self.billingMonth = billingMonth
        self.reminderDaysBefore = max(reminderDaysBefore, 0)
        self.isActive = isActive
        self.notes = notes
        self.createdAt = createdAt
    }

    var kind: BillKind {
        get { BillKind(rawValue: kindRaw) ?? .recurring }
        set { kindRaw = newValue.rawValue }
    }

    var category: BillCategory {
        get { BillCategory(rawValue: categoryRaw) ?? .other }
        set { categoryRaw = newValue.rawValue }
    }

    var frequency: RecurrenceFrequency {
        get { RecurrenceFrequency(rawValue: frequencyRaw) ?? .monthly }
        set { frequencyRaw = newValue.rawValue }
    }
}

@Model
final class BillEntry {
    var id: UUID = UUID()
    var title: String = ""
    var amount: Decimal = 0
    var paidAmount: Decimal?
    var dueDate: Date = Date()
    var paidAt: Date?
    var isPaid: Bool = false
    var isVariableAmount: Bool = false
    var kindRaw: String = BillKind.manual.rawValue
    var categoryRaw: String = BillCategory.other.rawValue
    var monthKey: String = ""
    var recurringRuleID: UUID?
    var installmentIndex: Int?
    var installmentTotal: Int?
    var reminderDaysBefore: Int = 1
    var notes: String = ""
    var createdAt: Date = Date()

    init(
        id: UUID = UUID(),
        title: String,
        amount: Decimal,
        paidAmount: Decimal? = nil,
        dueDate: Date,
        paidAt: Date? = nil,
        isPaid: Bool = false,
        isVariableAmount: Bool = false,
        kind: BillKind = .manual,
        category: BillCategory = .other,
        monthKey: String? = nil,
        recurringRuleID: UUID? = nil,
        installmentIndex: Int? = nil,
        installmentTotal: Int? = nil,
        reminderDaysBefore: Int = 1,
        notes: String = "",
        createdAt: Date = Date()
    ) {
        self.id = id
        self.title = title
        self.amount = amount
        self.paidAmount = paidAmount
        self.dueDate = dueDate
        self.paidAt = paidAt
        self.isPaid = isPaid
        self.isVariableAmount = isVariableAmount
        self.kindRaw = kind.rawValue
        self.categoryRaw = category.rawValue
        self.monthKey = monthKey ?? MonthHelper.monthKey(for: dueDate)
        self.recurringRuleID = recurringRuleID
        self.installmentIndex = installmentIndex
        self.installmentTotal = installmentTotal
        self.reminderDaysBefore = max(reminderDaysBefore, 0)
        self.notes = notes
        self.createdAt = createdAt
    }

    var kind: BillKind {
        get { BillKind(rawValue: kindRaw) ?? .manual }
        set { kindRaw = newValue.rawValue }
    }

    var category: BillCategory {
        get { BillCategory(rawValue: categoryRaw) ?? .other }
        set { categoryRaw = newValue.rawValue }
    }

    var effectivePaidAmount: Decimal {
        paidAmount ?? amount
    }

    var installmentBadgeText: String? {
        guard let current = installmentIndex, let total = installmentTotal, total > 1 else {
            return nil
        }
        return "\(current)/\(total)"
    }

    func urgencyGroup(referenceDate: Date = Date(), calendar: Calendar = .current) -> BillUrgencyGroup {
        if isPaid { return .paid }
        let today = calendar.startOfDay(for: referenceDate)
        let dueDayStart = calendar.startOfDay(for: dueDate)
        if dueDayStart < today {
            return .overdue
        }
        let daysUntilDue = calendar.dateComponents([.day], from: today, to: dueDayStart).day ?? 0
        if daysUntilDue <= 3 {
            return .dueSoon
        }
        return .upcoming
    }

    func relativeDueDescription(referenceDate: Date = Date(), calendar: Calendar = .current) -> String {
        if isPaid {
            if let paidAt {
                return "Paga em \(MonthHelper.shortDayMonth(paidAt))"
            }
            return "Paga"
        }
        let today = calendar.startOfDay(for: referenceDate)
        let dueDayStart = calendar.startOfDay(for: dueDate)
        let diff = calendar.dateComponents([.day], from: today, to: dueDayStart).day ?? 0

        if diff < -1 {
            return "Atrasada há \(-diff) dias"
        } else if diff == -1 {
            return "Venceu ontem"
        } else if diff == 0 {
            return "Vence hoje"
        } else if diff == 1 {
            return "Vence amanhã"
        } else if diff <= 7 {
            return "Vence em \(diff) dias (\(MonthHelper.shortDayMonth(dueDate)))"
        } else {
            return "Vence em \(MonthHelper.shortDayMonth(dueDate))"
        }
    }
}

// MARK: - Formatadores e Helpers de Data

enum CurrencyFormatter {
    private static let brlFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.locale = Locale(identifier: "pt_BR")
        f.currencyCode = "BRL"
        f.maximumFractionDigits = 2
        f.minimumFractionDigits = 2
        return f
    }()

    static func string(from decimal: Decimal) -> String {
        brlFormatter.string(from: decimal as NSDecimalNumber) ?? "R$ 0,00"
    }

    static func parse(_ input: String) -> Decimal? {
        let cleaned = input
            .replacingOccurrences(of: "R$", with: "")
            .replacingOccurrences(of: " ", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        if cleaned.isEmpty { return nil }

        // Suporta entrada com vírgula decimal ("149,90" ou "1.200,50") e ponto ("149.90")
        let normalized: String
        if cleaned.contains(",") && cleaned.contains(".") {
            normalized = cleaned
                .replacingOccurrences(of: ".", with: "")
                .replacingOccurrences(of: ",", with: ".")
        } else if cleaned.contains(",") {
            normalized = cleaned.replacingOccurrences(of: ",", with: ".")
        } else {
            normalized = cleaned
        }
        return Decimal(string: normalized, locale: Locale(identifier: "en_US_POSIX"))
    }
}

enum MonthHelper {
    static let brLocale = Locale(identifier: "pt_BR")

    static func monthKey(for date: Date, calendar: Calendar = .current) -> String {
        let comps = calendar.dateComponents([.year, .month], from: date)
        let year = comps.year ?? 2026
        let month = comps.month ?? 1
        return String(format: "%04d-%02d", year, month)
    }

    static func startOfMonth(for date: Date, calendar: Calendar = .current) -> Date {
        let comps = calendar.dateComponents([.year, .month], from: date)
        return calendar.date(from: comps) ?? date
    }

    static func addingMonths(_ offset: Int, to date: Date, calendar: Calendar = .current) -> Date {
        let start = startOfMonth(for: date, calendar: calendar)
        return calendar.date(byAdding: .month, value: offset, to: start) ?? start
    }

    static func date(year: Int, month: Int, day: Int, calendar: Calendar = .current) -> Date {
        var comps = DateComponents()
        comps.year = year
        comps.month = month
        comps.day = 1
        guard let firstDay = calendar.date(from: comps),
              let range = calendar.range(of: .day, in: .month, for: firstDay) else {
            return Date()
        }
        let clampedDay = min(max(day, 1), range.count)
        comps.day = clampedDay
        comps.hour = 12
        return calendar.date(from: comps) ?? firstDay
    }

    static func monthTitle(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = brLocale
        formatter.dateFormat = "LLLL 'de' yyyy"
        let text = formatter.string(from: date)
        return text.prefix(1).uppercased() + text.dropFirst()
    }

    static func shortMonthTitle(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = brLocale
        formatter.dateFormat = "MMM/yy"
        return formatter.string(from: date).capitalized
    }

    static func shortDayMonth(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = brLocale
        formatter.dateFormat = "dd/MM"
        return formatter.string(from: date)
    }
}
