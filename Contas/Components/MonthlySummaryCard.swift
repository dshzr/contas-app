import SwiftUI

struct MonthlySummaryCard: View {
    let summary: MonthlySummary

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Falta pagar")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    Text(CurrencyFormatter.string(from: summary.remainingAmount))
                        .font(.system(.largeTitle, design: .rounded, weight: .bold))
                        .monospacedDigit()
                        .foregroundStyle(summary.remainingAmount == 0 && summary.totalCount > 0 ? .green : .primary)
                }

                Spacer()

                if summary.overdueCount > 0 {
                    Label("\(summary.overdueCount) atrasada\(summary.overdueCount > 1 ? "s" : "")", systemImage: "exclamationmark.circle.fill")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.red)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(.red.opacity(0.12), in: Capsule())
                } else if summary.totalCount > 0 && summary.pendingCount == 0 {
                    Label("Tudo em dia", systemImage: "checkmark.circle.fill")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.green)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(.green.opacity(0.12), in: Capsule())
                }
            }

            if summary.totalCount > 0 {
                ProgressView(value: summary.progress)
                    .tint(summary.overdueCount > 0 ? .orange : .accentColor)

                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Pago (\(summary.paidCount)/\(summary.totalCount))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(CurrencyFormatter.string(from: summary.paidAmount))
                            .font(.subheadline.weight(.semibold))
                            .monospacedDigit()
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Total do mês")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(CurrencyFormatter.string(from: summary.totalAmount))
                            .font(.subheadline.weight(.semibold))
                            .monospacedDigit()
                    }
                }
            } else {
                Text("Nenhuma conta registrada para este mês.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}
