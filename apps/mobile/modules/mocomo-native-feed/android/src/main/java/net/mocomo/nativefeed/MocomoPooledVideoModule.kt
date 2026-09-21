package net.mocomo.nativefeed

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MocomoPooledVideoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MocomoPooledVideo")

    View(MocomoPooledVideoView::class) {
      Prop("url") { view: MocomoPooledVideoView, value: String? ->
        view.setUrl(value)
      }
      Prop("posterUrl") { view: MocomoPooledVideoView, value: String? ->
        view.setPosterUrl(value)
      }
      Prop("streamUid") { view: MocomoPooledVideoView, value: String? ->
        view.setStreamUid(value)
      }
      Prop("playing") { view: MocomoPooledVideoView, value: Boolean? ->
        view.setPlaying(value == true)
      }
      Prop("muted") { view: MocomoPooledVideoView, value: Boolean? ->
        view.setMuted(value != false)
      }

      Events("onReady", "onError", "onFirstFrame")

      OnViewDestroys { view: MocomoPooledVideoView ->
        view.destroy()
      }
    }
  }
}
