import SwiftUI

struct BillRowView: View {
    let entry: BillEntry
    let onTogglePaid: () -> Void

    private var urgency: BillUrgencyGroup {
        entry.urgencyGroup()
    }

    private var dueColor: Color {
        switch urgency {
        case .overdue: return .red
        case .dueSoon: return .orange
        case .upcoming: return .secondary
        case .paid: return .green
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onTogglePaid) {
                Image(systemName: entry.isPaid ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(entry.isPaid ? .green : (urgency == .overdue ? .red : .secondary))
                    .contentTransition(.symbolEffect(.replace))
            }
            .buttonStyle(.plain)
            .accessibilityLabel(entry.isPaid ? "Marcar como não paga" : "Marcar como paga")

            Image(systemName: entry.category.systemImage)
                .font(.subheadline)
                .foregroundStyle(entry.category.tintColor)
                .frame(width: 30, height: 30)
                .background(entry.category.tintColor.opacity(0.14), in: RoundedRectangle(cornerRadius: 8, style: .continuous))

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(entry.title)
                        .font(.body.weight(.medium))
                        .strikethrough(entry.isPaid, color: .secondary)
                        .foregroundStyle(entry.isPaid ? .secondary : .primary)
                        .lineLimit(1)

                    if let installment = entry.installmentBadgeText {
                        Text(installment)
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(.tertiarySystemFill), in: Capsule())
                    } else if entry.kind != .manual {
                        Image(systemName: entry.kind.systemImage)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                HStack(spacing: 4) {
                    if urgency == .overdue {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.caption2)
                    }
                    Text(entry.relativeDueDescription())
                        .font(.caption)
                }
                .foregroundStyle(dueColor)
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 2) {
                Text(CurrencyFormatter.string(from: entry.isPaid ? entry.effectivePaidAmount : entry.amount))
                    .font(.body.weight(.semibold))
                    .monospacedDigit()
                    .foregroundStyle(entry.isPaid ? .secondary : .primary)

                if entry.isVariableAmount && !entry.isPaid {
                    Text("Variável")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 2)
    }
}
