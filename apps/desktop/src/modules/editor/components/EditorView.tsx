import { BalanceBar } from '@/modules/balance';
import { CollabMenu } from '@/modules/collab/components/CollabMenu';
import { useCollabSession } from '@/modules/collab/hooks/useCollabSession';
import { useCollabStore } from '@/modules/collab/store';
import { ExportBar } from '@/modules/export/components/ExportBar';
import { RedactionBar } from '@/modules/redaction/components/RedactionBar';
import { useAutoRedaction } from '@/modules/redaction/hooks/useAutoRedaction';
import { StyleSuggestionBar } from '@/modules/style-suggestion/components/StyleSuggestionBar';
import { useAutoStyleSuggestion } from '@/modules/style-suggestion/hooks/useAutoStyleSuggestion';
import { TextExtractionBar, useAutoTextExtraction } from '@/modules/text-extraction';
import { useCustomPresetsLoader } from '../hooks/useCustomPresets';
import { useEditorStore } from '../store';
import {
  AnnotationToolbar,
  AnnotationToolStrip,
  useHasAnnotationOptions,
} from './AnnotationToolbar';
import { Canvas } from './Canvas';
import { EditorSection, EditorToolsPanel } from './EditorSection';
import { PresetBar } from './PresetBar';
import { StyleBar } from './StyleBar';

export function EditorView() {
  useCustomPresetsLoader();
  useAutoRedaction();
  useAutoStyleSuggestion();
  useAutoTextExtraction();
  const hasScreenshot = useEditorStore((s) => s.screenshot !== null);
  const hasAnnotationOptions = useHasAnnotationOptions();
  const documentId = useCollabStore((s) => s.documentId);
  useCollabSession(documentId);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(300px,340px)]">
      <div className="flex min-h-0 min-w-0 flex-col">
        {hasScreenshot ? (
          <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3">
            <AnnotationToolStrip />
            <CollabMenu />
          </div>
        ) : null}
        <div className="min-h-0 flex-1">
          <Canvas />
        </div>
      </div>

      <aside
        className="flex min-h-0 min-w-0 flex-col border-l border-border bg-surface"
        aria-label="Editor tools"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          {hasScreenshot ? (
            <EditorToolsPanel>
              <div className="px-4 py-3 empty:hidden">
                <StyleSuggestionBar embedded />
              </div>
              {hasAnnotationOptions ? (
                <EditorSection title="Annotation options" testId="annotation-toolbar-section">
                  <AnnotationToolbar embedded />
                </EditorSection>
              ) : null}
              <EditorSection title="Format" testId="preset-bar-section">
                <PresetBar embedded />
              </EditorSection>
              <EditorSection title="Style" testId="style-bar-section">
                <StyleBar embedded marginControls={<BalanceBar embedded />} />
              </EditorSection>
              <EditorSection title="Text" testId="text-section">
                <div className="space-y-5">
                  <TextExtractionBar embedded />
                  <div className="border-t border-border pt-5">
                    <RedactionBar embedded />
                  </div>
                </div>
              </EditorSection>
            </EditorToolsPanel>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-muted">
              Tools appear here once a capture is open.
            </p>
          )}
        </div>

        {hasScreenshot ? (
          <div className="shrink-0 border-t border-border bg-surface">
            <EditorSection title="Export" testId="export-bar-section" collapsible={false}>
              <ExportBar embedded />
            </EditorSection>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
