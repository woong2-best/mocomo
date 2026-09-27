package net.mocomo.callaudio

import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MocomoCallAudioModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MocomoCallAudio")

    Function("start") { endUrl: String, token: String ->
      val context = appContext.reactContext ?: return@Function null
      try {
        val intent = Intent(context, CallAudioService::class.java).apply {
          putExtra(CallAudioService.EXTRA_END_URL, endUrl)
          putExtra(CallAudioService.EXTRA_TOKEN, token)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
      } catch (_: Throwable) {
        /* notification permission or background-start restriction */
      }
      null
    }

    Function("stop") {
      val context = appContext.reactContext ?: return@Function null
      val intent = Intent(context, CallAudioService::class.java).apply {
        action = CallAudioService.ACTION_STOP
      }
      context.startService(intent)
      null
    }
  }
}
