package net.mocomo.nativefeed

import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import androidx.recyclerview.widget.RecyclerView
import coil.load
import coil.request.CachePolicy
import coil.size.Scale

class FeedViewHolder(
  private val root: LinearLayout,
  private val playerPool: PlayerPool,
  private val callbacks: Callbacks,
) : RecyclerView.ViewHolder(root) {

  interface Callbacks {
    fun onPostPress(postId: String)
    fun onAuthorPress(username: String)
    fun onVideoPress(postId: String, mediaId: String?, mediaIndex: Int)
    fun onLikePress(postId: String)
    fun onAdPress(linkUrl: String)
  }

  private val avatar = ImageView(root.context)
  private val nameView = TextView(root.context)
  private val handleView = TextView(root.context)
  private val contentView = TextView(root.context)
  private val mediaFrame = FrameLayout(root.context)
  private val imageView = ImageView(root.context)
  private val playerView = PlayerView(root.context)
  private val playBadge = TextView(root.context)
  private val likeView = TextView(root.context)
  private val commentView = TextView(root.context)
  private val adLabel = TextView(root.context)

  private var currentPlayer: ExoPlayer? = null
  private var currentVideoUrl: String? = null
  private var boundPost: FeedPost? = null
  private var boundAd: FeedAd? = null
  private var isDark = false
  private var wantsPlay = false
  private var firstFrameRendered = false
  private var pendingPrepareUrl: String? = null
  private var playerListener: Player.Listener? = null
  private var thumbGeneration = 0

  init {
    val ctx = root.context
    val pad = dp(12)
    root.orientation = LinearLayout.VERTICAL
    root.setPadding(pad, pad, pad, pad)
    root.layoutParams = RecyclerView.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.WRAP_CONTENT,
    )

    val header = LinearLayout(ctx).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    avatar.layoutParams = LinearLayout.LayoutParams(dp(40), dp(40)).also {
      it.marginEnd = dp(10)
    }
    avatar.scaleType = ImageView.ScaleType.CENTER_CROP
    avatar.background = roundDrawable(Color.LTGRAY, dp(20).toFloat())

    val meta = LinearLayout(ctx).apply {
      orientation = LinearLayout.VERTICAL
      layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
    }
    nameView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
    nameView.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    handleView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
    meta.addView(nameView)
    meta.addView(handleView)
    header.addView(avatar)
    header.addView(meta)

    adLabel.text = "Sponsored"
    adLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
    adLabel.visibility = View.GONE

    contentView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
    contentView.setPadding(0, dp(8), 0, dp(8))
    contentView.maxLines = 8

    mediaFrame.layoutParams = LinearLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      dp(220),
    ).also { it.topMargin = dp(4) }
    mediaFrame.visibility = View.GONE

    imageView.layoutParams = FrameLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT,
    )
    imageView.scaleType = ImageView.ScaleType.CENTER_CROP

    playerView.layoutParams = FrameLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT,
    )
    playerView.useController = false
    playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_ZOOM
    playerView.setShutterBackgroundColor(Color.TRANSPARENT)
    playerView.setBackgroundColor(Color.TRANSPARENT)
    playerView.visibility = View.GONE

    playBadge.text = "▶"
    playBadge.setTextColor(Color.WHITE)
    playBadge.setBackgroundColor(0x88000000.toInt())
    playBadge.setPadding(dp(10), dp(6), dp(10), dp(6))
    playBadge.layoutParams = FrameLayout.LayoutParams(
      ViewGroup.LayoutParams.WRAP_CONTENT,
      ViewGroup.LayoutParams.WRAP_CONTENT,
      Gravity.BOTTOM or Gravity.END,
    ).also {
      it.setMargins(0, 0, dp(10), dp(10))
    }

    // Player under thumbnail so black surface never shows before first frame.
    mediaFrame.addView(playerView)
    mediaFrame.addView(imageView)
    mediaFrame.addView(playBadge)

    val actions = LinearLayout(ctx).apply {
      orientation = LinearLayout.HORIZONTAL
      setPadding(0, dp(8), 0, 0)
    }
    likeView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
    likeView.setPadding(0, 0, dp(16), 0)
    commentView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
    actions.addView(likeView)
    actions.addView(commentView)

    root.addView(adLabel)
    root.addView(header)
    root.addView(contentView)
    root.addView(mediaFrame)
    root.addView(actions)

    root.setOnClickListener {
      boundPost?.let { callbacks.onPostPress(it.id) }
      boundAd?.let { callbacks.onAdPress(it.linkUrl) }
    }
    avatar.setOnClickListener {
      boundPost?.author?.username?.let { callbacks.onAuthorPress(it) }
    }
    nameView.setOnClickListener {
      boundPost?.author?.username?.let { callbacks.onAuthorPress(it) }
    }
    likeView.setOnClickListener {
      boundPost?.let { callbacks.onLikePress(it.id) }
    }
    mediaFrame.setOnClickListener {
      val post = boundPost ?: return@setOnClickListener
      val video = post.media.firstOrNull { it.type.equals("VIDEO", true) && it.url.isNotBlank() }
      if (video != null) {
        callbacks.onVideoPress(post.id, video.id, post.media.indexOf(video).coerceAtLeast(0))
      } else {
        callbacks.onPostPress(post.id)
      }
    }
  }

  fun applyTheme(dark: Boolean) {
    isDark = dark
    val text = if (dark) Color.WHITE else 0xFF1A1A1A.toInt()
    val muted = if (dark) 0xFFA0A8B8.toInt() else 0xFF6B7280.toInt()
    val bg = if (dark) 0xFF121820.toInt() else 0xFFF8F4EC.toInt()
    root.setBackgroundColor(bg)
    nameView.setTextColor(text)
    handleView.setTextColor(muted)
    contentView.setTextColor(text)
    likeView.setTextColor(muted)
    commentView.setTextColor(muted)
    adLabel.setTextColor(muted)
  }

  fun bindPost(post: FeedPost, dark: Boolean) {
    boundAd = null
    boundPost = post
    applyTheme(dark)
    adLabel.visibility = View.GONE
    likeView.visibility = View.VISIBLE
    commentView.visibility = View.VISIBLE

    val display = post.author.name?.takeIf { it.isNotBlank() } ?: post.author.username
    nameView.text = display
    handleView.text = "@${post.author.username}"
    contentView.text = post.content
    contentView.visibility = if (post.content.isBlank()) View.GONE else View.VISIBLE
    likeView.text = if (post.liked) "♥ ${post.likeCount}" else "♡ ${post.likeCount}"
    commentView.text = "💬 ${post.commentCount}"

    avatar.load(post.author.image) {
      crossfade(true)
      size(120, 120)
      memoryCachePolicy(CachePolicy.ENABLED)
      diskCachePolicy(CachePolicy.ENABLED)
      scale(Scale.FILL)
    }

    val video = post.media.firstOrNull {
      it.type.equals("VIDEO", true) && !it.locked && resolveVideoSrc(it).isNotBlank()
    }
    val image = post.media.firstOrNull {
      it.type.equals("IMAGE", true) && !it.locked && it.url.isNotBlank()
    }

    when {
      video != null -> bindVideoMedia(video)
      image != null -> {
        releasePlayer()
        resetThumbnailState()
        mediaFrame.visibility = View.VISIBLE
        playerView.visibility = View.GONE
        playBadge.visibility = View.GONE
        imageView.visibility = View.VISIBLE
        imageView.load(image.url) {
          crossfade(true)
          size(1080, 1080)
          memoryCachePolicy(CachePolicy.ENABLED)
          diskCachePolicy(CachePolicy.ENABLED)
        }
      }
      else -> {
        releasePlayer()
        resetThumbnailState()
        mediaFrame.visibility = View.GONE
      }
    }
  }

  private fun bindVideoMedia(video: FeedMedia) {
    mediaFrame.visibility = View.VISIBLE
    playerView.visibility = View.VISIBLE
    playBadge.visibility = View.VISIBLE
    imageView.visibility = View.VISIBLE
    wantsPlay = false
    firstFrameRendered = false

    val src = resolveVideoSrc(video)
    pendingPrepareUrl = src
    val poster = VideoPoster.resolve(video.posterUrl, video.url, video.hlsUrl)
    val gen = ++thumbGeneration

    if (!poster.isNullOrBlank()) {
      // Keep prior drawable until Coil paints — never flash empty black.
      imageView.load(poster) {
        crossfade(false)
        size(1080, 1080)
        memoryCachePolicy(CachePolicy.ENABLED)
        diskCachePolicy(CachePolicy.ENABLED)
        listener(
          onError = { _, _ ->
            if (pendingPrepareUrl == src && gen == thumbGeneration) {
              extractVideoFrame(src, gen)
            }
          },
        )
      }
    } else {
      extractVideoFrame(src, gen)
    }
  }

  private fun extractVideoFrame(src: String, gen: Int) {
    VideoFrameThumb.load(src, gen) { bmp, resultGen ->
      if (resultGen != thumbGeneration || pendingPrepareUrl != src) return@load
      if (bmp != null && !bmp.isRecycled) {
        imageView.setImageBitmap(bmp)
        imageView.visibility = View.VISIBLE
      }
    }
  }

  fun bindAd(ad: FeedAd, dark: Boolean) {
    releasePlayer()
    resetThumbnailState()
    boundPost = null
    boundAd = ad
    applyTheme(dark)
    adLabel.visibility = View.VISIBLE
    likeView.visibility = View.GONE
    commentView.visibility = View.GONE
    nameView.text = ad.sponsorName ?: "Ad"
    handleView.text = ad.title
    contentView.visibility = View.GONE
    avatar.setImageDrawable(null)
    mediaFrame.visibility = View.VISIBLE
    playerView.visibility = View.GONE
    playBadge.visibility = View.GONE
    imageView.visibility = View.VISIBLE
    imageView.load(ad.imageUrl) {
      crossfade(true)
      size(1080, 720)
      memoryCachePolicy(CachePolicy.ENABLED)
      diskCachePolicy(CachePolicy.ENABLED)
    }
  }

  private fun prepareVideo(url: String) {
    if (currentVideoUrl == url && currentPlayer != null) {
      currentPlayer?.playWhenReady = wantsPlay
      return
    }
    releasePlayer(keepThumbnail = true)
    val player = playerPool.acquire()
    currentPlayer = player
    currentVideoUrl = url
    firstFrameRendered = false
    playerView.player = player
    imageView.visibility = View.VISIBLE

    val listener = object : Player.Listener {
      override fun onRenderedFirstFrame() {
        if (currentPlayer !== player) return
        firstFrameRendered = true
        if (wantsPlay) {
          // Reveal video only after a real frame is on the surface.
          imageView.visibility = View.INVISIBLE
          player.playWhenReady = true
        } else {
          imageView.visibility = View.VISIBLE
          player.playWhenReady = false
        }
      }
    }
    playerListener = listener
    player.addListener(listener)
    player.playWhenReady = wantsPlay
    player.setMediaItem(MediaItem.fromUri(url))
    player.prepare()
  }

  fun play() {
    wantsPlay = true
    playBadge.visibility = View.GONE
    imageView.visibility = View.VISIBLE
    val src = pendingPrepareUrl ?: currentVideoUrl
    if (src != null && (currentPlayer == null || currentVideoUrl != src)) {
      prepareVideo(src)
    }
    val player = currentPlayer ?: return
    player.playWhenReady = true
    if (firstFrameRendered) {
      imageView.visibility = View.INVISIBLE
    }
  }

  fun pause() {
    wantsPlay = false
    currentPlayer?.playWhenReady = false
    releasePlayer(keepThumbnail = true)
    imageView.visibility = View.VISIBLE
    playBadge.visibility = View.VISIBLE
  }

  fun releasePlayer(keepThumbnail: Boolean = false) {
    currentPlayer?.let { player ->
      playerListener?.let { player.removeListener(it) }
      playerView.player = null
      playerPool.release(player)
    }
    currentPlayer = null
    currentVideoUrl = null
    playerListener = null
    firstFrameRendered = false
    wantsPlay = false
    if (!keepThumbnail) {
      pendingPrepareUrl = null
    }
  }

  fun onViewRecycled() {
    VideoFrameThumb.cancel(pendingPrepareUrl)
    releasePlayer()
    resetThumbnailState()
    boundPost = null
    boundAd = null
  }

  private fun resetThumbnailState() {
    pendingPrepareUrl = null
    firstFrameRendered = false
    wantsPlay = false
    thumbGeneration += 1
    imageView.visibility = View.VISIBLE
    imageView.setImageDrawable(null)
  }

  private fun dp(v: Int): Int =
    TypedValue.applyDimension(
      TypedValue.COMPLEX_UNIT_DIP,
      v.toFloat(),
      root.resources.displayMetrics,
    ).toInt()

  private fun roundDrawable(color: Int, radius: Float) =
    GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      setColor(color)
      cornerRadius = radius
    }

  companion object {
    fun create(parent: ViewGroup, playerPool: PlayerPool, callbacks: Callbacks): FeedViewHolder {
      val root = LinearLayout(parent.context)
      return FeedViewHolder(root, playerPool, callbacks)
    }

    fun resolveVideoSrc(media: FeedMedia): String {
      val progressive = media.url.trim()
      val hls = media.hlsUrl?.trim().orEmpty()
      if (progressive.isNotBlank() && !progressive.contains(".m3u8")) return progressive
      return hls.ifBlank { progressive }
    }
  }
}
