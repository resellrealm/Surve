import SwiftUI
import WatchKit

/// Post-game summary: final score, winner, duration, rematch option
struct GameSummaryView: View {
    @EnvironmentObject var gameManager: GameManager
    @Environment(\.dismiss) private var dismiss
    let game: WatchGame

    private var winner: String? {
        if game.teamAScore > game.teamBScore { return game.teamAName }
        if game.teamBScore > game.teamAScore { return game.teamBName }
        return nil
    }

    private var duration: String {
        guard let ended = game.endedAt else { return "—" }
        let interval = ended.timeIntervalSince(game.startedAt)
        let minutes = Int(interval) / 60
        let seconds = Int(interval) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Sport + result
                Text(game.sport.icon)
                    .font(.title)

                if let winner = winner {
                    Text("🏆 \(winner)")
                        .font(.headline)
                        .foregroundStyle(.green)
                } else {
                    Text("Draw!")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                }

                // Final score
                HStack(spacing: 16) {
                    VStack(spacing: 2) {
                        Text(game.teamAName)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                        Text("\(game.teamAScore)")
                            .font(.system(size: 36, weight: .light, design: .rounded))
                    }

                    Text("-")
                        .font(.title3)
                        .foregroundStyle(.tertiary)

                    VStack(spacing: 2) {
                        Text(game.teamBName)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                        Text("\(game.teamBScore)")
                            .font(.system(size: 36, weight: .light, design: .rounded))
                    }
                }

                // Duration
                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.caption2)
                    Text(duration)
                        .font(.caption)
                }
                .foregroundStyle(.secondary)

                // Rematch button
                Button {
                    WKInterfaceDevice.current().play(.start)
                    _ = gameManager.createGame(
                        sport: game.sport,
                        teamA: game.teamAName,
                        teamB: game.teamBName
                    )
                    dismiss()
                } label: {
                    HStack {
                        Image(systemName: "arrow.triangle.2.circlepath")
                        Text("Rematch")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.blue)
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("Summary")
    }
}

#Preview {
    NavigationStack {
        GameSummaryView(game: WatchGame(
            id: "preview",
            sport: .tennis,
            teamAName: "Federer",
            teamBName: "Nadal",
            teamAScore: 3,
            teamBScore: 1,
            status: .completed,
            startedAt: Date().addingTimeInterval(-3600),
            endedAt: Date()
        ))
    }
    .environmentObject(GameManager())
}
