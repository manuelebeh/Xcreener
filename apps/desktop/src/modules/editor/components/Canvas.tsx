import { useEditorStore } from '../store';

export function Canvas() {
  const padding = useEditorStore((s) => s.padding);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 12,
        minHeight: 200,
        color: '#fff',
      }}
    >
      Editor canvas placeholder
    </div>
  );
}
