package net.mocomo.nativefeed

import android.content.Context
import android.graphics.Color
import android.view.View
import android.widget.ImageView
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import coil.load
import coil.request.CachePolicy
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/**
 * Drop-in video surface for existing RN feed cards.
 * Same visual footprint as expo-video VideoView (parent sizes the view).
 * Players come from [PlayerPool] — no per-cell ExoPlayer allocation.
 *
 * Thumbnail covers PlayerView until a real frame paints while playing,
 * so the black decoder surface never flashes.
 */
class MocomoPooledVideoView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {

  private val onReady by EventDispatcher()
  private val onError by EventDispatcher()
  private val onFirstFrame by EventDispatcher()

  private val playerView = PlayerView(context).apply {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    useController = false
    resizeMode = AspectRatioFrameLayout.RESIZE_MODE_ZOOM
    setShutterBackgroundColor(Color.TRANSPARENT)
    setBackgroundColor(Color.TRANSPARENT)
  }

  private val thumbnailView = ImageView(context).apply {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    scaleType = ImageView.ScaleType.CENTER_CROP
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
    setBackgroundColor(Color.TRANSPARENT)
  }

  private var player: ExoPlayer? = null
  private var url: String? = null
  private var posterUrl: String? = null
  private var streamUid: String? = null
  private var playing = false
  private var muted = true
  private var preparedUrl: String? = null
  private var firstFrameRendered = false
  private var playerListener: Player.Listener? = null
  private var thumbGeneration = 0

  init {
    // Player under thumbnail so black surface never shows before first frame.
    addView(playerView)
    addView(thumbnailView)
    showThumbnail()
  }

  fun setUrl(value: String?) {
    val next = value?.trim().orEmpty().ifBlank { null }
    if (next == url) return
    if (url != null && url != next) {
      VideoFrameThumb.cancel(url)
    }
    url = next
    firstFrameRendered = false
    preparedUrl = null
    releasePlayer()
    loadThumbnail()
    if (playing) {
      preparePlayer()
    }
  }

  fun setPosterUrl(value: String?) {
    val next = value?.trim().orEmpty().ifBlank { null }
    if (next == posterUrl) return
    posterUrl = next
    loadThumbnail()
  }

  fun setStreamUid(value: String?) {
    val next = value?.trim().orEmpty().ifBlank { null }
    if (next == streamUid) return
    streamUid = next
    loadThumbnail()
  }

  fun setPlaying(value: Boolean) {
    playing = value
    if (!playing) {
      player?.playWhenReady = false
      releasePlayer()
      firstFrameRendered = false
      showThumbnail()
      return
    }
    preparePlayer()
    val p = player ?: return
    p.playWhenReady = true
    if (firstFrameRendered) {
      hideThumbnail()
    } else {
      // Keep thumbnail until first frame — never expose black surface.
      showThumbnail()
    }
  }

  fun setMuted(value: Boolean) {
    muted = value
    player?.volume = if (muted) 0f else 1f
  }

  private fun loadThumbnail() {
    val target = url
    thumbGeneration += 1
    val gen = thumbGeneration
    firstFrameRendered = false
    showThumbnail()

    val thumb = VideoPoster.resolve(posterUrl, target, streamUid = streamUid)
    if (!thumb.isNullOrBlank()) {
      thumbnailView.load(thumb) {
        crossfade(false)
        memoryCachePolicy(CachePolicy.ENABLED)
        diskCachePolicy(CachePolicy.ENABLED)
        listener(
          onError = { _, _ ->
            if (gen == thumbGeneration && target != null) {
              extractFrame(target, gen)
            }
          },
        )
      }
      return
    }

    if (target != null) {
      extractFrame(target, gen)
    }
  }

  private fun extractFrame(target: String, gen: Int) {
    VideoFrameThumb.load(target, gen) { bmp, resultGen ->
      if (resultGen != thumbGeneration || url != target) return@load
      if (bmp != null && !bmp.isRecycled) {
        thumbnailView.setImageBitmap(bmp)
        showThumbnail()
      }
    }
  }

  private fun preparePlayer() {
    val target = url ?: return
    if (preparedUrl == target && player != null) {
      player?.playWhenReady = playing
      return
    }
    releasePlayer()
    val acquired = sharedPool(context).acquire()
    player = acquired
    preparedUrl = target
    firstFrameRendered = false
    playerView.player = acquired
    acquired.volume = if (muted) 0f else 1f
    acquired.repeatMode = Player.REPEAT_MODE_ONE

    val listener = object : Player.Listener {
      override fun onRenderedFirstFrame() {
        if (player !== acquired) return
        firstFrameRendered = true
        if (playing) {
          hideThumbnail()
          acquired.playWhenReady = true
        } else {
          showThumbnail()
          acquired.playWhenReady = false
        }
        onFirstFrame(mapOf("ok" to true))
      }

      override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
        showThumbnail()
        onError(mapOf("message" to (error.message ?: "playback_error")))
      }
    }
    playerListener = listener
    acquired.addListener(listener)
    acquired.playWhenReady = playing
    acquired.setMediaItem(MediaItem.fromUri(target))
    acquired.prepare()
    onReady(mapOf("ok" to true))
  }

  private fun showThumbnail() {
    thumbnailView.visibility = View.VISIBLE
    thumbnailView.bringToFront()
  }

  private fun hideThumbnail() {
    thumbnailView.visibility = View.INVISIBLE
  }

  private fun releasePlayer() {
    val p = player ?: return
    playerListener?.let { p.removeListener(it) }
    playerView.player = null
    sharedPool(context).release(p)
    player = null
    preparedUrl = null
    playerListener = null
  }

  fun destroy() {
    VideoFrameThumb.cancel(url)
    releasePlayer()
    thumbGeneration += 1
    thumbnailView.setImageDrawable(null)
  }

  override fun onDetachedFromWindow() {
    // Pause + release — recycle returns player; keep thumbnail drawable for remount.
    player?.playWhenReady = false
    releasePlayer()
    firstFrameRendered = false
    showThumbnail()
    super.onDetachedFromWindow()
  }

  companion object {
    @Volatile private var pool: PlayerPool? = null

    @Synchronized
    fun sharedPool(context: Context): PlayerPool {
      pool?.let { return it }
      val created = PlayerPool(context.applicationContext, maxSize = 4)
      pool = created
      return created
    }
  }
}
