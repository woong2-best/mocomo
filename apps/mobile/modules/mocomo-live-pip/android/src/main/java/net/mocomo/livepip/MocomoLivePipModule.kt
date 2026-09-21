package net.mocomo.livepip

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.pm.PackageManager
import android.os.Build
import android.util.Rational
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

/**
 * JS bridge for Android Activity PiP while watching first-party live.
 * MainActivity owns auto-enter / mode-change; this module toggles intent + enter.
 */
class MocomoLivePipModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MocomoLivePip")

    Events("onPipModeChanged")

    OnCreate {
      LivePipBridge.listener = { active ->
        sendEvent("onPipModeChanged", mapOf("active" to active))
      }
    }

    OnDestroy {
      LivePipBridge.listener = null
      LivePipBridge.setEnabled(false)
    }

    Function("isSupported") {
      val activity = appContext.currentActivity ?: return@Function false
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@Function false
      activity.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)
    }

    Function("isActive") {
      LivePipBridge.isInPip
    }

    AsyncFunction("setEnabled") { enabled: Boolean, width: Int?, height: Int?, promise: Promise ->
      val w = (width ?: 16).coerceAtLeast(1)
      val h = (height ?: 9).coerceAtLeast(1)
      LivePipBridge.setEnabled(enabled, w, h)
      val activity = appContext.currentActivity
      if (activity != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        try {
          activity.setPictureInPictureParams(LivePipBridge.buildParams())
        } catch (_: Throwable) {
          /* ignore — params refresh best-effort */
        }
      }
      promise.resolve(null)
    }

    AsyncFunction("enter") { width: Int?, height: Int?, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("E_NO_ACTIVITY", "No current activity", null)
        return@AsyncFunction
      }
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        promise.reject("E_UNSUPPORTED", "PiP requires Android 8+", null)
        return@AsyncFunction
      }
      if (!activity.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)) {
        promise.reject("E_UNSUPPORTED", "Device does not support PiP", null)
        return@AsyncFunction
      }
      val w = (width ?: LivePipBridge.aspectW).coerceAtLeast(1)
      val h = (height ?: LivePipBridge.aspectH).coerceAtLeast(1)
      LivePipBridge.setEnabled(true, w, h)
      try {
        val ok = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          activity.enterPictureInPictureMode(LivePipBridge.buildParams())
        } else {
          false
        }
        promise.resolve(ok)
      } catch (e: Throwable) {
        promise.reject("E_PIP", e.message, e)
      }
    }
  }
}

object LivePipBridge {
  @Volatile var enabled: Boolean = false
    private set
  @Volatile var aspectW: Int = 16
    private set
  @Volatile var aspectH: Int = 9
    private set
  @Volatile var isInPip: Boolean = false
  @Volatile var listener: ((Boolean) -> Unit)? = null

  fun setEnabled(value: Boolean, width: Int = aspectW, height: Int = aspectH) {
    enabled = value
    aspectW = width.coerceAtLeast(1)
    aspectH = height.coerceAtLeast(1)
  }

  fun buildParams(): PictureInPictureParams {
    val builder = PictureInPictureParams.Builder()
      .setAspectRatio(Rational(aspectW, aspectH))
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      builder.setAutoEnterEnabled(enabled)
      builder.setSeamlessResizeEnabled(true)
    }
    return builder.build()
  }

  fun onPipModeChanged(active: Boolean) {
    isInPip = active
    listener?.invoke(active)
  }

  fun tryEnter(activity: Activity): Boolean {
    if (!enabled) return false
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
    if (!activity.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)) {
      return false
    }
    return try {
      activity.enterPictureInPictureMode(buildParams())
    } catch (_: Throwable) {
      false
    }
  }
}
