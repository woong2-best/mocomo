package net.mocomo.nativefeed

import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

class FeedApi(
  private var apiBaseUrl: String,
  private var accessToken: String?,
) {
  private val client = OkHttpClient.Builder()
    .connectTimeout(12, TimeUnit.SECONDS)
    .readTimeout(12, TimeUnit.SECONDS)
    .build()

  private val postOffset = AtomicInteger(0)

  fun resetOffset() {
    postOffset.set(0)
  }

  fun updateConfig(baseUrl: String, token: String?) {
    apiBaseUrl = baseUrl.trimEnd('/')
    accessToken = token
  }

  class AuthExpiredException : Exception("auth_expired")

  fun loadPage(cursor: String?, limit: Int): FeedPageResult {
    val base = apiBaseUrl.trimEnd('/')
    val url = StringBuilder("$base/api/mobile/feed?limit=$limit")
    if (!cursor.isNullOrBlank()) url.append("&cursor=").append(cursor)
    val offset = postOffset.get()
    if (offset > 0) url.append("&postOffset=").append(offset)

    val reqBuilder = Request.Builder()
      .url(url.toString())
      .get()
      .header("Accept", "application/json")
    val token = accessToken
    if (!token.isNullOrBlank()) {
      reqBuilder.header("Authorization", "Bearer $token")
    }

    client.newCall(reqBuilder.build()).execute().use { response ->
      val body = response.body?.string().orEmpty()
      if (response.code == 401 || response.code == 403) {
        throw AuthExpiredException()
      }
      if (!response.isSuccessful) {
        throw IllegalStateException("feed_http_${response.code}")
      }

      val json = JSONObject(body)
      val likedIds = json.optJSONArray("likedIds").toStringSet()
      val itemsArr = json.optJSONArray("items") ?: JSONArray()
      val items = ArrayList<FeedListItem>(itemsArr.length())
      var postsInPage = 0

      for (i in 0 until itemsArr.length()) {
        val item = itemsArr.optJSONObject(i) ?: continue
        when (item.optString("type")) {
          "ad" -> {
            val data = item.optJSONObject("data") ?: continue
            items.add(
              FeedListItem.Ad(
                FeedAd(
                  id = data.optString("id"),
                  title = data.optString("title"),
                  imageUrl = data.optString("imageUrl"),
                  linkUrl = data.optString("linkUrl"),
                  sponsorName = data.optStringOrNull("sponsorName"),
                )
              )
            )
          }
          "post" -> {
            val data = item.optJSONObject("data") ?: continue
            val post = parsePost(data, likedIds)
            items.add(FeedListItem.Post(post))
            postsInPage += 1
          }
        }
      }

      postOffset.addAndGet(postsInPage)
      val next = json.optStringOrNull("nextCursor")
      return FeedPageResult(items = items, nextCursor = next)
    }
  }

  private fun parsePost(data: JSONObject, likedIds: Set<String>): FeedPost {
    val authorObj = data.optJSONObject("author") ?: JSONObject()
    val count = data.optJSONObject("_count") ?: JSONObject()
    val mediaArr = data.optJSONArray("media") ?: JSONArray()
    val media = ArrayList<FeedMedia>(mediaArr.length())
    for (i in 0 until mediaArr.length()) {
      val m = mediaArr.optJSONObject(i) ?: continue
      media.add(
        FeedMedia(
          id = m.optStringOrNull("id"),
          url = m.optString("url"),
          type = m.optString("type"),
          locked = m.optBoolean("locked", false),
          hlsUrl = m.optStringOrNull("hlsUrl"),
          posterUrl = m.optStringOrNull("posterUrl"),
          width = m.optIntOrNull("width"),
          height = m.optIntOrNull("height"),
          duration = if (m.has("duration") && !m.isNull("duration")) m.optDouble("duration") else null,
        )
      )
    }
    val id = data.optString("id")
    return FeedPost(
      id = id,
      content = data.optString("content"),
      createdAt = data.optString("createdAt"),
      author = FeedAuthor(
        id = authorObj.optString("id"),
        username = authorObj.optString("username"),
        name = authorObj.optStringOrNull("name"),
        image = authorObj.optStringOrNull("image"),
      ),
      media = media,
      likeCount = count.optInt("likes", 0),
      commentCount = count.optInt("comments", 0),
      liked = likedIds.contains(id) || data.optBoolean("liked", false),
    )
  }
}

private fun JSONArray?.toStringSet(): Set<String> {
  if (this == null) return emptySet()
  val out = HashSet<String>(length())
  for (i in 0 until length()) {
    val v = optString(i)
    if (v.isNotBlank()) out.add(v)
  }
  return out
}

private fun JSONObject.optStringOrNull(key: String): String? {
  if (!has(key) || isNull(key)) return null
  val v = optString(key)
  return v.ifBlank { null }
}

private fun JSONObject.optIntOrNull(key: String): Int? {
  if (!has(key) || isNull(key)) return null
  return optInt(key)
}
