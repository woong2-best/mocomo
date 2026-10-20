import ExpoModulesCore
import UIKit

public class MocomoInstagramStoriesModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MocomoInstagramStories")

    Function("isAvailable") {
      canOpenStories()
    }

    AsyncFunction("shareToStory") { (options: [String: Any], promise: Promise) in
      guard canOpenStories() else {
        promise.reject("E_NO_INSTAGRAM", "Instagram is not installed")
        return
      }

      guard
        let stickerPath = (options["stickerImageUri"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
        !stickerPath.isEmpty,
        let stickerData = dataFromUri(stickerPath)
      else {
        promise.reject("E_NO_STICKER", "stickerImageUri is required")
        return
      }

      var item: [String: Any] = [
        "com.instagram.sharedSticker.stickerImage": stickerData
      ]

      if let appId = (options["appId"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
         !appId.isEmpty {
        item["com.instagram.sharedSticker.appID"] = appId
      }
      if let contentUrl = (options["contentUrl"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
         !contentUrl.isEmpty {
        item["com.instagram.sharedSticker.contentURL"] = contentUrl
      }
      if let top = (options["backgroundTopColor"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
         !top.isEmpty {
        item["com.instagram.sharedSticker.backgroundTopColor"] = top
      }
      if let bottom = (options["backgroundBottomColor"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
         !bottom.isEmpty {
        item["com.instagram.sharedSticker.backgroundBottomColor"] = bottom
      }
      if let backgroundPath = (options["backgroundImageUri"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
         !backgroundPath.isEmpty,
         let backgroundData = dataFromUri(backgroundPath) {
        item["com.instagram.sharedSticker.backgroundImage"] = backgroundData
      }

      let pasteboardOptions: [UIPasteboard.OptionsKey: Any] = [
        .expirationDate: Date().addingTimeInterval(60 * 5)
      ]
      UIPasteboard.general.setItems([item], options: pasteboardOptions)

      let appId = (options["appId"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
      var urlString = "instagram-stories://share"
      if !appId.isEmpty, let encoded = appId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
        urlString += "?source_application=\(encoded)"
      }
      guard let url = URL(string: urlString) else {
        promise.reject("E_SHARE_FAILED", "Could not open Instagram Stories")
        return
      }

      DispatchQueue.main.async {
        UIApplication.shared.open(url, options: [:]) { opened in
          if opened {
            promise.resolve(nil)
          } else {
            promise.reject("E_SHARE_FAILED", "Could not open Instagram Stories")
          }
        }
      }
    }
  }

  private func canOpenStories() -> Bool {
    guard let url = URL(string: "instagram-stories://share") else { return false }
    return UIApplication.shared.canOpenURL(url)
  }

  private func dataFromUri(_ path: String) -> Data? {
    let cleaned = path.replacingOccurrences(of: "file://", with: "")
    return try? Data(contentsOf: URL(fileURLWithPath: cleaned))
  }
}
