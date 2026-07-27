import ToolLayout from '@/components/shared/ToolLayout';
import AudioSplitterClientRoot from '@/components/audio-splitter/AudioSplitterClientRoot';

export const metadata = {
  title: '{{SITE_NAME}} — Audio Splitter',
  description: 'Upload audio, mark segments with keyboard shortcuts, and export as named WAV files. Free and private.',
};

export default function AudioSplitterPage() {
  return (
    <ToolLayout
      title="Audio Splitter"
      description="Upload a long audio recording, mark segments live while listening, and export each as a named WAV file. All processing is local."
      toolId="audio-splitter"
    >
      <AudioSplitterClientRoot />
    </ToolLayout>
  );
}
