package net.mocomo.nativefeed

import android.view.ViewGroup
import androidx.paging.PagingDataAdapter
import androidx.recyclerview.widget.DiffUtil

class FeedAdapter(
  private val playerPool: PlayerPool,
  private val callbacks: FeedViewHolder.Callbacks,
) : PagingDataAdapter<FeedListItem, FeedViewHolder>(DIFF) {

  var isDark: Boolean = false

  override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): FeedViewHolder {
    return FeedViewHolder.create(parent, playerPool, callbacks)
  }

  override fun onBindViewHolder(holder: FeedViewHolder, position: Int) {
    when (val item = getItem(position)) {
      is FeedListItem.Post -> holder.bindPost(item.post, isDark)
      is FeedListItem.Ad -> holder.bindAd(item.ad, isDark)
      null -> Unit
    }
  }

  override fun onViewRecycled(holder: FeedViewHolder) {
    holder.onViewRecycled()
    super.onViewRecycled(holder)
  }

  fun pauseAllVisible(recyclerView: androidx.recyclerview.widget.RecyclerView) {
    for (i in 0 until recyclerView.childCount) {
      val holder = recyclerView.getChildViewHolder(recyclerView.getChildAt(i)) as? FeedViewHolder
      holder?.pause()
    }
  }

  companion object {
    private val DIFF = object : DiffUtil.ItemCallback<FeedListItem>() {
      override fun areItemsTheSame(oldItem: FeedListItem, newItem: FeedListItem): Boolean =
        oldItem.stableId == newItem.stableId

      override fun areContentsTheSame(oldItem: FeedListItem, newItem: FeedListItem): Boolean =
        oldItem == newItem
    }
  }
}
