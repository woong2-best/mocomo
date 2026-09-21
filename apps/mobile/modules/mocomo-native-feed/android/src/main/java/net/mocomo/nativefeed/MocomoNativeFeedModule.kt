package net.mocomo.nativefeed

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MocomoNativeFeedModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MocomoNativeFeed")

    View(MocomoNativeFeedView::class) {
      Prop("apiBaseUrl") { view: MocomoNativeFeedView, value: String? ->
        view.setApiBaseUrl(value)
      }
      Prop("accessToken") { view: MocomoNativeFeedView, value: String? ->
        view.setAccessToken(value)
      }
      Prop("isDark") { view: MocomoNativeFeedView, value: Boolean? ->
        view.setDark(value == true)
      }
      Prop("bottomPadding") { view: MocomoNativeFeedView, value: Double? ->
        view.setBottomPaddingPx(value?.toInt() ?: 0)
      }
      Prop("paused") { view: MocomoNativeFeedView, value: Boolean? ->
        view.setPaused(value == true)
      }
      Prop("refreshNonce") { view: MocomoNativeFeedView, value: Double? ->
        view.refresh(value?.toLong() ?: 0L)
      }

      Events(
        "onPostPress",
        "onAuthorPress",
        "onVideoPress",
        "onLikePress",
        "onAdPress",
        "onReady",
        "onError",
        "onAuthExpired"
      )

      OnViewDestroys { view: MocomoNativeFeedView ->
        view.destroy()
      }
    }
  }
}
