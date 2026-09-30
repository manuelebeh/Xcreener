import { AutoCropBar } from '@/modules/auto-crop/components/AutoCropBar';
import { CollabBar } from '@/modules/collab/components/CollabBar';
import { CommentsPanel } from '@/modules/collab/components/CommentsPanel';
import { NotificationsBell } from '@/modules/collab/components/NotificationsBell';
import { useCollabSession } from '@/modules/collab/hooks/useCollabSession';
import { useCollabStore } from '@/modules/collab/store';
import { ExportBar } from '@/modules/export/components/ExportBar';
import { RedactionBar } from '@/modules/redaction/components/RedactionBar';
import { useAutoRedaction } from '@/modules/redaction/hooks/useAutoRedaction';
import { StyleSuggestionBar } from '@/modules/style-suggestion/components/StyleSuggestionBar';
import { useAutoStyleSuggestion } from '@/modules/style-suggestion/hooks/useAutoStyleSuggestion';
import { TextExtractionBar } from '@/modules/text-extraction/components/TextExtractionBar';
import { useCustomPresetsLoader } from '../hooks/useCustomPresets';
import { AnnotationToolbar } from './AnnotationToolbar';
import { Canvas } from './Canvas';
import { EditorSection, EditorToolsPanel } from './EditorSection';
import { PresetBar } from './PresetBar';
import { StyleBar } from './StyleBar';

export function EditorView() {
  useCustomPresetsLoader();
  useAutoRedaction();
  useAutoStyleSuggestion();
  const documentId = useCollabStore((s) => s.documentId);
  useCollabSession(documentId);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-3 flex justify-end">
        <NotificationsBell />
      </div>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <section
            className="overflow-hidden rounded-lg border border-border bg-surface p-2"
            aria-label="Canvas preview"
          >
            <Canvas />
          </section>
        </div>

        <aside
          className="min-w-0 lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto"
          aria-label="Editor tools"
        >
          <EditorToolsPanel>
            <EditorSection title="Format" testId="preset-bar-section">
              <PresetBar embedded />
            </EditorSection>
            <EditorSection title="Auto-crop" testId="auto-crop-section">
              <AutoCropBar embedded />
            </EditorSection>
            <EditorSection title="Style suggestion" testId="style-suggestion-section">
              <StyleSuggestionBar embedded />
            </EditorSection>
            <EditorSection title="Style" testId="style-bar-section">
              <StyleBar embedded />
            </EditorSection>
            <EditorSection title="Annotations" testId="annotation-toolbar-section">
              <AnnotationToolbar embedded />
            </EditorSection>
            <EditorSection title="Text extraction" testId="text-extraction-section">
              <TextExtractionBar embedded />
            </EditorSection>
            <EditorSection title="Sensitive data" testId="redaction-bar-section">
              <RedactionBar embedded />
            </EditorSection>
            <EditorSection title="Export" testId="export-bar-section">
              <ExportBar embedded />
            </EditorSection>
            <EditorSection title="Collaboration" testId="collab-bar-section">
              <CollabBar embedded />
              <CommentsPanel />
            </EditorSection>
          </EditorToolsPanel>
        </aside>
      </div>
    </div>
  );
}
