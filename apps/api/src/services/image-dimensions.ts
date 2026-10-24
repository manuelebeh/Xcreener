import { imageSize } from 'image-size';

/**
 * Reads width and height from the file header, without decoding pixels. `null` when unreadable.
 * EXIF orientations 5-8 swap the sides, as `loadImage` does when it decodes.
 */
export function readImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    const { width, height, orientation } = imageSize(buffer);
    if (!(width > 0 && height > 0)) {
      return null;
    }
    return orientation && orientation >= 5 ? { width: height, height: width } : { width, height };
  } catch {
    return null;
  }
}
