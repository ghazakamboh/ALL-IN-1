import ToolLayout from '@/components/shared/ToolLayout';
import ResizeImageClientRoot from '@/components/resize-image/ResizeImageClientRoot';
export const metadata = {
  title: 'Localkit — Resize Image',
  description: 'Resize one or more images to exact dimensions, percentage, or longest edge.',
};
export default function ResizeImagePage() {
  return (
    <ToolLayout title="Resize Image" description="Resize images to exact dimensions, by percentage, or to a longest-edge limit. Batch process multiple at once." toolId="resize-image">
      <ResizeImageClientRoot />
    </ToolLayout>
  );
}
