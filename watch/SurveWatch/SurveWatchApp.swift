import SwiftUI

@main
struct SurveWatchApp: App {
    @StateObject private var gameManager = GameManager()

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                GameListView()
            }
            .environmentObject(gameManager)
        }
    }
}
