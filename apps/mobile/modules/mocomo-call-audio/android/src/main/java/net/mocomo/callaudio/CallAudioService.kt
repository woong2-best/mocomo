package net.mocomo.callaudio

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import java.net.HttpURLConnection
import java.net.URL

/**
 * Holds the microphone foreground service so a voice call survives the home button.
 * Removing the app from recents runs [onTaskRemoved] and ends the call on the server.
 */
class CallAudioService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopForeground(STOP_FOREGROUND_REMOVE)
      stopSelf()
      return START_NOT_STICKY
    }

    val endUrl = intent?.getStringExtra(EXTRA_END_URL)
    val token = intent?.getStringExtra(EXTRA_TOKEN)
    if (!endUrl.isNullOrBlank() && !token.isNullOrBlank()) {
      EndUrl = endUrl
      Token = token
    }

    try {
      val notification = buildNotification()
      if (Build.VERSION.SDK_INT >= 34) {
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
    } catch (_: Throwable) {
      stopSelf()
      return START_NOT_STICKY
    }
    return START_STICKY
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    postEnd()
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
    super.onTaskRemoved(rootIntent)
  }

  private fun buildNotification(): Notification {
    val manager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      if (manager.getNotificationChannel(CHANNEL_ID) == null) {
        val channel = NotificationChannel(CHANNEL_ID, "음성 통화", NotificationManager.IMPORTANCE_LOW)
        channel.setSound(null, null)
        channel.enableVibration(false)
        manager.createNotificationChannel(channel)
      }
    }

    val builder =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Notification.Builder(this, CHANNEL_ID)
      } else {
        @Suppress("DEPRECATION")
        Notification.Builder(this)
      }
    return builder
      .setContentTitle("음성 통화")
      .setContentText("다른 화면에서도 통화가 계속됩니다")
      .setSmallIcon(android.R.drawable.ic_menu_call)
      .setOngoing(true)
      .build()
  }

  private fun postEnd() {
    val url = EndUrl ?: return
    val token = Token ?: return
    EndUrl = null
    Token = null
    val worker = Thread {
      var conn: HttpURLConnection? = null
      try {
        conn = (URL(url).openConnection() as HttpURLConnection).apply {
          connectTimeout = 2500
          readTimeout = 2500
          requestMethod = "POST"
          setRequestProperty("Authorization", "Bearer $token")
          setRequestProperty("Content-Type", "application/json")
          doOutput = true
        }
        conn.outputStream.use { it.write("{}".toByteArray()) }
        conn.responseCode
      } catch (_: Throwable) {
        /* process is going away */
      } finally {
        conn?.disconnect()
      }
    }
    worker.start()
    try {
      worker.join(2500)
    } catch (_: InterruptedException) {
      /* ignore */
    }
  }

  companion object {
    const val ACTION_STOP = "net.mocomo.callaudio.STOP"
    const val EXTRA_END_URL = "endUrl"
    const val EXTRA_TOKEN = "token"
    private const val CHANNEL_ID = "mocomo-voice-call"
    private const val NOTIFICATION_ID = 47021

    @Volatile
    var EndUrl: String? = null

    @Volatile
    var Token: String? = null
  }
}
