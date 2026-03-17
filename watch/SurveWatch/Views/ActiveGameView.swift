import SwiftUI
import WatchKit

/// Main scoring screen — two big scores with tap-to-score
struct ActiveGameView: View {
    @EnvironmentObject var gameManager: GameManager
    let game: WatchGame

    @State private var showEndConfirm = false
    @State private var homeScaleEffect: CGFloat = 1.0
    @State private var awayScaleEffect: CGFloat = 1.0

    private var currentGame: WatchGame {
        gameManager.activeGames.first(where: { $0.id == game.id }) ?? game
    }

    var body: some View {
        VStack(spacing: 4) {
            // Sport icon + name
            HStack {
                Text(currentGame.sport.icon)
                    .font(.caption)
                Text(currentGame.sport.name)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            // Score area — the main interaction
            HStack(spacing: 0) {
                // Team A (left side)
                Button {
                    scoreTeamA()
                } label: {
                    VStack(spacing: 2) {
                        Text(currentGame.teamAName)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)

                        Text("\(currentGame.teamAScore)")
                            .font(.system(size: 48, weight: .light, design: .rounded))
                            .minimumScaleFactor(0.5)
                            .scaleEffect(homeScaleEffect)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .buttonStyle(.plain)

                // Divider
                Rectangle()
                    .fill(.tertiary)
                    .frame(width: 1)
                    .padding(.vertical, 8)

                // Team B (right side)
                Button {
                    scoreTeamB()
                } label: {
                    VStack(spacing: 2) {
                        Text(currentGame.teamBName)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)

                        Text("\(currentGame.teamBScore)")
                            .font(.system(size: 48, weight: .light, design: .rounded))
                            .minimumScaleFactor(0.5)
                            .scaleEffect(awayScaleEffect)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .buttonStyle(.plain)
            }
            .frame(maxHeight: .infinity)

            // Bottom actions
            HStack(spacing: 12) {
                // Undo button
                Button {
                    WKInterfaceDevice.current().play(.click)
                    // Undo last score (simplified: just undo team A for now)
                    gameManager.undoScore(gameId: game.id, team: "a")
                } label: {
                    Image(systemName: "arrow.uturn.backward")
                        .font(.caption)
                }
                .buttonStyle(.bordered)
                .tint(.secondary)

                // End game (long press)
                Button {
                    showEndConfirm = true
                } label: {
                    Image(systemName: "flag.checkered")
                        .font(.caption)
                }
                .buttonStyle(.bordered)
                .tint(.red)
            }
        }
        .confirmationDialog("End Game?", isPresented: $showEndConfirm) {
            Button("End Game", role: .destructive) {
                WKInterfaceDevice.current().play(.success)
                gameManager.endGame(gameId: game.id)
            }
            Button("Cancel", role: .cancel) {}
        }
        .navigationBarBackButtonHidden(false)
    }

    private func scoreTeamA() {
        WKInterfaceDevice.current().play(.click)
        gameManager.incrementScore(gameId: game.id, team: "a")
        withAnimation(.spring(response: 0.2, dampingFraction: 0.5)) {
            homeScaleEffect = 1.15
        }
        withAnimation(.spring(response: 0.3, dampingFraction: 0.7).delay(0.1)) {
            homeScaleEffect = 1.0
        }
    }

    private func scoreTeamB() {
        WKInterfaceDevice.current().play(.click)
        gameManager.incrementScore(gameId: game.id, team: "b")
        withAnimation(.spring(response: 0.2, dampingFraction: 0.5)) {
            awayScaleEffect = 1.15
        }
        withAnimation(.spring(response: 0.3, dampingFraction: 0.7).delay(0.1)) {
            awayScaleEffect = 1.0
        }
    }
}

#Preview {
    ActiveGameView(game: WatchGame(
        id: "preview",
        sport: .basketball,
        teamAName: "Lakers",
        teamBName: "Celtics",
        teamAScore: 42,
        teamBScore: 38,
        status: .active,
        startedAt: Date()
    ))
    .environmentObject(GameManager())
}
