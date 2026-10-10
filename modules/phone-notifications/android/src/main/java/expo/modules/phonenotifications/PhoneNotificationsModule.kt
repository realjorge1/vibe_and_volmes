package expo.modules.phonenotifications

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.net.URL
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

class ChannelSpec : Record {
  @Field val id: String = ""
  @Field val name: String = ""
  @Field val description: String = ""
}

/** A picture: a bundled photo (uri + where its subject sits) or a drawn monogram. */
class ImageSpec : Record {
  @Field val uri: String? = null
  @Field val focusX: Double = 0.5
  @Field val focusY: Double = 0.5
  @Field val text: String? = null
  @Field val bg: String? = null
  @Field val fg: String? = null
}

class NotificationSpec : Record {
  @Field val id: Int = 0
  @Field val channelId: String = "career"
  @Field val smallIcon: String = "career"
  @Field val color: String? = null
  @Field val title: String = ""
  @Field val body: String = ""
  @Field val subText: String? = null
  @Field val largeIcon: ImageSpec? = null
  @Field val picture: ImageSpec? = null
  @Field val group: String? = null
  @Field val link: String = ""
  @Field val whenMs: Double = 0.0
  @Field val summaryId: Int = 0
  @Field val summaryTitle: String? = null
  @Field val summaryLines: List<String> = emptyList()
  @Field val summaryLink: String? = null
}

/**
 * Real Android notifications for the artist's phone apps: each app posts on
 * its own channel with its own status-bar icon and color, the sender's
 * picture as the large icon, the post's photo when expanded, grouped per app,
 * and a tap that deep-links back into the game.
 */
class PhoneNotificationsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("PhoneNotifications")

    Function("areEnabled") {
      NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    Function("ensureChannels") { channels: List<ChannelSpec> ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        for (c in channels) {
          val ch = NotificationChannel(c.id, c.name, NotificationManager.IMPORTANCE_HIGH)
          ch.description = c.description
          ch.enableVibration(true)
          ch.setShowBadge(true)
          nm.createNotificationChannel(ch)
        }
      }
    }

    // Runs on the module's background queue: decoding photos is off the UI thread.
    AsyncFunction("post") { spec: NotificationSpec ->
      post(spec)
    }

    Function("cancel") { ids: List<Int> ->
      val nm = NotificationManagerCompat.from(context)
      for (id in ids) nm.cancel(id)
    }

    Function("cancelAll") {
      NotificationManagerCompat.from(context).cancelAll()
    }
  }

  @SuppressLint("MissingPermission")
  private fun post(spec: NotificationSpec) {
    val nm = NotificationManagerCompat.from(context)
    if (!nm.areNotificationsEnabled()) return
    val icon = smallIconFor(spec.smallIcon)
    val color = parseColor(spec.color)

    val builder = NotificationCompat.Builder(context, spec.channelId)
      .setSmallIcon(icon)
      .setContentTitle(spec.title)
      .setContentText(spec.body)
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_SOCIAL)
      .setDefaults(NotificationCompat.DEFAULT_ALL)
      .setContentIntent(contentIntent(spec.link, spec.id))
    if (spec.whenMs > 0) builder.setWhen(spec.whenMs.toLong()).setShowWhen(true)
    spec.subText?.let { builder.setSubText(it) }
    if (color != null) builder.setColor(color)

    val large = spec.largeIcon?.let { avatarBitmap(it) }
    if (large != null) builder.setLargeIcon(large)

    val picture = spec.picture?.let { pictureBitmap(it) }
    if (picture != null) {
      val style = NotificationCompat.BigPictureStyle().bigPicture(picture).setSummaryText(spec.body)
      // Expanded, the photo takes over and the avatar steps aside.
      style.bigLargeIcon(null as Bitmap?)
      builder.setStyle(style)
    } else if (spec.body.isNotEmpty()) {
      builder.setStyle(NotificationCompat.BigTextStyle().bigText(spec.body))
    }

    spec.group?.let { builder.setGroup(it) }
    nm.notify(spec.id, builder.build())

    if (spec.group != null && spec.summaryId != 0 && spec.summaryLines.isNotEmpty()) {
      val inbox = NotificationCompat.InboxStyle()
      for (line in spec.summaryLines.take(6)) inbox.addLine(line)
      spec.summaryTitle?.let { inbox.setSummaryText(it) }
      val summary = NotificationCompat.Builder(context, spec.channelId)
        .setSmallIcon(icon)
        .setStyle(inbox)
        .setContentTitle(spec.summaryTitle ?: spec.title)
        .setContentText(spec.summaryLines.first())
        .setGroup(spec.group)
        .setGroupSummary(true)
        .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)
        .setAutoCancel(true)
        .setContentIntent(contentIntent(spec.summaryLink ?: spec.link, spec.summaryId))
      spec.subText?.let { summary.setSubText(it) }
      if (color != null) summary.setColor(color)
      nm.notify(spec.summaryId, summary.build())
    }
  }

  private fun smallIconFor(name: String): Int = when (name) {
    "chirp" -> R.drawable.vv_notif_chirp
    "vibegram" -> R.drawable.vv_notif_vibegram
    "toktalk" -> R.drawable.vv_notif_toktalk
    "pulsenews" -> R.drawable.vv_notif_pulsenews
    else -> R.drawable.vv_notif_career
  }

  /** Opens the game on `link` (vibeandvolumes://notification?id=...). */
  private fun contentIntent(link: String, requestCode: Int): PendingIntent {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(link)).apply {
      val component = launch?.component
      if (component != null) setComponent(component) else setPackage(context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    return PendingIntent.getActivity(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun parseColor(hex: String?): Int? = try {
    if (hex.isNullOrEmpty()) null else Color.parseColor(hex)
  } catch (e: IllegalArgumentException) {
    null
  }

  // --- Pictures ---------------------------------------------------------------

  /** Bundled assets are http URLs in development and drawable names in release. */
  private fun loadBytes(uri: String): ByteArray? = try {
    when {
      uri.startsWith("http://") || uri.startsWith("https://") ->
        URL(uri).openStream().use { it.readBytes() }
      uri.startsWith("file://") ->
        Uri.parse(uri).path?.let { java.io.File(it).readBytes() }
      else -> {
        val res = context.resources
        var id = res.getIdentifier(uri, "drawable", context.packageName)
        if (id == 0) id = res.getIdentifier(uri, "raw", context.packageName)
        if (id == 0) null else res.openRawResource(id).use { it.readBytes() }
      }
    }
  } catch (e: Throwable) {
    null
  }

  /** Decode, downsampled so the longest side is near `target` pixels. */
  private fun decode(uri: String, target: Int): Bitmap? {
    val bytes = loadBytes(uri) ?: return null
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    var sample = 1
    val longest = max(bounds.outWidth, bounds.outHeight)
    while (longest / (sample * 2) >= target) sample *= 2
    val opts = BitmapFactory.Options().apply {
      inSampleSize = sample
      inScaled = false
    }
    return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, opts)
  }

  /** A crop of `w:h` proportions around the subject. */
  private fun cropAround(src: Bitmap, ratio: Float, fx: Double, fy: Double): Rect {
    val sw = src.width
    val sh = src.height
    var cw = sw
    var ch = (sw / ratio).roundToInt()
    if (ch > sh) {
      ch = sh
      cw = (sh * ratio).roundToInt()
    }
    val cx = (fx * sw).roundToInt()
    val cy = (fy * sh).roundToInt()
    val left = min(max(0, cx - cw / 2), sw - cw)
    val top = min(max(0, cy - ch / 2), sh - ch)
    return Rect(left, top, left + cw, top + ch)
  }

  private fun avatarBitmap(spec: ImageSpec): Bitmap? {
    val size = 256
    val out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(out)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    val uri = spec.uri
    if (uri != null) {
      val src = decode(uri, 512) ?: return null
      canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint)
      paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
      canvas.drawBitmap(src, cropAround(src, 1f, spec.focusX, spec.focusY), RectF(0f, 0f, size.toFloat(), size.toFloat()), paint)
      src.recycle()
      return out
    }
    val text = spec.text ?: return null
    paint.color = parseColor(spec.bg) ?: Color.DKGRAY
    canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint)
    paint.color = parseColor(spec.fg) ?: Color.WHITE
    paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    paint.textAlign = Paint.Align.CENTER
    val lines = text.split("\n")
    val longest = lines.maxOf { it.length }.coerceAtLeast(1)
    paint.textSize = min(size * 0.42f, size * 0.9f / (longest * 0.62f)) / if (lines.size > 1) 1.15f else 1f
    val lineH = paint.textSize * 1.02f
    var y = size / 2f - lineH * (lines.size - 1) / 2f - (paint.descent() + paint.ascent()) / 2f
    for (line in lines) {
      canvas.drawText(line, size / 2f, y, paint)
      y += lineH
    }
    return out
  }

  private fun pictureBitmap(spec: ImageSpec): Bitmap? {
    val uri = spec.uri ?: return null
    val src = decode(uri, 1024) ?: return null
    val crop = cropAround(src, 2f, spec.focusX, spec.focusY)
    val w = min(1024, crop.width())
    val h = (w / 2f).roundToInt()
    val out = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    Canvas(out).drawBitmap(src, crop, RectF(0f, 0f, w.toFloat(), h.toFloat()), Paint(Paint.FILTER_BITMAP_FLAG))
    src.recycle()
    return out
  }
}
