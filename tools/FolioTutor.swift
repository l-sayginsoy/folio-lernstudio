import Foundation
import FoundationModels

@main
struct FolioTutor {
    static func main() async {
        guard SystemLanguageModel.default.availability == .available else {
            print("unavailable")
            return
        }
        let args = CommandLine.arguments
        guard args.count == 4 else {
            print("ready")
            return
        }
        let session = LanguageModelSession(instructions: """
        Du bist ein freundlicher Englischlehrer. Erkläre den vorgegebenen englischen Ausdruck einem 14-Jährigen auf Deutsch. 
        Gib eine konkrete Alltagssituation und einen kurzen englischen Beispielsatz mit deutscher Übersetzung.
        Nutze die vorgegebene Bedeutung. Maximal 45 Wörter. Kein Markdown, kein Lob und keine Rückfrage.
        """)
        do {
            let result = try await session.respond(to: "Englischer Ausdruck: \(args[1])\nBedeutung im Schulbuch: \(args[2])\nBeispiel: \(args[3])")
            print(result.content)
        } catch {
            FileHandle.standardError.write(Data("Erklärung nicht verfügbar.".utf8))
            exit(1)
        }
    }
}
