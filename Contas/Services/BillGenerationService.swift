import Foundation
import SwiftData

struct MonthlySummary: Equatable {
    let totalAmount: Decimal
    let paidAmount: Decimal
    let remainingAmount: Decimal
    let totalCount: Int
    let paidCount: Int
    let pendingCount: Int
    let overdueCount: Int
    let subscriptionsAmount: Decimal

    var progress: Double {
        let total = NSDecimalNumber(decimal: totalAmount).doubleValue
        guard total > 0 else { return 0 }
        let paid = NSDecimalNumber(decimal: paidAmount).doubleValue
        return min(max(paid / total, 0), 1)
    }
}

enum BillGenerationService {
    /// Gera de forma idempotente as contas do mês informado a partir das regras recorrentes ativas.
    /// Retorna a quantidade de novas ocorrências inseridas.
    @discardableResult
    static func ensureRecurringEntries(
        for monthDate: Date,
        context: ModelContext,
        calendar: Calendar = .current
    ) throws -> Int {
        let targetKey = MonthHelper.monthKey(for: monthDate, calendar: calendar)
        let targetComps = calendar.dateComponents([.year, .month], from: monthDate)
        guard let year = targetComps.year, let month = targetComps.month else { return 0 }

        let rulesDescriptor = FetchDescriptor<RecurringBillRule>(
            predicate: #Predicate { $0.isActive == true }
        )
        let activeRules = try context.fetch(rulesDescriptor)
        if activeRules.isEmpty { return 0 }

        let existingDescriptor = FetchDescriptor<BillEntry>(
            predicate: #Predicate { $0.monthKey == targetKey }
        )
        let existingEntries = try context.fetch(existingDescriptor)
        let existingRuleIDs = Set(existingEntries.compactMap(\.recurringRuleID))

        var inserted = 0
        for rule in activeRules {
            if existingRuleIDs.contains(rule.id) { continue }

            // Regras anuais só geram no mês configurado (ou mês de criação se não informado)
            if rule.frequency == .yearly {
                let expectedMonth = rule.billingMonth ?? calendar.component(.month, from: rule.createdAt)
                if expectedMonth != month { continue }
            }

            // Não gerar em meses anteriores à criação da regra
            let ruleStartMonth = MonthHelper.startOfMonth(for: rule.createdAt, calendar: calendar)
            let targetStartMonth = MonthHelper.startOfMonth(for: monthDate, calendar: calendar)
            if targetStartMonth < ruleStartMonth { continue }

            let dueDate = MonthHelper.date(year: year, month: month, day: rule.dueDay, calendar: calendar)
            let entry = BillEntry(
                title: rule.title,
                amount: rule.defaultAmount,
                dueDate: dueDate,
                isPaid: false,
                isVariableAmount: rule.isVariableAmount,
                kind: rule.kind,
                category: rule.category,
                monthKey: targetKey,
                recurringRuleID: rule.id,
                reminderDaysBefore: rule.reminderDaysBefore,
                notes: rule.notes
            )
            context.insert(entry)
            inserted += 1
        }

        if inserted > 0 {
            try context.save()
        }
        return inserted
    }

    /// Cria uma conta manual única ou parcelada em N meses consecutivos.
    static func createManualEntries(
        title: String,
        amount: Decimal,
        firstDueDate: Date,
        category: BillCategory,
        installments: Int,
        reminderDaysBefore: Int,
        notes: String,
        context: ModelContext,
        calendar: Calendar = .current
    ) throws -> [BillEntry] {
        let count = max(installments, 1)
        let dueDay = calendar.component(.day, from: firstDueDate)
        var created: [BillEntry] = []

        for index in 0..<count {
            let monthDate = MonthHelper.addingMonths(index, to: firstDueDate, calendar: calendar)
            let comps = calendar.dateComponents([.year, .month], from: monthDate)
            let dueDate = MonthHelper.date(
                year: comps.year ?? 2026,
                month: comps.month ?? 1,
                day: dueDay,
                calendar: calendar
            )

            let entry = BillEntry(
                title: title,
                amount: amount,
                dueDate: dueDate,
                isPaid: false,
                isVariableAmount: false,
                kind: .manual,
                category: category,
                monthKey: MonthHelper.monthKey(for: dueDate, calendar: calendar),
                installmentIndex: count > 1 ? index + 1 : nil,
                installmentTotal: count > 1 ? count : nil,
                reminderDaysBefore: reminderDaysBefore,
                notes: notes
            )
            context.insert(entry)
            created.append(entry)
        }

        try context.save()
        return created
    }

    /// Calcula o resumo financeiro de uma lista de contas do mês.
    static func summarize(
        entries: [BillEntry],
        referenceDate: Date = Date(),
        calendar: Calendar = .current
    ) -> MonthlySummary {
        var total: Decimal = 0
        var paid: Decimal = 0
        var remaining: Decimal = 0
        var paidCount = 0
        var pendingCount = 0
        var overdueCount = 0
        var subscriptionsTotal: Decimal = 0

        let today = calendar.startOfDay(for: referenceDate)

        for entry in entries {
            let effectiveValue = entry.isPaid ? entry.effectivePaidAmount : entry.amount
            total += effectiveValue

            if entry.kind == .subscription {
                subscriptionsTotal += effectiveValue
            }

            if entry.isPaid {
                paid += effectiveValue
                paidCount += 1
            } else {
                remaining += entry.amount
                pendingCount += 1
                if calendar.startOfDay(for: entry.dueDate) < today {
                    overdueCount += 1
                }
            }
        }

        return MonthlySummary(
            totalAmount: total,
            paidAmount: paid,
            remainingAmount: remaining,
            totalCount: entries.count,
            paidCount: paidCount,
            pendingCount: pendingCount,
            overdueCount: overdueCount,
            subscriptionsAmount: subscriptionsTotal
        )
    }

    /// Insere dados de exemplo realistas (útil para primeira exploração ou teste rápido).
    static func seedSampleData(context: ModelContext, calendar: Calendar = .current) throws {
        let now = Date()
        let comps = calendar.dateComponents([.year, .month], from: now)
        let year = comps.year ?? 2026
        let month = comps.month ?? 11

        let aluguel = RecurringBillRule(
            title: "Aluguel",
            defaultAmount: Decimal(string: "1850.00")!,
            kind: .recurring,
            category: .housing,
            dueDay: 10,
            reminderDaysBefore: 3
        )
        let internet = RecurringBillRule(
            title: "Internet Fibra",
            defaultAmount: Decimal(string: "119.90")!,
            kind: .recurring,
            category: .utilities,
            dueDay: 15,
            reminderDaysBefore: 1
        )
        let luz = RecurringBillRule(
            title: "Energia Elétrica",
            defaultAmount: Decimal(string: "210.00")!,
            isVariableAmount: true,
            kind: .recurring,
            category: .utilities,
            dueDay: 20,
            reminderDaysBefore: 2
        )
        let icloud = RecurringBillRule(
            title: "iCloud+",
            defaultAmount: Decimal(string: "14.90")!,
            kind: .subscription,
            category: .software,
            dueDay: 5,
            reminderDaysBefore: 0
        )
        let streaming = RecurringBillRule(
            title: "Streaming",
            defaultAmount: Decimal(string: "44.90")!,
            kind: .subscription,
            category: .streaming,
            dueDay: 22,
            reminderDaysBefore: 1
        )

        [aluguel, internet, luz, icloud, streaming].forEach { context.insert($0) }
        try context.save()
        try ensureRecurringEntries(for: now, context: context, calendar: calendar)

        // Marca o iCloud do dia 5 como pago se o dia já passou
        let currentDay = calendar.component(.day, from: now)
        if currentDay > 5 {
            let key = MonthHelper.monthKey(for: now, calendar: calendar)
            let entries = try context.fetch(FetchDescriptor<BillEntry>(predicate: #Predicate { $0.monthKey == key }))
            if let icloudEntry = entries.first(where: { $0.title == "iCloud+" }) {
                icloudEntry.isPaid = true
                icloudEntry.paidAmount = icloudEntry.amount
                icloudEntry.paidAt = MonthHelper.date(year: year, month: month, day: 5, calendar: calendar)
            }
        }

        // Adiciona uma conta manual parcelada
        _ = try createManualEntries(
            title: "Revisão do Carro",
            amount: Decimal(string: "320.00")!,
            firstDueDate: MonthHelper.date(year: year, month: month, day: min(currentDay + 2, 28), calendar: calendar),
            category: .transport,
            installments: 2,
            reminderDaysBefore: 1,
            notes: "Parcelado em 2x no boleto",
            context: context,
            calendar: calendar
        )
    }
}

// MARK: - Backup JSON (Exportar / Restaurar)

struct AppBackupPayload: Codable {
    struct RuleDTO: Codable {
        var id: UUID
        var title: String
        var defaultAmount: Decimal
        var isVariableAmount: Bool
        var kindRaw: String
        var categoryRaw: String
        var frequencyRaw: String
        var dueDay: Int
        var billingMonth: Int?
        var reminderDaysBefore: Int
        var isActive: Bool
        var notes: String
        var createdAt: Date
    }

    struct EntryDTO: Codable {
        var id: UUID
        var title: String
        var amount: Decimal
        var paidAmount: Decimal?
        var dueDate: Date
        var paidAt: Date?
        var isPaid: Bool
        var isVariableAmount: Bool
        var kindRaw: String
        var categoryRaw: String
        var monthKey: String
        var recurringRuleID: UUID?
        var installmentIndex: Int?
        var installmentTotal: Int?
        var reminderDaysBefore: Int
        var notes: String
        var createdAt: Date
    }

    var exportedAt: Date
    var rules: [RuleDTO]
    var entries: [EntryDTO]
}

enum BackupService {
    static func exportJSON(context: ModelContext) throws -> Data {
        let rules = try context.fetch(FetchDescriptor<RecurringBillRule>())
        let entries = try context.fetch(FetchDescriptor<BillEntry>())

        let payload = AppBackupPayload(
            exportedAt: Date(),
            rules: rules.map {
                .init(
                    id: $0.id,
                    title: $0.title,
                    defaultAmount: $0.defaultAmount,
                    isVariableAmount: $0.isVariableAmount,
                    kindRaw: $0.kindRaw,
                    categoryRaw: $0.categoryRaw,
                    frequencyRaw: $0.frequencyRaw,
                    dueDay: $0.dueDay,
                    billingMonth: $0.billingMonth,
                    reminderDaysBefore: $0.reminderDaysBefore,
                    isActive: $0.isActive,
                    notes: $0.notes,
                    createdAt: $0.createdAt
                )
            },
            entries: entries.map {
                .init(
                    id: $0.id,
                    title: $0.title,
                    amount: $0.amount,
                    paidAmount: $0.paidAmount,
                    dueDate: $0.dueDate,
                    paidAt: $0.paidAt,
                    isPaid: $0.isPaid,
                    isVariableAmount: $0.isVariableAmount,
                    kindRaw: $0.kindRaw,
                    categoryRaw: $0.categoryRaw,
                    monthKey: $0.monthKey,
                    recurringRuleID: $0.recurringRuleID,
                    installmentIndex: $0.installmentIndex,
                    installmentTotal: $0.installmentTotal,
                    reminderDaysBefore: $0.reminderDaysBefore,
                    notes: $0.notes,
                    createdAt: $0.createdAt
                )
            }
        )

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        return try encoder.encode(payload)
    }

    static func importJSON(_ data: Data, context: ModelContext) throws -> (rules: Int, entries: Int) {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let payload = try decoder.decode(AppBackupPayload.self, from: data)

        let existingRules = Set(try context.fetch(FetchDescriptor<RecurringBillRule>()).map(\.id))
        let existingEntries = Set(try context.fetch(FetchDescriptor<BillEntry>()).map(\.id))

        var addedRules = 0
        for dto in payload.rules where !existingRules.contains(dto.id) {
            let rule = RecurringBillRule(
                id: dto.id,
                title: dto.title,
                defaultAmount: dto.defaultAmount,
                isVariableAmount: dto.isVariableAmount,
                kind: BillKind(rawValue: dto.kindRaw) ?? .recurring,
                category: BillCategory(rawValue: dto.categoryRaw) ?? .other,
                frequency: RecurrenceFrequency(rawValue: dto.frequencyRaw) ?? .monthly,
                dueDay: dto.dueDay,
                billingMonth: dto.billingMonth,
                reminderDaysBefore: dto.reminderDaysBefore,
                isActive: dto.isActive,
                notes: dto.notes,
                createdAt: dto.createdAt
            )
            context.insert(rule)
            addedRules += 1
        }

        var addedEntries = 0
        for dto in payload.entries where !existingEntries.contains(dto.id) {
            let entry = BillEntry(
                id: dto.id,
                title: dto.title,
                amount: dto.amount,
                paidAmount: dto.paidAmount,
                dueDate: dto.dueDate,
                paidAt: dto.paidAt,
                isPaid: dto.isPaid,
                isVariableAmount: dto.isVariableAmount,
                kind: BillKind(rawValue: dto.kindRaw) ?? .manual,
                category: BillCategory(rawValue: dto.categoryRaw) ?? .other,
                monthKey: dto.monthKey,
                recurringRuleID: dto.recurringRuleID,
                installmentIndex: dto.installmentIndex,
                installmentTotal: dto.installmentTotal,
                reminderDaysBefore: dto.reminderDaysBefore,
                notes: dto.notes,
                createdAt: dto.createdAt
            )
            context.insert(entry)
            addedEntries += 1
        }

        try context.save()
        return (addedRules, addedEntries)
    }
}
