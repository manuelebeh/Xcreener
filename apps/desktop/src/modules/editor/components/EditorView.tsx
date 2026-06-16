import { useCustomPresetsLoader } from '../hooks/useCustomPresets';
import { AnnotationToolbar } from './AnnotationToolbar';
import { Canvas } from './Canvas';
import { PresetBar } from './PresetBar';
import { StyleBar } from './StyleBar';

export function EditorView() {
  useCustomPresetsLoader();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
      <Canvas />
      <AnnotationToolbar />
      <PresetBar />
      <StyleBar />
    </div>
  );
}
