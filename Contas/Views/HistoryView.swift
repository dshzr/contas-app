import Charts
import SwiftData
import SwiftUI

struct MonthlyChartPoint: Identifiable {
    let id: String
    let label: String
    let status: String
    let value: Double
}

struct HistoryView: View {
    @Query(sort: \BillEntry.dueDate, order: .reverse) private var allEntries: [BillEntry]

    @State private var searchText: String = ""
    @State private var statusFilter: HistoryStatusFilter = .all

    enum HistoryStatusFilter: String, CaseIterable, Identifiable {
        case all = "Tudo"
        case paid = "Pagas"
        case pending = "Pendentes"

        var id: String { rawValue }
    }

    private var filteredEntries: [BillEntry] {
        allEntries.filter { entry in
            let matchesSearch = searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                || entry.title.localizedCaseInsensitiveContains(searchText)
                || entry.category.label.localizedCaseInsensitiveContains(searchText)

            let matchesStatus: Bool
            switch statusFilter {
            case .all: matchesStatus = true
            case .paid: matchesStatus = entry.isPaid
            case .pending: matchesStatus = !entry.isPaid
            }

            return matchesSearch && matchesStatus
        }
    }

    private var groupedMonths: [(monthKey: String, title: String, entries: [BillEntry], totalPaid: Decimal)] {
        let grouped = Dictionary(grouping: filteredEntries, by: \.monthKey)
        return grouped.keys.sorted(by: >).compactMap { key in
            guard let items = grouped[key], let firstDate = items.first?.dueDate else { return nil }
            let paidSum = items.filter(\.isPaid).reduce(Decimal(0)) { $0 + $1.effectivePaidAmount }
            return (
                monthKey: key,
                title: MonthHelper.monthTitle(firstDate),
                entries: items.sorted { $0.dueDate > $1.dueDate },
                totalPaid: paidSum
            )
        }
    }

    private var chartPoints: [MonthlyChartPoint] {
        let calendar = Calendar.current
        let now = Date()
        var points: [MonthlyChartPoint] = []

        for offset in (-5...0) {
            let monthDate = MonthHelper.addingMonths(offset, to: now, calendar: calendar)
            let key = MonthHelper.monthKey(for: monthDate, calendar: calendar)
            let label = MonthHelper.shortMonthTitle(monthDate)
            let items = allEntries.filter { $0.monthKey == key }

            let paidValue = items.filter(\.isPaid).reduce(0.0) {
                $0 + NSDecimalNumber(decimal: $1.effectivePaidAmount).doubleValue
            }
            let pendingValue = items.filter { !$0.isPaid }.reduce(0.0) {
                $0 + NSDecimalNumber(decimal: $1.amount).doubleValue
            }

            points.append(.init(id: "\(key)-paid", label: label, status: "Pago", value: paidValue))
            points.append(.init(id: "\(key)-pending", label: label, status: "Pendente", value: pendingValue))
        }
        return points
    }

    var body: some View {
        NavigationStack {
            List {
                if !allEntries.isEmpty {
                    Section("Últimos 6 meses") {
                        Chart(chartPoints) { point in
                            BarMark(
                                x: .value("Mês", point.label),
                                y: .value("Valor", point.value)
                            )
                            .foregroundStyle(by: .value("Status", point.status))
                            .cornerRadius(4)
                        }
                        .chartForegroundStyleScale([
                            "Pago": Color.green,
                            "Pendente": Color.orange
                        ])
                        .frame(height: 180)
                        .padding(.vertical, 8)
                    }

                    Section {
                        Picker("Status", selection: $statusFilter) {
                            ForEach(HistoryStatusFilter.allCases) { filter in
                                Text(filter.rawValue).tag(filter)
                            }
                        }
                        .pickerStyle(.segmented)
                    }
                }

                if groupedMonths.isEmpty {
                    Section {
                        ContentUnavailableView {
                            Label("Sem histórico", systemImage: "clock.arrow.circlepath")
                        } description: {
                            Text(allEntries.isEmpty
                                 ? "Seu histórico de pagamentos aparecerá aqui conforme os meses forem registrados."
                                 : "Nenhum lançamento encontrado para a busca atual.")
                        }
                        .padding(.vertical, 12)
                    }
                } else {
                    ForEach(groupedMonths, id: \.monthKey) { group in
                        Section {
                            ForEach(group.entries) { entry in
                                HStack(spacing: 12) {
                                    Image(systemName: entry.category.systemImage)
                                        .font(.subheadline)
                                        .foregroundStyle(entry.category.tintColor)
                                        .frame(width: 28, height: 28)
                                        .background(entry.category.tintColor.opacity(0.14), in: RoundedRectangle(cornerRadius: 7, style: .continuous))

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(entry.title)
                                            .font(.body.weight(.medium))
                                        Text(entry.relativeDueDescription())
                                            .font(.caption)
                                            .foregroundStyle(entry.isPaid ? .green : .secondary)
                                    }

                                    Spacer()

                                    Text(CurrencyFormatter.string(from: entry.isPaid ? entry.effectivePaidAmount : entry.amount))
                                        .font(.subheadline.weight(.semibold))
                                        .monospacedDigit()
                                        .foregroundStyle(entry.isPaid ? .primary : .secondary)
                                }
                            }
                        } header: {
                            HStack {
                                Text(group.title)
                                Spacer()
                                Text("Pago: \(CurrencyFormatter.string(from: group.totalPaid))")
                                    .font(.caption)
                                    .textCase(.none)
                            }
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Histórico")
            .searchable(text: $searchText, prompt: "Buscar conta ou categoria")
        }
    }
}
