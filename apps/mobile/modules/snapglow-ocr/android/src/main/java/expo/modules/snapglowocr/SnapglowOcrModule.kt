package expo.modules.snapglowocr

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.max
import kotlin.math.roundToInt

class SnapglowOcrModule : Module() {
  private val maxOcrDimension = 2048

  override fun definition() = ModuleDefinition {
    Name("SnapglowOcr")

    AsyncFunction("recognizeText") { imageUri: String, promise: Promise ->
      recognizeText(imageUri, promise)
    }
  }

  private fun resolveUri(imageUri: String): Uri {
    return if (imageUri.startsWith("file://") || imageUri.startsWith("content://")) {
      Uri.parse(imageUri)
    } else {
      Uri.parse("file://$imageUri")
    }
  }

  private fun scaleBitmap(source: Bitmap, maxDimension: Int): Bitmap {
    val longest = max(source.width, source.height)
    if (longest <= maxDimension) {
      return source
    }

    val scale = maxDimension.toFloat() / longest.toFloat()
    val targetWidth = (source.width * scale).roundToInt().coerceAtLeast(1)
    val targetHeight = (source.height * scale).roundToInt().coerceAtLeast(1)
    return Bitmap.createScaledBitmap(source, targetWidth, targetHeight, true)
  }

  private fun recognizeText(imageUri: String, promise: Promise) {
    val context = appContext.reactContext ?: run {
      promise.reject("OcrError", "React context unavailable", null)
      return
    }

    try {
      val uri = resolveUri(imageUri)
      val inputStream = context.contentResolver.openInputStream(uri)
        ?: throw IllegalStateException("Could not open image URI")

      val original = BitmapFactory.decodeStream(inputStream)
        ?: throw IllegalStateException("Could not decode image")
      inputStream.close()

      val originalWidth = original.width.toFloat()
      val originalHeight = original.height.toFloat()
      val scaled = scaleBitmap(original, maxOcrDimension)
      val scaleX = originalWidth / scaled.width.toFloat()
      val scaleY = originalHeight / scaled.height.toFloat()

      val image = InputImage.fromBitmap(scaled, 0)
      val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

      recognizer.process(image)
        .addOnSuccessListener { visionText ->
          val lines = mutableListOf<Map<String, Any>>()

          for (block in visionText.textBlocks) {
            for (line in block.lines) {
              val text = line.text.trim()
              if (text.isEmpty()) {
                continue
              }

              val box = line.boundingBox ?: continue
              lines.add(
                mapOf(
                  "text" to text,
                  "x" to (box.left * scaleX).toDouble(),
                  "y" to (box.top * scaleY).toDouble(),
                  "width" to (box.width() * scaleX).toDouble(),
                  "height" to (box.height() * scaleY).toDouble(),
                )
              )
            }
          }

          if (scaled !== original) {
            scaled.recycle()
          }
          original.recycle()

          promise.resolve(lines)
        }
        .addOnFailureListener { error ->
          promise.reject("OcrError", error.message, error)
        }
    } catch (error: Exception) {
      promise.reject("OcrError", error.message, error)
    }
  }
}
