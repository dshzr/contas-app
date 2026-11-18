import SwiftData
import XCTest
@testable import Contas

@MainActor
final class BillGenerationServiceTests: XCTestCase {
    private var container: ModelContainer!
    private var context: ModelContext!
    private var calendar: Calendar!

    override func setUpWithError() throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(
            for: BillEntry.self, RecurringBillRule.self,
            configurations: config
        )
        context = container.mainContext
        calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/Sao_Paulo")!
    }

    override func tearDownWithError() throws {
        container = nil
        context = nil
    }

    func testDueDayClampsToLastDayOfShortMonth() {
        let feb2026 = MonthHelper.date(year: 2026, month: 2, day: 31, calendar: calendar)
        XCTAssertEqual(calendar.component(.day, from: feb2026), 28)

        let feb2024 = MonthHelper.date(year: 2024, month: 2, day: 31, calendar: calendar)
        XCTAssertEqual(calendar.component(.day, from: feb2024), 29)
    }

    func testRecurringGenerationIsIdempotent() throws {
        let nov2026 = MonthHelper.date(year: 2026, month: 11, day: 1, calendar: calendar)
        let rule = RecurringBillRule(
            title: "iCloud+",
            defaultAmount: Decimal(string: "14.90")!,
            kind: .subscription,
            category: .software,
            dueDay: 15,
            createdAt: nov2026
        )
        context.insert(rule)
        try context.save()

        let firstInsert = try BillGenerationService.ensureRecurringEntries(for: nov2026, context: context, calendar: calendar)
        let secondInsert = try BillGenerationService.ensureRecurringEntries(for: nov2026, context: context, calendar: calendar)

        XCTAssertEqual(firstInsert, 1)
        XCTAssertEqual(secondInsert, 0)

        let entries = try context.fetch(FetchDescriptor<BillEntry>())
        XCTAssertEqual(entries.count, 1)
        XCTAssertEqual(entries.first?.monthKey, "2026-11")
    }

    func testCreateManualInstallmentsAcrossMonths() throws {
        let nov2026 = MonthHelper.date(year: 2026, month: 11, day: 10, calendar: calendar)
        let created = try BillGenerationService.createManualEntries(
            title: "Seguro",
            amount: Decimal(string: "250.00")!,
            firstDueDate: nov2026,
            category: .transport,
            installments: 3,
            reminderDaysBefore: 1,
            notes: "",
            context: context,
            calendar: calendar
        )

        XCTAssertEqual(created.count, 3)
        XCTAssertEqual(created.map(\.monthKey), ["2026-11", "2026-12", "2027-01"])
        XCTAssertEqual(created.map(\.installmentBadgeText), ["1/3", "2/3", "3/3"])
    }

    func testSummarizeCalculatesRemainingPaidAndOverdue() throws {
        let ref = MonthHelper.date(year: 2026, month: 11, day: 15, calendar: calendar)
        let overdue = BillEntry(
            title: "Internet",
            amount: Decimal(string: "100.00")!,
            dueDate: MonthHelper.date(year: 2026, month: 11, day: 10, calendar: calendar),
            isPaid: false
        )
        let paidVariable = BillEntry(
            title: "Luz",
            amount: Decimal(string: "200.00")!,
            paidAmount: Decimal(string: "180.00")!,
            dueDate: MonthHelper.date(year: 2026, month: 11, day: 12, calendar: calendar),
            isPaid: true
        )
        let upcomingSub = BillEntry(
            title: "Streaming",
            amount: Decimal(string: "50.00")!,
            dueDate: MonthHelper.date(year: 2026, month: 11, day: 20, calendar: calendar),
            isPaid: false,
            kind: .subscription
        )

        let summary = BillGenerationService.summarize(
            entries: [overdue, paidVariable, upcomingSub],
            referenceDate: ref,
            calendar: calendar
        )

        XCTAssertEqual(summary.paidAmount, Decimal(string: "180.00")!)
        XCTAssertEqual(summary.remainingAmount, Decimal(string: "150.00")!)
        XCTAssertEqual(summary.totalAmount, Decimal(string: "330.00")!)
        XCTAssertEqual(summary.overdueCount, 1)
        XCTAssertEqual(summary.paidCount, 1)
        XCTAssertEqual(summary.pendingCount, 2)
        XCTAssertEqual(summary.subscriptionsAmount, Decimal(string: "50.00")!)
    }

    func testCurrencyParserSupportsBrazilianAndDecimalInput() {
        XCTAssertEqual(CurrencyFormatter.parse("149,90"), Decimal(string: "149.90"))
        XCTAssertEqual(CurrencyFormatter.parse("1.250,50"), Decimal(string: "1250.50"))
        XCTAssertEqual(CurrencyFormatter.parse("R$ 99,00"), Decimal(string: "99.00"))
    }
}
