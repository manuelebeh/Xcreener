import ExpoModulesCore
import Vision
import UIKit

private let maxOcrDimension: CGFloat = 2048

public class SnapglowOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SnapglowOcr")

    AsyncFunction("recognizeText") { (imageUri: String) -> [[String: Any]] in
      try self.recognize(imageUri: imageUri)
    }
  }

  private func resolveFileUrl(_ imageUri: String) -> URL {
    if let url = URL(string: imageUri), url.scheme != nil {
      return url
    }
    return URL(fileURLWithPath: imageUri)
  }

  private func scaleImage(
    cgImage: CGImage,
    maxDimension: CGFloat
  ) -> CGImage {
    let width = CGFloat(cgImage.width)
    let height = CGFloat(cgImage.height)
    let longest = max(width, height)

    if longest <= maxDimension {
      return cgImage
    }

    let scale = maxDimension / longest
    let targetWidth = Int(width * scale)
    let targetHeight = Int(height * scale)

    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard
      let context = CGContext(
        data: nil,
        width: targetWidth,
        height: targetHeight,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
      )
    else {
      return cgImage
    }

    context.interpolationQuality = .high
    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: targetWidth, height: targetHeight))
    return context.makeImage() ?? cgImage
  }

  private func recognize(imageUri: String) throws -> [[String: Any]] {
    let url = resolveFileUrl(imageUri)
    guard let data = try? Data(contentsOf: url),
          let image = UIImage(data: data),
          let cgImage = image.cgImage
    else {
      throw Exception(name: "OcrError", description: "Could not load image from URI")
    }

    let originalWidth = CGFloat(cgImage.width)
    let originalHeight = CGFloat(cgImage.height)
    let scaledImage = scaleImage(cgImage: cgImage, maxDimension: maxOcrDimension)

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true

    let handler = VNImageRequestHandler(cgImage: scaledImage, options: [:])
    try handler.perform([request])

    guard let observations = request.results else {
      return []
    }

    var lines: [[String: Any]] = []

    for observation in observations {
      guard let candidate = observation.topCandidates(1).first else {
        continue
      }

      let text = candidate.string.trimmingCharacters(in: .whitespacesAndNewlines)
      if text.isEmpty {
        continue
      }

      let bounds = observation.boundingBox
      let width = bounds.size.width * originalWidth
      let height = bounds.size.height * originalHeight
      let x = bounds.origin.x * originalWidth
      let y = (1.0 - bounds.origin.y - bounds.size.height) * originalHeight

      lines.append([
        "text": text,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
      ])
    }

    return lines
  }
}
