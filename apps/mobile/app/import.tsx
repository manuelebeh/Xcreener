import { spacing } from '@snapglow/design-tokens/tokens.native';
import { Button, useTheme } from '@snapglow/ui-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCaptureStore } from '@/modules/capture';

export default function ImportScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const importedImage = useCaptureStore((state) => state.importedImage);
  const clearImportedImage = useCaptureStore((state) => state.clearImportedImage);

  const handleBack = () => {
    clearImportedImage();
    router.replace('/');
  };

  if (!importedImage) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            No image imported yet. Share a screenshot from another app.
          </Text>
          <Button variant="secondary" onPress={handleBack}>
            Back home
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Imported image</Text>
        {importedImage.fileName ? (
          <Text style={[styles.meta, { color: colors.muted }]}>{importedImage.fileName}</Text>
        ) : null}

        <View style={[styles.previewFrame, { borderColor: colors.border }]}>
          <Image
            source={{ uri: importedImage.uri }}
            style={styles.preview}
            contentFit="contain"
            accessibilityLabel="Imported screenshot preview"
          />
        </View>

        {importedImage.width && importedImage.height ? (
          <Text style={[styles.meta, { color: colors.muted }]}>
            {importedImage.width} × {importedImage.height}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Button variant="primary" onPress={() => router.replace('/')}>
            Continue
          </Button>
          <Button variant="secondary" onPress={handleBack}>
            Import another
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    padding: spacing['6'],
    gap: spacing['4'],
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  meta: {
    fontSize: 14,
  },
  previewFrame: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 240,
    backgroundColor: '#00000010',
  },
  preview: {
    width: '100%',
    height: 320,
  },
  actions: {
    gap: spacing['3'],
    marginTop: spacing['2'],
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['6'],
    gap: spacing['4'],
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
