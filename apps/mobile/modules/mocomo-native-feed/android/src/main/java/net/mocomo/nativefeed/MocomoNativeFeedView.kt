package net.mocomo.nativefeed

import android.content.Context
import android.graphics.Color
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class MocomoNativeFeedView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {

  private val onPostPress by EventDispatcher()
  private val onAuthorPress by EventDispatcher()
  private val onVideoPress by EventDispatcher()
  private val onLikePress by EventDispatcher()
  private val onAdPress by EventDispatcher()
  private val onReady by EventDispatcher()
  private val onError by EventDispatcher()
  private val onAuthExpired by EventDispatcher()

  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
  private var collectJob: Job? = null

  private val playerPool = PlayerPool(context.applicationContext, maxSize = 4)
  private val feedApi = FeedApi(apiBaseUrl = "https://mocomo.net", accessToken = null)

  private val adapter = FeedAdapter(
    playerPool = playerPool,
    callbacks = object : FeedViewHolder.Callbacks {
      override fun onPostPress(postId: String) {
        onPostPress(mapOf("postId" to postId))
      }

      override fun onAuthorPress(username: String) {
        onAuthorPress(mapOf("username" to username))
      }

      override fun onVideoPress(postId: String, mediaId: String?, mediaIndex: Int) {
        val payload = HashMap<String, Any>()
        payload["postId"] = postId
        payload["mediaId"] = mediaId ?: ""
        payload["mediaIndex"] = mediaIndex
        onVideoPress(payload)
      }

      override fun onLikePress(postId: String) {
        onLikePress(mapOf("postId" to postId))
      }

      override fun onAdPress(linkUrl: String) {
        onAdPress(mapOf("linkUrl" to linkUrl))
      }
    },
  )

  private val recyclerView = RecyclerView(context).apply {
    layoutParams = FrameLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT,
    )
    layoutManager = LinearLayoutManager(context)
    setHasFixedSize(true)
    setItemViewCacheSize(20)
    itemAnimator = null
    overScrollMode = View.OVER_SCROLL_NEVER
  }

  private val swipeRefresh = SwipeRefreshLayout(context).apply {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    addView(recyclerView)
  }

  private var apiBaseUrl: String = "https://mocomo.net"
  private var accessToken: String? = null
  private var bottomPaddingPx: Int = 0
  private var paused: Boolean = false
  private var lastRefreshNonce: Long = -1L
  private var started = false

  init {
    addView(swipeRefresh)
    recyclerView.adapter = adapter

    swipeRefresh.setOnRefreshListener {
      restartPager(force = true)
    }

    recyclerView.addOnScrollListener(object : RecyclerView.OnScrollListener() {
      override fun onScrollStateChanged(recyclerView: RecyclerView, newState: Int) {
        if (paused) {
          adapter.pauseAllVisible(recyclerView)
          return
        }
        if (newState == RecyclerView.SCROLL_STATE_IDLE) {
          playVisibleVideos()
        } else {
          adapter.pauseAllVisible(recyclerView)
        }
      }
    })

    adapter.addLoadStateListener { state ->
      val refresh = state.refresh
      if (refresh is androidx.paging.LoadState.NotLoading) {
        swipeRefresh.isRefreshing = false
        if (!started) {
          started = true
          onReady(mapOf("ok" to true))
          recyclerView.post { playVisibleVideos() }
        }
      }
      if (refresh is androidx.paging.LoadState.Error) {
        swipeRefresh.isRefreshing = false
        val err = refresh.error
        if (err is FeedApi.AuthExpiredException) {
          onAuthExpired(mapOf("reason" to "unauthorized"))
        } else {
          onError(mapOf("message" to (err.message ?: "feed_error")))
        }
      }
      val append = state.append
      if (append is androidx.paging.LoadState.Error && append.error is FeedApi.AuthExpiredException) {
        onAuthExpired(mapOf("reason" to "unauthorized"))
      }
    }
  }

  fun setApiBaseUrl(value: String?) {
    if (value.isNullOrBlank()) return
    apiBaseUrl = value.trimEnd('/')
    feedApi.updateConfig(apiBaseUrl, accessToken)
    maybeStart()
  }

  fun setAccessToken(value: String?) {
    accessToken = value
    feedApi.updateConfig(apiBaseUrl, accessToken)
    maybeStart()
  }

  fun setDark(dark: Boolean) {
    adapter.isDark = dark
    setBackgroundColor(if (dark) 0xFF0B1018.toInt() else Color.WHITE)
    adapter.notifyDataSetChanged()
  }

  fun setBottomPaddingPx(px: Int) {
    bottomPaddingPx = px.coerceAtLeast(0)
    recyclerView.setPadding(0, 0, 0, bottomPaddingPx)
    recyclerView.clipToPadding = false
  }

  fun setPaused(value: Boolean) {
    paused = value
    if (paused) {
      adapter.pauseAllVisible(recyclerView)
    } else {
      playVisibleVideos()
    }
  }

  fun refresh(nonce: Long) {
    if (nonce == lastRefreshNonce) return
    lastRefreshNonce = nonce
    restartPager(force = true)
  }

  private fun maybeStart() {
    if (accessToken.isNullOrBlank()) return
    if (collectJob?.isActive == true) return
    restartPager(force = false)
  }

  private fun restartPager(force: Boolean) {
    if (accessToken.isNullOrBlank()) return
    if (!force && collectJob?.isActive == true) return

    collectJob?.cancel()
    feedApi.updateConfig(apiBaseUrl, accessToken)
    feedApi.resetOffset()
    started = false

    val pager = Pager(
      config = PagingConfig(
        pageSize = 20,
        prefetchDistance = 10,
        enablePlaceholders = false,
        initialLoadSize = 40,
      ),
      pagingSourceFactory = { FeedPagingSource(feedApi) },
    )

    collectJob = scope.launch {
      pager.flow.collectLatest { data: PagingData<FeedListItem> ->
        adapter.submitData(data)
      }
    }
  }

  private fun playVisibleVideos() {
    if (paused) return
    val lm = recyclerView.layoutManager as? LinearLayoutManager ?: return
    val first = lm.findFirstVisibleItemPosition()
    val last = lm.findLastVisibleItemPosition()
    if (first == RecyclerView.NO_POSITION || last == RecyclerView.NO_POSITION) return

    for (i in first..last) {
      val holder = recyclerView.findViewHolderForAdapterPosition(i) as? FeedViewHolder ?: continue
      if (isViewMostlyVisible(holder.itemView)) {
        holder.play()
      } else {
        holder.pause()
      }
    }
  }

  private fun isViewMostlyVisible(view: View): Boolean {
    val loc = IntArray(2)
    view.getLocationOnScreen(loc)
    val viewTop = loc[1]
    val viewBottom = viewTop + view.height
    val screenTop = 0
    val screenBottom = resources.displayMetrics.heightPixels
    val visible = (viewBottom.coerceAtMost(screenBottom) - viewTop.coerceAtLeast(screenTop)).coerceAtLeast(0)
    return visible >= view.height * 0.5f
  }

  override fun onDetachedFromWindow() {
    adapter.pauseAllVisible(recyclerView)
    super.onDetachedFromWindow()
  }

  fun destroy() {
    adapter.pauseAllVisible(recyclerView)
    collectJob?.cancel()
    collectJob = null
    playerPool.releaseAll()
    scope.cancel()
  }
}
