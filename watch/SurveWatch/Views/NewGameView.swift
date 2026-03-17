import SwiftUI
import WatchKit

/// Quick start: pick sport, enter team names, go
struct NewGameView: View {
    @EnvironmentObject var gameManager: GameManager
    @Environment(\.dismiss) private var dismiss

    @State private var selectedSport: Sport = .football
    @State private var teamAName = ""
    @State private var teamBName = ""
    @State private var step: Step = .pickSport

    enum Step {
        case pickSport
        case enterNames
    }

    var body: some View {
        switch step {
        case .pickSport:
            sportPicker

        case .enterNames:
            nameEntry
        }
    }

    // MARK: - Sport Picker

    private var sportPicker: some View {
        ScrollView {
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
            ], spacing: 8) {
                ForEach(Sport.allCases) { sport in
                    Button {
                        WKInterfaceDevice.current().play(.click)
                        selectedSport = sport
                        step = .enterNames
                    } label: {
                        VStack(spacing: 4) {
                            Text(sport.icon)
                                .font(.title3)
                            Text(sport.name)
                                .font(.system(size: 10))
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(.quaternary)
                        .cornerRadius(8)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("Pick Sport")
    }

    // MARK: - Name Entry

    private var nameEntry: some View {
        ScrollView {
            VStack(spacing: 12) {
                Text(selectedSport.icon)
                    .font(.title2)

                TextField("Team A", text: $teamAName)
                    .textContentType(.name)

                Text("vs")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                TextField("Team B", text: $teamBName)
                    .textContentType(.name)

                Button {
                    WKInterfaceDevice.current().play(.start)
                    let game = gameManager.createGame(
                        sport: selectedSport,
                        teamA: teamAName,
                        teamB: teamBName
                    )
                    dismiss()
                } label: {
                    HStack {
                        Image(systemName: "play.fill")
                        Text("Start")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("Teams")
    }
}

#Preview {
    NavigationStack {
        NewGameView()
    }
    .environmentObject(GameManager())
}
