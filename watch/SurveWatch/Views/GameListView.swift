import SwiftUI

/// Shows active and recent games, tap to open
struct GameListView: View {
    @EnvironmentObject var gameManager: GameManager

    var body: some View {
        List {
            // New game button
            NavigationLink(destination: NewGameView()) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                        .foregroundStyle(.green)
                    Text("New Game")
                        .fontWeight(.semibold)
                }
            }

            // Active games
            if !gameManager.activeGames.isEmpty {
                Section("Active") {
                    ForEach(gameManager.activeGames) { game in
                        NavigationLink(destination: ActiveGameView(game: game)) {
                            GameRowView(game: game)
                        }
                    }
                }
            }

            // Recent games
            if !gameManager.recentGames.isEmpty {
                Section("Recent") {
                    ForEach(gameManager.recentGames.prefix(5)) { game in
                        NavigationLink(destination: GameSummaryView(game: game)) {
                            GameRowView(game: game)
                        }
                    }
                }
            }

            // Empty state
            if gameManager.activeGames.isEmpty && gameManager.recentGames.isEmpty {
                VStack(spacing: 8) {
                    Text("🏆")
                        .font(.title)
                    Text("No games yet")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("Tap + to start tracking")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical)
            }
        }
        .navigationTitle("Surve")
    }
}

/// Single game row in the list
struct GameRowView: View {
    let game: WatchGame

    var body: some View {
        HStack {
            Text(game.sport.icon)
                .font(.title3)

            VStack(alignment: .leading, spacing: 2) {
                Text("\(game.teamAName) vs \(game.teamBName)")
                    .font(.caption)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    Text("\(game.teamAScore)")
                        .fontWeight(.bold)
                    Text("-")
                        .foregroundStyle(.secondary)
                    Text("\(game.teamBScore)")
                        .fontWeight(.bold)
                }
                .font(.caption)
            }

            Spacer()

            if game.status == .active {
                Circle()
                    .fill(.green)
                    .frame(width: 8, height: 8)
            }
        }
    }
}

#Preview {
    NavigationStack {
        GameListView()
    }
    .environmentObject(GameManager())
}
