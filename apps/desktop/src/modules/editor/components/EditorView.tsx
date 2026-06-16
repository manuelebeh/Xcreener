import { ExportBar } from '@/modules/export/components/ExportBar';
import { RedactionBar } from '@/modules/redaction/components/RedactionBar';
import { useAutoRedaction } from '@/modules/redaction/hooks/useAutoRedaction';
import { useCustomPresetsLoader } from '../hooks/useCustomPresets';
import { AnnotationToolbar } from './AnnotationToolbar';
import { Canvas } from './Canvas';
import { PresetBar } from './PresetBar';
import { StyleBar } from './StyleBar';

export function EditorView() {
  useCustomPresetsLoader();
  useAutoRedaction();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
      <Canvas />
      <AnnotationToolbar />
      <RedactionBar />
      <PresetBar />
      <StyleBar />
      <ExportBar />
    </div>
  );
}
