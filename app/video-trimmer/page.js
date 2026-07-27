import ToolLayout from '@/components/shared/ToolLayout';
import VideoTrimmerClientRoot from '@/components/video-trimmer/VideoTrimmerClientRoot';

export const metadata = {
  title: '{{SITE_NAME}} — Video Trimmer & GIF Maker',
  description: 'Trim videos and export as MP4 or high-quality GIF. Works entirely in your browser. Free and private.',
};

export default function VideoTrimmerPage() {
  return (
    <ToolLayout
      title="Video Trimmer &amp; GIF Maker"
      description="Upload a video, set trim start and end points, and export as MP4 or GIF. All processing happens locally via WebAssembly."
      toolId="video-trimmer"
    >
      <VideoTrimmerClientRoot />
    </ToolLayout>
  );
}
