package net.mocomo.instagramstories

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.content.FileProvider
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.io.File

private const val INSTAGRAM_PACKAGE = "com.instagram.android"
private const val ADD_TO_STORY = "com.instagram.share.ADD_TO_STORY"

class MocomoInstagramStoriesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MocomoInstagramStories")

    Function("isAvailable") {
      isInstagramInstalled()
    }

    AsyncFunction("shareToStory") { options: Map<String, Any?>, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("E_NO_ACTIVITY", "No current activity", null)
        return@AsyncFunction
      }
      if (!isInstagramInstalled()) {
        promise.reject("E_NO_INSTAGRAM", "Instagram is not installed", null)
        return@AsyncFunction
      }

      val stickerPath = (options["stickerImageUri"] as? String)?.trim().orEmpty()
      if (stickerPath.isEmpty()) {
        promise.reject("E_NO_STICKER", "stickerImageUri is required", null)
        return@AsyncFunction
      }

      val stickerFile = fileFromUri(stickerPath)
      if (!stickerFile.exists()) {
        promise.reject("E_NO_FILE", "Sticker image was not found", null)
        return@AsyncFunction
      }

      val stickerUri = try {
        contentUriFor(stickerFile)
      } catch (e: Throwable) {
        promise.reject("E_FILE_PROVIDER", e.message ?: "Could not expose sticker", e)
        return@AsyncFunction
      }

      val intent = Intent(ADD_TO_STORY).apply {
        setPackage(INSTAGRAM_PACKAGE)
        type = "image/png"
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        putExtra("interactive_asset_uri", stickerUri)
        putExtra("source_application", (options["appId"] as? String)?.trim().orEmpty())
        (options["contentUrl"] as? String)?.trim()?.takeIf { it.isNotEmpty() }?.let {
          putExtra("content_url", it)
        }
        (options["backgroundTopColor"] as? String)?.trim()?.takeIf { it.isNotEmpty() }?.let {
          putExtra("top_background_color", it)
        }
        (options["backgroundBottomColor"] as? String)?.trim()?.takeIf { it.isNotEmpty() }?.let {
          putExtra("bottom_background_color", it)
        }
      }

      val backgroundPath = (options["backgroundImageUri"] as? String)?.trim().orEmpty()
      if (backgroundPath.isNotEmpty()) {
        val backgroundFile = fileFromUri(backgroundPath)
        if (backgroundFile.exists()) {
          try {
            val backgroundUri = contentUriFor(backgroundFile)
            intent.setDataAndType(backgroundUri, "image/png")
            activity.grantUriPermission(
              INSTAGRAM_PACKAGE,
              backgroundUri,
              Intent.FLAG_GRANT_READ_URI_PERMISSION
            )
          } catch (_: Throwable) {
            /* sticker-only still works */
          }
        }
      }

      activity.grantUriPermission(
        INSTAGRAM_PACKAGE,
        stickerUri,
        Intent.FLAG_GRANT_READ_URI_PERMISSION
      )

      try {
        activity.startActivity(intent)
        promise.resolve(null)
      } catch (e: Throwable) {
        promise.reject("E_SHARE_FAILED", e.message ?: "Could not open Instagram Stories", e)
      }
    }
  }

  private fun isInstagramInstalled(): Boolean {
    val context = appContext.reactContext ?: appContext.currentActivity ?: return false
    return try {
      context.packageManager.getPackageInfo(INSTAGRAM_PACKAGE, 0)
      true
    } catch (_: PackageManager.NameNotFoundException) {
      false
    } catch (_: Throwable) {
      false
    }
  }

  private fun fileFromUri(path: String): File {
    val cleaned = path.removePrefix("file://")
    return File(cleaned)
  }

  private fun contentUriFor(file: File): Uri {
    val context = appContext.reactContext ?: appContext.currentActivity
      ?: throw IllegalStateException("No context")
    val authority = "${context.packageName}.instagramstories.provider"
    return FileProvider.getUriForFile(context, authority, file)
  }
}
