package expo.modules.photosense

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.graphics.Rect
import android.media.ExifInterface
import android.net.Uri
import com.google.android.gms.common.api.OptionalModuleApi
import com.google.android.gms.common.moduleinstall.ModuleInstall
import com.google.android.gms.common.moduleinstall.ModuleInstallRequest
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetector
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.google.mlkit.vision.label.ImageLabeler
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.InputStream
import java.util.concurrent.TimeUnit
import kotlin.math.max
import kotlin.math.min

/**
 * Reads what a photo shows, on the phone, so the game's commenters react to
 * the right thing (a dog, a meme, a couple, a watch...). Google ML Kit through
 * Play services: image labels, face boxes, and how much text sits on the
 * picture and where.
 *
 * Nothing leaves the device, and the words found in a photo are never
 * returned: only how much text there is and where it sits.
 */
class PhotoSenseModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var labeler: ImageLabeler? = null
  private var faceDetector: FaceDetector? = null
  private var textRecognizer: TextRecognizer? = null

  private fun labels(): ImageLabeler =
    labeler ?: ImageLabeling.getClient(ImageLabelerOptions.Builder().setConfidenceThreshold(0.4f).build()).also { labeler = it }

  private fun faces(): FaceDetector =
    faceDetector ?: FaceDetection.getClient(
      FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
        .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
        .setMinFaceSize(0.06f)
        .build()
    ).also { faceDetector = it }

  private fun reader(): TextRecognizer =
    textRecognizer ?: TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS).also { textRecognizer = it }

  override fun definition() = ModuleDefinition {
    Name("PhotoSense")

    /** True when the three models are on the phone; otherwise asks Play services to fetch them. */
    AsyncFunction("prepare") {
      prepare()
    }

    /** Labels, faces and text layout for one photo (a file:// or content:// uri). */
    AsyncFunction("analyze") { uri: String ->
      analyze(uri)
    }

    /** Whether the file came out of a camera (and which one), from its EXIF. */
    AsyncFunction("camera") { uri: String ->
      cameraInfo(uri)
    }

    OnDestroy {
      try { labeler?.close() } catch (_: Throwable) {}
      try { faceDetector?.close() } catch (_: Throwable) {}
      try { textRecognizer?.close() } catch (_: Throwable) {}
      labeler = null
      faceDetector = null
      textRecognizer = null
    }
  }

  private fun prepare(): Boolean {
    return try {
      val client = ModuleInstall.getClient(context)
      val apis = arrayOf<OptionalModuleApi>(labels(), faces(), reader())
      val available = Tasks.await(client.areModulesAvailable(*apis), 10, TimeUnit.SECONDS)
      if (available.areModulesAvailable()) return true
      val builder = ModuleInstallRequest.newBuilder()
      for (api in apis) builder.addApi(api)
      // Starts the download; the models arrive in the background.
      Tasks.await(client.installModules(builder.build()), 20, TimeUnit.SECONDS)
      false
    } catch (_: Throwable) {
      false
    }
  }

  private fun <T> settle(task: Task<T>?): T? {
    if (task == null) return null
    return try {
      Tasks.await(task, 8, TimeUnit.SECONDS)
    } catch (_: Throwable) {
      null
    }
  }

  private fun analyze(uri: String): Map<String, Any?> {
    val bitmap = decode(uri) ?: return mapOf("ok" to false)
    try {
      val image = InputImage.fromBitmap(bitmap, 0)
      val w = bitmap.width.toDouble()
      val h = bitmap.height.toDouble()
      // Start all three, then wait: they run side by side inside Play services.
      val labelTask = try { labels().process(image) } catch (_: Throwable) { null }
      val faceTask = try { faces().process(image) } catch (_: Throwable) { null }
      val textTask = try { reader().process(image) } catch (_: Throwable) { null }

      val labelList = settle(labelTask)
      val faceList = settle(faceTask)
      val text = settle(textTask)

      val labelsOut = labelList
        ?.sortedByDescending { it.confidence }
        ?.take(20)
        ?.map { mapOf("text" to it.text, "confidence" to it.confidence.toDouble()) }

      val facesOut = faceList
        ?.sortedByDescending { it.boundingBox.width() * it.boundingBox.height() }
        ?.take(12)
        ?.map { f ->
          val b = f.boundingBox
          mapOf(
            "x" to clamp01(b.left / w),
            "y" to clamp01(b.top / h),
            "w" to clamp01(b.width() / w),
            "h" to clamp01(b.height() / h),
            "smile" to f.smilingProbability?.toDouble(),
          )
        }

      val textOut = text?.let { t ->
        var chars = 0
        var lines = 0
        var area = 0.0
        var top = 0.0
        var bottom = 0.0
        for (block in t.textBlocks) {
          chars += block.text.count { !it.isWhitespace() }
          lines += block.lines.size
          val box: Rect = block.boundingBox ?: continue
          val a = (box.width().toDouble() / w) * (box.height().toDouble() / h)
          area += a
          val mid = box.exactCenterY() / h
          if (mid < 0.35) top += a
          if (mid > 0.65) bottom += a
        }
        mapOf(
          "chars" to chars,
          "lines" to lines,
          "blocks" to t.textBlocks.size,
          "coverage" to min(1.0, area),
          "top" to if (area > 0) top / area else 0.0,
          "bottom" to if (area > 0) bottom / area else 0.0,
        )
      }

      return mapOf(
        "ok" to (labelList != null || faceList != null || text != null),
        "w" to w,
        "h" to h,
        "labels" to labelsOut,
        "faces" to facesOut,
        "text" to textOut,
      )
    } catch (_: Throwable) {
      return mapOf("ok" to false)
    } finally {
      bitmap.recycle()
    }
  }

  private fun clamp01(v: Double): Double = max(0.0, min(1.0, v))

  private fun open(uri: String): InputStream? {
    return try {
      val u = Uri.parse(uri)
      when (u.scheme) {
        null, "file" -> File(u.path ?: uri).inputStream()
        else -> context.contentResolver.openInputStream(u)
      }
    } catch (_: Throwable) {
      null
    }
  }

  /** The photo at no more than MAX_SIDE on its long side, turned upright. */
  private fun decode(uri: String): Bitmap? {
    return try {
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      val probe = open(uri) ?: return null
      probe.use { BitmapFactory.decodeStream(it, null, bounds) }
      if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
      var sample = 1
      while (max(bounds.outWidth, bounds.outHeight) / (sample * 2) >= MAX_SIDE) sample *= 2
      val opts = BitmapFactory.Options().apply {
        inSampleSize = sample
        inPreferredConfig = Bitmap.Config.ARGB_8888
      }
      val stream = open(uri) ?: return null
      val raw = stream.use { BitmapFactory.decodeStream(it, null, opts) } ?: return null
      val degrees = open(uri)?.use { orientation(it) } ?: 0
      if (degrees == 0) return raw
      val m = Matrix().apply { postRotate(degrees.toFloat()) }
      val turned = Bitmap.createBitmap(raw, 0, 0, raw.width, raw.height, m, true)
      if (turned != raw) raw.recycle()
      turned
    } catch (_: Throwable) {
      null
    }
  }

  private fun orientation(stream: InputStream): Int {
    return try {
      when (ExifInterface(stream).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
        ExifInterface.ORIENTATION_ROTATE_90 -> 90
        ExifInterface.ORIENTATION_ROTATE_180 -> 180
        ExifInterface.ORIENTATION_ROTATE_270 -> 270
        else -> 0
      }
    } catch (_: Throwable) {
      0
    }
  }

  /**
   * Only booleans go back: whether a camera took it, and whether it was the
   * front one. The make, model and location stay in the file.
   */
  private fun cameraInfo(uri: String): Map<String, Any?> {
    val stream = open(uri) ?: return mapOf("ok" to false)
    return try {
      stream.use {
        val e = ExifInterface(it)
        val make = e.getAttribute(ExifInterface.TAG_MAKE)
        val model = e.getAttribute(ExifInterface.TAG_MODEL)
        val lens = e.getAttribute("LensModel") ?: ""
        val taken = e.getAttribute(ExifInterface.TAG_DATETIME_ORIGINAL) != null
        mapOf(
          "ok" to true,
          "camera" to ((make != null || model != null) && taken),
          "front" to lens.contains("front", ignoreCase = true),
        )
      }
    } catch (_: Throwable) {
      mapOf("ok" to false)
    }
  }

  companion object {
    private const val MAX_SIDE = 1024
  }
}
