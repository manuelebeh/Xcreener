import { createCanvas, loadImage } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { readImageDimensions } from './image-dimensions';

/** PNG signature + IHDR chunk only: a header that announces a size with no pixel data. */
function pngHeader(width: number, height: number): Buffer {
  const header = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write('IHDR', 12, 'ascii');
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  header[24] = 8;
  header[25] = 6;
  return header;
}

/** Inserts an APP1 Exif segment with one Orientation entry after the JPEG SOI marker. */
function withExifOrientation(jpeg: Buffer, orientation: number): Buffer {
  const tiff = Buffer.from('4d4d002a000000080001011200030000000100000000000000000000', 'hex');
  tiff.writeUInt16BE(orientation, 18);
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
  const marker = Buffer.alloc(4);
  marker.writeUInt16BE(0xffe1, 0);
  marker.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), marker, payload, jpeg.subarray(2)]);
}

describe('readImageDimensions', () => {
  it.each([
    ['png', createCanvas(320, 200).toBuffer('image/png')],
    ['jpeg', createCanvas(320, 200).toBuffer('image/jpeg')],
    ['webp', createCanvas(320, 200).toBuffer('image/webp')],
  ])('reads a %s header', (_format, buffer) => {
    expect(readImageDimensions(buffer)).toEqual({ width: 320, height: 200 });
  });

  it('reads a gif header', () => {
    const gif = Buffer.alloc(13);
    gif.write('GIF89a', 0, 'ascii');
    gif.writeUInt16LE(320, 6);
    gif.writeUInt16LE(200, 8);
    expect(readImageDimensions(gif)).toEqual({ width: 320, height: 200 });
  });

  it('matches loadImage on a rotated jpeg', async () => {
    const rotated = withExifOrientation(createCanvas(320, 200).toBuffer('image/jpeg'), 6);
    const decoded = await loadImage(rotated);
    expect(readImageDimensions(rotated)).toEqual({ width: decoded.width, height: decoded.height });
    expect(readImageDimensions(rotated)).toEqual({ width: 200, height: 320 });
  });

  it('reads the announced size without decoding pixels', () => {
    expect(readImageDimensions(pngHeader(10_000, 10_000))).toEqual({
      width: 10_000,
      height: 10_000,
    });
  });

  it('returns null for unsupported or corrupt input', () => {
    const mp4 = Buffer.from('000000206674797069736f6d0000020069736f6d69736f32', 'hex');
    expect(readImageDimensions(mp4)).toBeNull();
    expect(readImageDimensions(Buffer.from('not an image'))).toBeNull();
    expect(readImageDimensions(Buffer.alloc(0))).toBeNull();
  });
});
