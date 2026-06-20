import { getInfoAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

const MIN_EXPORT_BYTES = 64;

async function assertShareableFile(fileUri: string): Promise<boolean> {
  const info = await getInfoAsync(fileUri);
  return info.exists && info.size >= MIN_EXPORT_BYTES;
}

export async function shareExport(fileUri: string, format: 'png' | 'jpg'): Promise<boolean> {
  if (!(await assertShareableFile(fileUri))) {
    return false;
  }

  const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const uti = format === 'jpg' ? 'public.jpeg' : 'public.png';

  if (Platform.OS === 'ios') {
    try {
      await Share.share({ url: fileUri });
      return true;
    } catch {
      return false;
    }
  }

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    return false;
  }

  try {
    await Sharing.shareAsync(fileUri, {
      mimeType,
      UTI: uti,
      dialogTitle: 'Share screenshot',
    });
    return true;
  } catch {
    return false;
  }
}
