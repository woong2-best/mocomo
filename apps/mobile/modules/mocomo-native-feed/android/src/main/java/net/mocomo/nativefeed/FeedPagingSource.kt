package net.mocomo.nativefeed

import androidx.paging.PagingSource
import androidx.paging.PagingState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class FeedPagingSource(
  private val api: FeedApi,
) : PagingSource<String, FeedListItem>() {

  override suspend fun load(params: LoadParams<String>): LoadResult<String, FeedListItem> {
    return withContext(Dispatchers.IO) {
      try {
        if (params is LoadParams.Refresh) {
          api.resetOffset()
        }
        val page = api.loadPage(cursor = params.key, limit = params.loadSize)
        LoadResult.Page(
          data = page.items,
          prevKey = null,
          nextKey = page.nextCursor,
        )
      } catch (e: FeedApi.AuthExpiredException) {
        LoadResult.Error(e)
      } catch (e: Exception) {
        LoadResult.Error(e)
      }
    }
  }

  override fun getRefreshKey(state: PagingState<String, FeedListItem>): String? = null
}
