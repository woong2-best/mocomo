package net.mocomo.nativefeed

/**
 * Resolve a still thumbnail for feed video cells.
 * Prefer server posterUrl / streamUid; otherwise derive Cloudflare Stream
 * first-frame URL only from known Stream hosts (never guess from arbitrary hex paths).
 */
object VideoPoster {
  private val CF_UID = Regex(
    """(?:videodelivery\.net|cloudflarestream\.com)/([^/?#]+)""",
    RegexOption.IGNORE_CASE,
  )

  fun resolve(
    posterUrl: String?,
    videoUrl: String?,
    hlsUrl: String? = null,
    streamUid: String? = null,
  ): String? {
    posterUrl?.trim()?.takeIf { it.isNotEmpty() }?.let { return it }

    streamUid?.trim()?.takeIf { it.isNotEmpty() && isPlausibleStreamUid(it) }?.let { uid ->
      return cfThumb(uid)
    }

    val probe = listOfNotNull(hlsUrl, videoUrl)
      .map { it.trim() }
      .firstOrNull { it.isNotEmpty() }
      .orEmpty()
    if (probe.isEmpty()) return null

    val uid = CF_UID.find(probe)?.groupValues?.getOrNull(1) ?: return null
    if (!isPlausibleStreamUid(uid)) return null
    return cfThumb(uid)
  }

  private fun cfThumb(uid: String): String =
    "https://videodelivery.net/$uid/thumbnails/thumbnail.jpg?time=0s&height=720"

  private fun isPlausibleStreamUid(uid: String): Boolean =
    uid.length >= 16 && uid.all { it.isLetterOrDigit() || it == '_' || it == '-' }
}
