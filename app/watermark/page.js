import ToolLayout from '@/components/shared/ToolLayout';
import WatermarkClientRoot from '@/components/watermark/WatermarkClientRoot';
export const metadata = {
  title: 'Localkit — Watermark Tool',
  description: 'Add watermarks to images and PDFs. Choose position, opacity, and scale.',
};
export default function WatermarkPage() {
  return (
    <ToolLayout title="Watermark" description="Add watermarks to single images, batches of images, or every page of a PDF. Choose position, opacity, and scale." toolId="watermark">
      <WatermarkClientRoot />
    </ToolLayout>
  );
}
