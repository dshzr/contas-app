import SwiftData
import SwiftUI
import UniformTypeIdentifiers

struct JSONBackupDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }

    var data: Data

    init(data: Data = Data()) {
        self.data = data
    }

    init(configuration: ReadConfiguration) throws {
        self.data = configuration.file.regularFileContents ?? Data()
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}

struct SettingsView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var allEntries: [BillEntry]

    @AppStorage("notificationsEnabled") private var notificationsEnabled = true
    @AppStorage("defaultReminderDays") private var defaultReminderDays = 1
    @AppStorage("reminderHour") private var reminderHour = 9
    @AppStorage("reminderMinute") private var reminderMinute = 0

    @State private var isExporting = false
    @State private var isImporting = false
    @State private var exportDocument = JSONBackupDocument()
    @State private var feedbackMessage: String?
    @State private var showFeedbackAlert = false

    private var reminderTimeBinding: Binding<Date> {
        Binding(
            get: {
                var comps = DateComponents()
                comps.hour = reminderHour
                comps.minute = reminderMinute
                return Calendar.current.date(from: comps) ?? Date()
            },
            set: { newDate in
                let comps = Calendar.current.dateComponents([.hour, .minute], from: newDate)
                reminderHour = comps.hour ?? 9
                reminderMinute = comps.minute ?? 0
                resyncNotifications()
            }
        )
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle("Lembretes de vencimento", isOn: $notificationsEnabled)
                        .onChange(of: notificationsEnabled) { _, _ in
                            resyncNotifications()
                        }

                    if notificationsEnabled {
                        DatePicker(
                            "Horário padrão",
                            selection: reminderTimeBinding,
                            displayedComponents: .hourAndMinute
                        )

                        Picker("Antecedência padrão", selection: $defaultReminderDays) {
                            Text("No dia").tag(0)
                            Text("1 dia antes").tag(1)
                            Text("2 dias antes").tag(2)
                            Text("3 dias antes").tag(3)
                            Text("7 dias antes").tag(7)
                        }
                    }
                } header: {
                    Text("Notificações locais")
                } footer: {
                    Text("Os lembretes são agendados localmente no iPhone, sem necessidade de conta paga ou servidor.")
                }

                Section {
                    Button {
                        prepareExport()
                    } label: {
                        Label("Exportar backup (JSON)", systemImage: "square.and.arrow.up")
                    }

                    Button {
                        isImporting = true
                    } label: {
                        Label("Restaurar backup (JSON)", systemImage: "square.and.arrow.down")
                    }
                } header: {
                    Text("Seus dados")
                } footer: {
                    Text("Todos os dados ficam salvos localmente no iPhone. Exporte um backup antes de trocar de aparelho ou reinstalar o app.")
                }

                Section("Testes rápidos") {
                    Button {
                        do {
                            try BillGenerationService.seedSampleData(context: modelContext)
                            feedbackMessage = "Contas de exemplo adicionadas ao mês atual."
                            showFeedbackAlert = true
                            resyncNotifications()
                        } catch {
                            feedbackMessage = "Não foi possível gerar os dados de exemplo."
                            showFeedbackAlert = true
                        }
                    } label: {
                        Label("Carregar contas de exemplo", systemImage: "sparkles")
                    }
                }

                Section {
                    LabeledContent("Armazenamento", value: "Local (SwiftData)")
                    LabeledContent("Instalação", value: "Xcode Personal Team (Grátis)")
                } header: {
                    Text("Sobre")
                } footer: {
                    Text("Na assinatura gratuita da Apple, o certificado do app expira a cada 7 dias. Basta conectar no Xcode e rodar novamente sem apagar o app para renovar mantendo seus dados.")
                }
            }
            .navigationTitle("Ajustes")
            .fileExporter(
                isPresented: $isExporting,
                document: exportDocument,
                contentType: .json,
                defaultFilename: "contas-backup-\(MonthHelper.monthKey(for: Date()))"
            ) { result in
                if case .failure(let error) = result {
                    feedbackMessage = "Erro ao exportar: \(error.localizedDescription)"
                    showFeedbackAlert = true
                }
            }
            .fileImporter(
                isPresented: $isImporting,
                allowedContentTypes: [.json],
                allowsMultipleSelection: false
            ) { result in
                handleImport(result)
            }
            .alert("Aviso", isPresented: $showFeedbackAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(feedbackMessage ?? "")
            }
        }
    }

    private func prepareExport() {
        do {
            let data = try BackupService.exportJSON(context: modelContext)
            exportDocument = JSONBackupDocument(data: data)
            isExporting = true
        } catch {
            feedbackMessage = "Erro ao gerar backup: \(error.localizedDescription)"
            showFeedbackAlert = true
        }
    }

    private func handleImport(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }
            let access = url.startAccessingSecurityScopedResource()
            defer {
                if access { url.stopAccessingSecurityScopedResource() }
            }
            do {
                let data = try Data(contentsOf: url)
                let imported = try BackupService.importJSON(data, context: modelContext)
                feedbackMessage = "Backup restaurado: \(imported.rules) recorrência(s) e \(imported.entries) lançamento(s) importados."
                showFeedbackAlert = true
                resyncNotifications()
            } catch {
                feedbackMessage = "Arquivo inválido ou corrompido: \(error.localizedDescription)"
                showFeedbackAlert = true
            }
        case .failure(let error):
            feedbackMessage = "Erro ao abrir arquivo: \(error.localizedDescription)"
            showFeedbackAlert = true
        }
    }

    private func resyncNotifications() {
        Task {
            await NotificationService.shared.syncNotifications(
                for: allEntries,
                enabled: notificationsEnabled,
                reminderHour: reminderHour,
                reminderMinute: reminderMinute
            )
        }
    }
}
