import Foundation
import WatchConnectivity
import Combine

// MARK: - Sport Definition

enum Sport: String, CaseIterable, Identifiable, Codable {
    case football, basketball, tennis, cricket, rugby
    case tableTennis = "table_tennis"
    case badminton, volleyball, baseball
    case americanFootball = "american_football"
    case general

    var id: String { rawValue }

    var name: String {
        switch self {
        case .football: return "Football"
        case .basketball: return "Basketball"
        case .tennis: return "Tennis"
        case .cricket: return "Cricket"
        case .rugby: return "Rugby"
        case .tableTennis: return "Table Tennis"
        case .badminton: return "Badminton"
        case .volleyball: return "Volleyball"
        case .baseball: return "Baseball"
        case .americanFootball: return "American Football"
        case .general: return "General"
        }
    }

    var icon: String {
        switch self {
        case .football: return "⚽"
        case .basketball: return "🏀"
        case .tennis: return "🎾"
        case .cricket: return "🏏"
        case .rugby: return "🏉"
        case .tableTennis: return "🏓"
        case .badminton: return "🏸"
        case .volleyball: return "🏐"
        case .baseball: return "⚾"
        case .americanFootball: return "🏈"
        case .general: return "🎯"
        }
    }

    var accentColor: String {
        switch self {
        case .football: return "#3D9B4F"
        case .basketball: return "#C4884D"
        case .tennis: return "#2D9B6F"
        case .cricket: return "#5BA84E"
        case .rugby: return "#4A8C3F"
        case .tableTennis: return "#2D7BB6"
        case .badminton: return "#4A9BB6"
        case .volleyball: return "#B6842D"
        case .baseball: return "#8C7A3F"
        case .americanFootball: return "#4A7C3F"
        case .general: return "#7A7A7A"
        }
    }
}

// MARK: - Game Model

struct WatchGame: Identifiable, Codable {
    let id: String
    var sport: Sport
    var teamAName: String
    var teamBName: String
    var teamAScore: Int
    var teamBScore: Int
    var status: GameStatus
    var startedAt: Date
    var endedAt: Date?

    enum GameStatus: String, Codable {
        case active, completed, paused
    }
}

// MARK: - Game Manager

class GameManager: NSObject, ObservableObject, WCSessionDelegate {
    @Published var activeGames: [WatchGame] = []
    @Published var recentGames: [WatchGame] = []
    @Published var isConnected = false

    private var session: WCSession?

    override init() {
        super.init()
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
        }
    }

    // MARK: - Game Actions

    func createGame(sport: Sport, teamA: String, teamB: String) -> WatchGame {
        let game = WatchGame(
            id: UUID().uuidString,
            sport: sport,
            teamAName: teamA.isEmpty ? "Team A" : teamA,
            teamBName: teamB.isEmpty ? "Team B" : teamB,
            teamAScore: 0,
            teamBScore: 0,
            status: .active,
            startedAt: Date()
        )
        activeGames.insert(game, at: 0)
        syncToPhone(game)
        return game
    }

    func incrementScore(gameId: String, team: String, points: Int = 1) {
        guard let index = activeGames.firstIndex(where: { $0.id == gameId }) else { return }
        if team == "a" {
            activeGames[index].teamAScore += points
        } else {
            activeGames[index].teamBScore += points
        }
        syncToPhone(activeGames[index])
    }

    func undoScore(gameId: String, team: String, points: Int = 1) {
        guard let index = activeGames.firstIndex(where: { $0.id == gameId }) else { return }
        if team == "a" {
            activeGames[index].teamAScore = max(0, activeGames[index].teamAScore - points)
        } else {
            activeGames[index].teamBScore = max(0, activeGames[index].teamBScore - points)
        }
        syncToPhone(activeGames[index])
    }

    func endGame(gameId: String) {
        guard let index = activeGames.firstIndex(where: { $0.id == gameId }) else { return }
        var game = activeGames.remove(at: index)
        game.status = .completed
        game.endedAt = Date()
        recentGames.insert(game, at: 0)
        syncToPhone(game)
    }

    // MARK: - Phone Sync

    private func syncToPhone(_ game: WatchGame) {
        guard let session = session, session.isReachable else {
            // Queue for later sync
            queueOfflineUpdate(game)
            return
        }

        let data: [String: Any] = [
            "action": "scoreUpdate",
            "gameId": game.id,
            "sport": game.sport.rawValue,
            "teamAName": game.teamAName,
            "teamBName": game.teamBName,
            "teamAScore": game.teamAScore,
            "teamBScore": game.teamBScore,
            "status": game.status.rawValue,
        ]
        session.sendMessage(data, replyHandler: nil) { error in
            print("Watch sync error: \(error.localizedDescription)")
        }
    }

    private var offlineQueue: [WatchGame] = []

    private func queueOfflineUpdate(_ game: WatchGame) {
        offlineQueue.removeAll { $0.id == game.id }
        offlineQueue.append(game)
    }

    private func flushOfflineQueue() {
        guard let session = session, session.isReachable else { return }
        for game in offlineQueue {
            syncToPhone(game)
        }
        offlineQueue.removeAll()
    }

    // MARK: - WCSessionDelegate

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.isConnected = activationState == .activated
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async {
            self.handlePhoneMessage(message)
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isConnected = session.isReachable
            if session.isReachable {
                self.flushOfflineQueue()
            }
        }
    }

    private func handlePhoneMessage(_ message: [String: Any]) {
        guard let action = message["action"] as? String else { return }

        switch action {
        case "scoreUpdate":
            guard let gameId = message["gameId"] as? String,
                  let teamAScore = message["teamAScore"] as? Int,
                  let teamBScore = message["teamBScore"] as? Int
            else { return }

            if let index = activeGames.firstIndex(where: { $0.id == gameId }) {
                activeGames[index].teamAScore = teamAScore
                activeGames[index].teamBScore = teamBScore
            }

        case "gamesList":
            // Receive games list from phone on initial sync
            break

        default:
            break
        }
    }
}
