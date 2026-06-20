import { requestPermissionsAsync } from 'expo-media-library';
import { saveToLibraryAsync } from 'expo-media-library/legacy';
import { Platform } from 'react-native';

export async function saveToPhotos(fileUri: string): Promise<boolean> {
  // Write-only: NSPhotoLibraryAddUsageDescription (not full library read).
  const permission = await requestPermissionsAsync(true);
  if (!permission.granted) {
    return false;
  }

  const localUri =
    Platform.OS === 'android' && !fileUri.startsWith('file://') ? `file://${fileUri}` : fileUri;

  await saveToLibraryAsync(localUri);
  return true;
}
