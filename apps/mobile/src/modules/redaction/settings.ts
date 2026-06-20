import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTO_REDACTION_KEY = 'snapglow:autoRedaction';

export async function getAutoRedactionEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(AUTO_REDACTION_KEY);
  return value === 'true';
}

export async function setAutoRedactionEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(AUTO_REDACTION_KEY, enabled ? 'true' : 'false');
}
