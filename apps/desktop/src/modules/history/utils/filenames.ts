function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const millis = String(date.getMilliseconds()).padStart(3, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}_${millis}`;
}

export function generateCaptureFilename(
  date = new Date(),
  format: 'png' | 'gif' | 'mp4' = 'png'
): string {
  return `capture_${formatTimestamp(date)}.${format}`;
}

export function generateThumbnailFilename(date = new Date()): string {
  return `thumb_${formatTimestamp(date)}.webp`;
}

export function monthFolder(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}
