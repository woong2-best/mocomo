package net.mocomo.nativefeed

import android.content.Context
import androidx.media3.common.Player
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import java.io.File
import java.util.ArrayDeque

/**
 * Reusable ExoPlayer pool — never allocate a new player per cell.
 * Max 4 warm players + 100MB disk cache for X-class start latency.
 */
class PlayerPool(
  private val context: Context,
  private val maxSize: Int = 4,
) {
  private val availablePlayers = ArrayDeque<ExoPlayer>()
  private val cacheDataSourceFactory: CacheDataSource.Factory
  private var released = false

  init {
    cacheDataSourceFactory = CacheDataSource.Factory()
      .setCache(sharedCache(context))
      .setUpstreamDataSourceFactory(
        DefaultHttpDataSource.Factory()
          .setConnectTimeoutMs(8_000)
          .setReadTimeoutMs(8_000)
          .setAllowCrossProtocolRedirects(true)
      )
      .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
  }

  @Synchronized
  fun acquire(): ExoPlayer {
    check(!released) { "PlayerPool already released" }
    return if (availablePlayers.isEmpty()) {
      createPlayer()
    } else {
      availablePlayers.removeFirst()
    }
  }

  @Synchronized
  fun release(player: ExoPlayer) {
    if (released) {
      player.release()
      return
    }
    player.playWhenReady = false
    player.stop()
    player.clearMediaItems()
    if (availablePlayers.size < maxSize) {
      availablePlayers.addLast(player)
    } else {
      player.release()
    }
  }

  private fun createPlayer(): ExoPlayer {
    return ExoPlayer.Builder(context.applicationContext)
      .setMediaSourceFactory(
        DefaultMediaSourceFactory(context.applicationContext)
          .setDataSourceFactory(cacheDataSourceFactory)
      )
      .setLoadControl(
        DefaultLoadControl.Builder()
          .setBufferDurationsMs(
            /* minBufferMs */ 1_000,
            /* maxBufferMs */ 4_000,
            /* bufferForPlaybackMs */ 250,
            /* bufferForPlaybackAfterRebufferMs */ 500,
          )
          .build()
      )
      .build()
      .apply {
        playWhenReady = false
        repeatMode = Player.REPEAT_MODE_OFF
        volume = 0f
      }
  }

  @Synchronized
  fun releaseAll() {
    released = true
    availablePlayers.forEach { it.release() }
    availablePlayers.clear()
  }

  companion object {
    @Volatile private var cache: SimpleCache? = null

    @Synchronized
    private fun sharedCache(context: Context): SimpleCache {
      cache?.let { return it }
      val created = SimpleCache(
        File(context.applicationContext.cacheDir, "mocomo_feed_media_cache"),
        LeastRecentlyUsedCacheEvictor(100L * 1024L * 1024L),
        StandaloneDatabaseProvider(context.applicationContext),
      )
      cache = created
      return created
    }
  }
}
