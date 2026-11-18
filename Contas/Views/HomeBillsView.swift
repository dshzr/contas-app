import SwiftUI
import SwiftData

enum HomeBillFilter: String, CaseIterable, Identifiable {
    case all = "Todas"
    case pending = "Pendentes"
    case subscriptions = "Assinaturas"
    case recurring = "Recorrentes"
    case manual = "Manuais"

    var id: String { rawValue }
}

struct HomeBillsView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \BillEntry.dueDate, order: .forward) private var allEntries: [BillEntry]

    @AppStorage("notificationsEnabled") private var notificationsEnabled = true
    @AppStorage("reminderHour") private var reminderHour = 9
    @AppStorage("reminderMinute") private var reminderMinute = 0

    @State private var selectedMonth: Date = MonthHelper.startOfMonth(for: Date())
    @State private var selectedFilter: HomeBillFilter = .all
    @State private var showPaidSection: Bool = false
    @State private var isPresentingAdd = false
    @State private var editingEntry: BillEntry?
    @State private var variablePaymentEntry: BillEntry?
    @State private var variableAmountText: String = ""
    @State private var hapticToggleCount = 0

    private var selectedMonthKey: String {
        MonthHelper.monthKey(for: selectedMonth)
    }

    private var isCurrentMonth: Bool {
        selectedMonthKey == MonthHelper.monthKey(for: Date())
    }

    private var monthEntries: [BillEntry] {
        allEntries.filter { $0.monthKey == selectedMonthKey }
    }

    private var filteredEntries: [BillEntry] {
        monthEntries.filter { entry in
            switch selectedFilter {
            case .all: return true
            case .pending: return !entry.isPaid
            case .subscriptions: return entry.kind == .subscription
            case .recurring: return entry.kind == .recurring
            case .manual: return entry.kind == .manual
            }
        }
    }

    private var summary: MonthlySummary {
        BillGenerationService.summarize(entries: monthEntries)
    }

    private func entries(for group: BillUrgencyGroup) -> [BillEntry] {
        filteredEntries
            .filter { $0.urgencyGroup() == group }
            .sorted { $0.dueDate < $1.dueDate }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        Button {
                            withAnimation {
                                selectedMonth = MonthHelper.addingMonths(-1, to: selectedMonth)
                            }
                        } label: {
                            Image(systemName: "chevron.left.circle.fill")
                                .font(.title3)
                                .foregroundStyle(.secondary)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Mês anterior")

                        Spacer()

                        VStack(spacing: 2) {
                            Text(MonthHelper.monthTitle(selectedMonth))
                                .font(.headline)
                            if !isCurrentMonth {
                                Button("Voltar para hoje") {
                                    withAnimation {
                                        selectedMonth = MonthHelper.startOfMonth(for: Date())
                                    }
                                }
                                .font(.caption)
                            }
                        }

                        Spacer()

                        Button {
                            withAnimation {
                                selectedMonth = MonthHelper.addingMonths(1, to: selectedMonth)
                            }
                        } label: {
                            Image(systemName: "chevron.right.circle.fill")
                                .font(.title3)
                                .foregroundStyle(.secondary)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Próximo mês")
                    }
                    .padding(.vertical, 2)

                    MonthlySummaryCard(summary: summary)
                }

                Section {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(HomeBillFilter.allCases) { filter in
                                Button {
                                    withAnimation(.snappy) {
                                        selectedFilter = filter
                                    }
                                } label: {
                                    Text(filter.rawValue)
                                        .font(.subheadline.weight(selectedFilter == filter ? .semibold : .regular))
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .background(
                                            selectedFilter == filter
                                                ? Color.accentColor
                                                : Color(.tertiarySystemFill),
                                            in: Capsule()
                                        )
                                        .foregroundStyle(selectedFilter == filter ? .white : .primary)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                }

                if filteredEntries.isEmpty {
                    Section {
                        ContentUnavailableView {
                            Label("Sem contas por aqui", systemImage: "checkmark.seal")
                        } description: {
                            Text(selectedFilter == .all
                                 ? "Adicione sua primeira conta ou assinatura para acompanhar o mês."
                                 : "Nenhuma conta encontrada para o filtro \"\(selectedFilter.rawValue)\".")
                        } actions: {
                            if selectedFilter == .all {
                                Button("Adicionar conta") {
                                    isPresentingAdd = true
                                }
                                .buttonStyle(.borderedProminent)
                            } else {
                                Button("Limpar filtro") {
                                    selectedFilter = .all
                                }
                            }
                        }
                        .padding(.vertical, 12)
                    }
                } else {
                    ForEach([BillUrgencyGroup.overdue, .dueSoon, .upcoming]) { group in
                        let items = entries(for: group)
                        if !items.isEmpty {
                            Section(group.title) {
                                ForEach(items) { entry in
                                    billRow(for: entry)
                                }
                            }
                        }
                    }

                    let paidItems = entries(for: .paid)
                    if !paidItems.isEmpty {
                        Section {
                            DisclosureGroup(
                                isExpanded: $showPaidSection,
                                content: {
                                    ForEach(paidItems) { entry in
                                        billRow(for: entry)
                                    }
                                },
                                label: {
                                    HStack {
                                        Text("Pagas")
                                            .font(.subheadline.weight(.semibold))
                                        Spacer()
                                        Text("\(paidItems.count)")
                                            .font(.caption.weight(.semibold))
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            )
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Contas")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        isPresentingAdd = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Adicionar conta")
                }
            }
            .sheet(isPresented: $isPresentingAdd) {
                AddEditBillSheet(defaultMonthDate: selectedMonth)
            }
            .sheet(item: $editingEntry) { entry in
                AddEditBillSheet(editingEntry: entry, defaultMonthDate: selectedMonth)
            }
            .alert("Confirmar valor pago", isPresented: Binding(
                get: { variablePaymentEntry != nil },
                set: { if !$0 { variablePaymentEntry = nil } }
            )) {
                TextField("Valor pago (ex: 198,40)", text: $variableAmountText)
                    .keyboardType(.decimalPad)
                Button("Confirmar pagamento") {
                    if let entry = variablePaymentEntry {
                        let value = CurrencyFormatter.parse(variableAmountText) ?? entry.amount
                        markPaid(entry, paidAmount: value)
                    }
                    variablePaymentEntry = nil
                }
                Button("Cancelar", role: .cancel) {
                    variablePaymentEntry = nil
                }
            } message: {
                if let entry = variablePaymentEntry {
                    Text("Informe o valor final pago para \(entry.title).")
                }
            }
            .sensoryFeedback(.success, trigger: hapticToggleCount)
            .task(id: selectedMonthKey) {
                _ = try? BillGenerationService.ensureRecurringEntries(for: selectedMonth, context: modelContext)
                await NotificationService.shared.syncNotifications(
                    for: monthEntries,
                    enabled: notificationsEnabled,
                    reminderHour: reminderHour,
                    reminderMinute: reminderMinute
                )
            }
        }
    }

    @ViewBuilder
    private func billRow(for entry: BillEntry) -> some View {
        BillRowView(entry: entry) {
            handleTogglePaid(entry)
        }
        .contentShape(Rectangle())
        .onTapGesture {
            editingEntry = entry
        }
        .swipeActions(edge: .leading, allowsFullSwipe: true) {
            Button {
                handleTogglePaid(entry)
            } label: {
                Label(
                    entry.isPaid ? "Desfazer" : "Pagar",
                    systemImage: entry.isPaid ? "arrow.uturn.backward" : "checkmark.circle"
                )
            }
            .tint(entry.isPaid ? .orange : .green)
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            Button(role: .destructive) {
                deleteEntry(entry)
            } label: {
                Label("Excluir", systemImage: "trash")
            }
        }
    }

    private func handleTogglePaid(_ entry: BillEntry) {
        if entry.isPaid {
            withAnimation {
                entry.isPaid = false
                entry.paidAt = nil
                entry.paidAmount = nil
            }
            try? modelContext.save()
            hapticToggleCount += 1
            Task {
                await NotificationService.shared.syncNotifications(
                    for: [entry],
                    enabled: notificationsEnabled,
                    reminderHour: reminderHour,
                    reminderMinute: reminderMinute
                )
            }
        } else if entry.isVariableAmount {
            let formatter = NumberFormatter()
            formatter.locale = Locale(identifier: "pt_BR")
            formatter.minimumFractionDigits = 2
            formatter.maximumFractionDigits = 2
            variableAmountText = formatter.string(from: entry.amount as NSDecimalNumber) ?? ""
            variablePaymentEntry = entry
        } else {
            markPaid(entry, paidAmount: entry.amount)
        }
    }

    private func markPaid(_ entry: BillEntry, paidAmount: Decimal) {
        withAnimation {
            entry.isPaid = true
            entry.paidAmount = paidAmount
            entry.paidAt = Date()
        }
        try? modelContext.save()
        hapticToggleCount += 1
        NotificationService.shared.cancelNotification(for: entry.id)
    }

    private func deleteEntry(_ entry: BillEntry) {
        NotificationService.shared.cancelNotification(for: entry.id)
        withAnimation {
            modelContext.delete(entry)
        }
        try? modelContext.save()
    }
}
