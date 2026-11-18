import SwiftData
import SwiftUI

@main
struct ContasApp: App {
    var body: some Scene {
        WindowGroup {
            RootTabView()
        }
        .modelContainer(for: [BillEntry.self, RecurringBillRule.self])
    }
}

struct RootTabView: View {
    var body: some View {
        TabView {
            Tab("Contas", systemImage: "checklist") {
                HomeBillsView()
            }

            Tab("Fixas", systemImage: "repeat.circle") {
                SubscriptionsAndFixedView()
            }

            Tab("Histórico", systemImage: "chart.bar.xaxis") {
                HistoryView()
            }

            Tab("Ajustes", systemImage: "gearshape") {
                SettingsView()
            }
        }
    }
}
