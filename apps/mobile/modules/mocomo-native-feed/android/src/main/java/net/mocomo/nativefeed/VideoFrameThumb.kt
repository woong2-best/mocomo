package net.mocomo.nativefeed

import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.os.Handler
import android.os.Looper
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.Future

/**
 * First-frame still for progressive/remote videos when no posterUrl exists.
 * Runs off the main thread; results are delivered on the main looper.
 */
object VideoFrameThumb {
  private val mainHandler = Handler(Looper.getMainLooper())
  private val executor = Executors.newFixedThreadPool(2)
  private val inFlight = ConcurrentHashMap<String, Future<*>>()
  private val memoryCache = object : LinkedHashMap<String, Bitmap>(16, 0.75f, true) {
    override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Bitmap>?): Boolean =
      size > 24
  }

  fun load(url: String, generation: Int, onResult: (Bitmap?, Int) -> Unit) {
    val key = url.trim()
    if (key.isEmpty()) {
      onResult(null, generation)
      return
    }

    synchronized(memoryCache) {
      memoryCache[key]?.let { cached ->
        if (!cached.isRecycled) {
          onResult(cached, generation)
          return
        }
        memoryCache.remove(key)
      }
    }

    inFlight[key]?.cancel(true)
    val future = executor.submit {
      var retriever: MediaMetadataRetriever? = null
      var bitmap: Bitmap? = null
      try {
        retriever = MediaMetadataRetriever()
        retriever.setDataSource(key, HashMap())
        val raw =
          retriever.getFrameAtTime(0L, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
            ?: retriever.getFrameAtTime(1_000_000L, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
        bitmap = raw?.let { scaleDown(it, 720) }
        if (bitmap != null) {
          synchronized(memoryCache) {
            memoryCache[key] = bitmap!!
          }
        }
      } catch (_: Throwable) {
        bitmap = null
      } finally {
        try {
          retriever?.release()
        } catch (_: Throwable) {
          // ignore
        }
        inFlight.remove(key)
        val result = bitmap
        mainHandler.post { onResult(result, generation) }
      }
    }
    inFlight[key] = future
  }

  fun cancel(url: String?) {
    val key = url?.trim().orEmpty()
    if (key.isEmpty()) return
    inFlight.remove(key)?.cancel(true)
  }

  private fun scaleDown(src: Bitmap, maxEdge: Int): Bitmap {
    val w = src.width
    val h = src.height
    if (w <= 0 || h <= 0) return src
    val longest = maxOf(w, h)
    if (longest <= maxEdge) return src
    val scale = maxEdge.toFloat() / longest.toFloat()
    val nw = (w * scale).toInt().coerceAtLeast(1)
    val nh = (h * scale).toInt().coerceAtLeast(1)
    return Bitmap.createScaledBitmap(src, nw, nh, true).also {
      if (it !== src) src.recycle()
    }
  }
}
