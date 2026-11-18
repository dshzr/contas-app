import SwiftUI
import SwiftData

struct AddEditBillSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    @AppStorage("notificationsEnabled") private var notificationsEnabled = true
    @AppStorage("defaultReminderDays") private var defaultReminderDays = 1
    @AppStorage("reminderHour") private var reminderHour = 9
    @AppStorage("reminderMinute") private var reminderMinute = 0

    private let editingEntry: BillEntry?
    private let editingRule: RecurringBillRule?
    private let defaultMonthDate: Date

    @State private var title: String = ""
    @State private var amountText: String = ""
    @State private var kind: BillKind = .manual
    @State private var category: BillCategory = .other
    @State private var dueDate: Date = Date()
    @State private var dueDay: Int = 10
    @State private var frequency: RecurrenceFrequency = .monthly
    @State private var billingMonth: Int = Calendar.current.component(.month, from: Date())
    @State private var isVariableAmount: Bool = false
    @State private var installments: Int = 1
    @State private var reminderDaysBefore: Int = 1
    @State private var notes: String = ""
    @State private var showValidationError = false

    init(
        editingEntry: BillEntry? = nil,
        editingRule: RecurringBillRule? = nil,
        defaultMonthDate: Date = Date(),
        initialKind: BillKind = .manual
    ) {
        self.editingEntry = editingEntry
        self.editingRule = editingRule
        self.defaultMonthDate = defaultMonthDate

        if let entry = editingEntry {
            _title = State(initialValue: entry.title)
            _amountText = State(initialValue: Self.decimalToInput(entry.amount))
            _kind = State(initialValue: entry.kind)
            _category = State(initialValue: entry.category)
            _dueDate = State(initialValue: entry.dueDate)
            _dueDay = State(initialValue: Calendar.current.component(.day, from: entry.dueDate))
            _isVariableAmount = State(initialValue: entry.isVariableAmount)
            _reminderDaysBefore = State(initialValue: entry.reminderDaysBefore)
            _notes = State(initialValue: entry.notes)
        } else if let rule = editingRule {
            _title = State(initialValue: rule.title)
            _amountText = State(initialValue: Self.decimalToInput(rule.defaultAmount))
            _kind = State(initialValue: rule.kind)
            _category = State(initialValue: rule.category)
            _dueDay = State(initialValue: rule.dueDay)
            _frequency = State(initialValue: rule.frequency)
            _billingMonth = State(initialValue: rule.billingMonth ?? Calendar.current.component(.month, from: Date()))
            _isVariableAmount = State(initialValue: rule.isVariableAmount)
            _reminderDaysBefore = State(initialValue: rule.reminderDaysBefore)
            _notes = State(initialValue: rule.notes)
        } else {
            _kind = State(initialValue: initialKind)
            _dueDate = State(initialValue: defaultMonthDate)
            _dueDay = State(initialValue: Calendar.current.component(.day, from: Date()))
            let savedDays = UserDefaults.standard.object(forKey: "defaultReminderDays") as? Int ?? 1
            _reminderDaysBefore = State(initialValue: savedDays)
        }
    }

    private var isEditing: Bool {
        editingEntry != nil || editingRule != nil
    }

    private var screenTitle: String {
        if editingEntry != nil { return "Editar Conta" }
        if editingRule != nil { return "Editar Recorrência" }
        return "Nova Conta"
    }

    private var parsedAmount: Decimal? {
        CurrencyFormatter.parse(amountText)
    }

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && (parsedAmount ?? 0) > 0
    }

    var body: some View {
        NavigationStack {
            Form {
                if !isEditing {
                    Section {
                        Picker("Tipo", selection: $kind) {
                            ForEach(BillKind.allCases) { item in
                                Text(item.label).tag(item)
                            }
                        }
                        .pickerStyle(.segmented)
                    } header: {
                        Text("Tipo de conta")
                    } footer: {
                        switch kind {
                        case .manual:
                            Text("Lançamento avulso ou parcelado para meses específicos.")
                        case .recurring:
                            Text("Contas fixas ou variáveis como aluguel, luz, internet.")
                        case .subscription:
                            Text("Serviços recorrentes como streaming, apps e academia.")
                        }
                    }
                }

                Section("Essencial") {
                    TextField("Nome (ex: Aluguel, Netflix, Luz)", text: $title)
                        .textInputAutocapitalization(.words)

                    HStack {
                        Text("R$")
                            .foregroundStyle(.secondary)
                        TextField("0,00", text: $amountText)
                            .keyboardType(.decimalPad)
                            .monospacedDigit()
                    }

                    if editingEntry != nil || kind == .manual {
                        DatePicker("Vencimento", selection: $dueDate, displayedComponents: .date)
                    } else {
                        Picker("Dia do vencimento", selection: $dueDay) {
                            ForEach(1...31, id: \.self) { day in
                                Text("Dia \(day)").tag(day)
                            }
                        }
                        Picker("Frequência", selection: $frequency) {
                            ForEach(RecurrenceFrequency.allCases) { freq in
                                Text(freq.label).tag(freq)
                            }
                        }
                        if frequency == .yearly {
                            Picker("Mês da cobrança", selection: $billingMonth) {
                                ForEach(1...12, id: \.self) { month in
                                    Text(Calendar.current.monthSymbols[month - 1].capitalized).tag(month)
                                }
                            }
                        }
                    }
                }

                Section("Categoria") {
                    Picker("Categoria", selection: $category) {
                        ForEach(BillCategory.allCases) { cat in
                            Label(cat.label, systemImage: cat.systemImage)
                                .tag(cat)
                        }
                    }
                }

                Section("Opções") {
                    if !isEditing && kind == .manual {
                        Stepper(
                            installments == 1 ? "Pagamento único" : "Parcelado em \(installments)x",
                            value: $installments,
                            in: 1...36
                        )
                    }

                    if kind != .manual && editingEntry == nil {
                        Toggle("Valor variável todo mês", isOn: $isVariableAmount)
                    }

                    Picker("Lembrar", selection: $reminderDaysBefore) {
                        Text("No dia do vencimento").tag(0)
                        Text("1 dia antes").tag(1)
                        Text("2 dias antes").tag(2)
                        Text("3 dias antes").tag(3)
                        Text("7 dias antes").tag(7)
                    }
                }

                Section("Observações") {
                    TextField("Opcional (ex: código, PIX, observação)", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }
            }
            .navigationTitle(screenTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Salvar") {
                        save()
                    }
                    .fontWeight(.semibold)
                    .disabled(!canSave)
                }
            }
            .alert("Confira os campos", isPresented: $showValidationError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("Informe um nome e um valor maior que zero.")
            }
        }
    }

    private func save() {
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedTitle.isEmpty, let amount = parsedAmount, amount > 0 else {
            showValidationError = true
            return
        }

        if let entry = editingEntry {
            entry.title = trimmedTitle
            entry.amount = amount
            entry.dueDate = dueDate
            entry.monthKey = MonthHelper.monthKey(for: dueDate)
            entry.category = category
            entry.reminderDaysBefore = reminderDaysBefore
            entry.notes = notes
            try? modelContext.save()

            Task {
                await NotificationService.shared.syncNotifications(
                    for: [entry],
                    enabled: notificationsEnabled,
                    reminderHour: reminderHour,
                    reminderMinute: reminderMinute
                )
            }
            dismiss()
            return
        }

        if let rule = editingRule {
            rule.title = trimmedTitle
            rule.defaultAmount = amount
            rule.isVariableAmount = isVariableAmount
            rule.category = category
            rule.frequency = frequency
            rule.dueDay = dueDay
            rule.billingMonth = frequency == .yearly ? billingMonth : nil
            rule.reminderDaysBefore = reminderDaysBefore
            rule.notes = notes
            try? modelContext.save()
            dismiss()
            return
        }

        if kind == .manual {
            let created = (try? BillGenerationService.createManualEntries(
                title: trimmedTitle,
                amount: amount,
                firstDueDate: dueDate,
                category: category,
                installments: installments,
                reminderDaysBefore: reminderDaysBefore,
                notes: notes,
                context: modelContext
            )) ?? []

            Task {
                await NotificationService.shared.syncNotifications(
                    for: created,
                    enabled: notificationsEnabled,
                    reminderHour: reminderHour,
                    reminderMinute: reminderMinute
                )
            }
        } else {
            let rule = RecurringBillRule(
                title: trimmedTitle,
                defaultAmount: amount,
                isVariableAmount: isVariableAmount,
                kind: kind,
                category: category,
                frequency: frequency,
                dueDay: dueDay,
                billingMonth: frequency == .yearly ? billingMonth : nil,
                reminderDaysBefore: reminderDaysBefore,
                isActive: true,
                notes: notes
            )
            modelContext.insert(rule)
            try? modelContext.save()
            _ = try? BillGenerationService.ensureRecurringEntries(for: defaultMonthDate, context: modelContext)
        }

        dismiss()
    }

    private static func decimalToInput(_ value: Decimal) -> String {
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter.string(from: value as NSDecimalNumber) ?? ""
    }
}
