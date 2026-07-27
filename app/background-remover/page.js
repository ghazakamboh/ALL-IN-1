import ToolLayout from '@/components/shared/ToolLayout';
import BackgroundRemoverClientRoot from '@/components/background-remover/BackgroundRemoverClientRoot';

export const metadata = {
  title: '{{SITE_NAME}} — Background Remover',
  description: 'Remove or replace image backgrounds using on-device ML. Your files never leave your browser. Free, no uploads, no watermarks.',
};

export default function BackgroundRemoverPage() {
  return (
    <ToolLayout
      title="Background Remover"
      description="Upload an image and remove its background with on-device machine learning. Everything runs in your browser — nothing is uploaded."
      toolId="background-remover"
    >
      <BackgroundRemoverClientRoot />
    </ToolLayout>
  );
}
