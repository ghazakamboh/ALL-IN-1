import ToolLayout from '@/components/shared/ToolLayout';
import PdfToolkitClientRoot from '@/components/pdf-toolkit/PdfToolkitClientRoot';

export const metadata = {
  title: '{{SITE_NAME}} — PDF Toolkit',
  description: 'Merge, split, reorder, and rotate PDFs entirely in your browser. Free, private, no uploads.',
};

export default function PdfToolkitPage() {
  return (
    <ToolLayout
      title="PDF Toolkit"
      description="Merge, split, reorder, delete, and rotate pages with a visual thumbnail grid. Everything runs in your browser."
      toolId="pdf-toolkit"
    >
      <PdfToolkitClientRoot />
    </ToolLayout>
  );
}
