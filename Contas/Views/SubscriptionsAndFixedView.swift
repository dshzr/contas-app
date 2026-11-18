import SwiftUI
import SwiftData

struct SubscriptionsAndFixedView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \RecurringBillRule.dueDay, order: .forward) private var rules: [RecurringBillRule]

    @State private var isPresentingAdd = false
    @State private var addInitialKind: BillKind = .subscription
    @State private var editingRule: RecurringBillRule?

    private var activeSubscriptions: [RecurringBillRule] {
        rules.filter { $0.isActive && $0.kind == .subscription }
    }

    private var activeRecurring: [RecurringBillRule] {
        rules.filter { $0.isActive && $0.kind == .recurring }
    }

    private var pausedRules: [RecurringBillRule] {
        rules.filter { !$0.isActive }
    }

    private var monthlySubscriptionsTotal: Decimal {
        activeSubscriptions.reduce(0) { sum, rule in
            sum + (rule.frequency == .yearly ? rule.defaultAmount / 12 : rule.defaultAmount)
        }
    }

    private var yearlySubscriptionsTotal: Decimal {
        monthlySubscriptionsTotal * 12
    }

    private var monthlyRecurringTotal: Decimal {
        activeRecurring.reduce(0) { sum, rule in
            sum + (rule.frequency == .yearly ? rule.defaultAmount / 12 : rule.defaultAmount)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                if !rules.isEmpty {
                    Section {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Assinaturas / mês")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text(CurrencyFormatter.string(from: monthlySubscriptionsTotal))
                                    .font(.title3.weight(.bold))
                                    .monospacedDigit()
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 4) {
                                Text("Projeção anual")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text(CurrencyFormatter.string(from: yearlySubscriptionsTotal))
                                    .font(.title3.weight(.semibold))
                                    .monospacedDigit()
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 4)

                        HStack {
                            Text("Contas fixas / mês")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text(CurrencyFormatter.string(from: monthlyRecurringTotal))
                                .font(.subheadline.weight(.semibold))
                                .monospacedDigit()
                        }
                    } header: {
                        Text("Resumo estimado")
                    }
                }

                if rules.isEmpty {
                    Section {
                        ContentUnavailableView {
                            Label("Sem assinaturas ou fixas", systemImage: "repeat.circle")
                        } description: {
                            Text("Cadastre suas assinaturas e contas fixas para que sejam lembradas automaticamente todos os meses.")
                        } actions: {
                            Button("Adicionar assinatura") {
                                addInitialKind = .subscription
                                isPresentingAdd = true
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        .padding(.vertical, 12)
                    }
                } else {
                    if !activeSubscriptions.isEmpty {
                        Section("Assinaturas (\(activeSubscriptions.count))") {
                            ForEach(activeSubscriptions) { rule in
                                ruleRow(rule)
                            }
                        }
                    }

                    if !activeRecurring.isEmpty {
                        Section("Contas recorrentes (\(activeRecurring.count))") {
                            ForEach(activeRecurring) { rule in
                                ruleRow(rule)
                            }
                        }
                    }

                    if !pausedRules.isEmpty {
                        Section("Pausadas (\(pausedRules.count))") {
                            ForEach(pausedRules) { rule in
                                ruleRow(rule)
                            }
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Fixas")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Button {
                            addInitialKind = .subscription
                            isPresentingAdd = true
                        } label: {
                            Label("Nova assinatura", systemImage: "repeat.circle")
                        }
                        Button {
                            addInitialKind = .recurring
                            isPresentingAdd = true
                        } label: {
                            Label("Nova conta recorrente", systemImage: "arrow.clockwise")
                        }
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Adicionar recorrência")
                }
            }
            .sheet(isPresented: $isPresentingAdd) {
                AddEditBillSheet(initialKind: addInitialKind)
            }
            .sheet(item: $editingRule) { rule in
                AddEditBillSheet(editingRule: rule)
            }
        }
    }

    @ViewBuilder
    private func ruleRow(_ rule: RecurringBillRule) -> some View {
        HStack(spacing: 12) {
            Image(systemName: rule.category.systemImage)
                .font(.subheadline)
                .foregroundStyle(rule.isActive ? rule.category.tintColor : .secondary)
                .frame(width: 30, height: 30)
                .background(
                    (rule.isActive ? rule.category.tintColor : .gray).opacity(0.14),
                    in: RoundedRectangle(cornerRadius: 8, style: .continuous)
                )

            VStack(alignment: .leading, spacing: 3) {
                Text(rule.title)
                    .font(.body.weight(.medium))
                    .foregroundStyle(rule.isActive ? .primary : .secondary)

                Text("Dia \(rule.dueDay) • \(rule.frequency.label)\(rule.isVariableAmount ? " • Variável" : "")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Text(CurrencyFormatter.string(from: rule.defaultAmount))
                .font(.body.weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(rule.isActive ? .primary : .secondary)
        }
        .contentShape(Rectangle())
        .onTapGesture {
            editingRule = rule
        }
        .swipeActions(edge: .leading, allowsFullSwipe: true) {
            Button {
                withAnimation {
                    rule.isActive.toggle()
                }
                try? modelContext.save()
            } label: {
                Label(
                    rule.isActive ? "Pausar" : "Reativar",
                    systemImage: rule.isActive ? "pause.circle" : "play.circle"
                )
            }
            .tint(rule.isActive ? .orange : .green)
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            Button(role: .destructive) {
                withAnimation {
                    modelContext.delete(rule)
                }
                try? modelContext.save()
            } label: {
                Label("Excluir", systemImage: "trash")
            }
        }
    }
}
