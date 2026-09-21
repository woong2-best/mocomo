package net.mocomo.nativefeed

data class FeedAuthor(
  val id: String,
  val username: String,
  val name: String?,
  val image: String?,
)

data class FeedMedia(
  val id: String?,
  val url: String,
  val type: String,
  val locked: Boolean,
  val hlsUrl: String?,
  val posterUrl: String?,
  val width: Int?,
  val height: Int?,
  val duration: Double?,
)

data class FeedPost(
  val id: String,
  val content: String,
  val createdAt: String,
  val author: FeedAuthor,
  val media: List<FeedMedia>,
  val likeCount: Int,
  val commentCount: Int,
  val liked: Boolean,
)

data class FeedAd(
  val id: String,
  val title: String,
  val imageUrl: String,
  val linkUrl: String,
  val sponsorName: String?,
)

sealed class FeedListItem {
  abstract val stableId: String

  data class Post(val post: FeedPost) : FeedListItem() {
    override val stableId: String = "post-${post.id}"
  }

  data class Ad(val ad: FeedAd) : FeedListItem() {
    override val stableId: String = "ad-${ad.id}"
  }
}

data class FeedPageResult(
  val items: List<FeedListItem>,
  val nextCursor: String?,
)
