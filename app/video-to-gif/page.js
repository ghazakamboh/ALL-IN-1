import ToolLayout from '@/components/shared/ToolLayout';
import VideoToGifClientRoot from '@/components/video-to-gif/VideoToGifClientRoot';
export const metadata = {
  title: 'Localkit — Video to GIF',
  description: 'Convert any part of a video into a high-quality animated GIF.',
};
export default function VideoToGifPage() {
  return (
    <ToolLayout title="Video to GIF" description="Upload a video, select a section, and export it as an animated GIF. Adjust FPS and scale." toolId="video-to-gif">
      <VideoToGifClientRoot />
    </ToolLayout>
  );
}
