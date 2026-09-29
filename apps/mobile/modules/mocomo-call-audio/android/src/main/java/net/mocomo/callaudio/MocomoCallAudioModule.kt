package net.mocomo.callaudio

import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MocomoCallAudioModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MocomoCallAudio")

    // Return Unit, not null. A null-only lambda is inferred as Nothing? / java.lang.Void.
    // Expo's reified Function then calls isIntrospectable<R>() with R still a type
    // parameter, and that stub throws UnsupportedOperationException while definition()
    // is registering the module at process start.
    Function<Unit, String, String>("start") { endUrl, token ->
      val context = appContext.reactContext ?: return@Function
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
    }

    Function<Unit>("stop") {
      val context = appContext.reactContext ?: return@Function
      val intent = Intent(context, CallAudioService::class.java).apply {
        action = CallAudioService.ACTION_STOP
      }
      context.startService(intent)
    }
  }
}
