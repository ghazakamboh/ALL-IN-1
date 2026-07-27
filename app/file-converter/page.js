import ToolLayout from '@/components/shared/ToolLayout';
import FileConverterClientRoot from '@/components/file-converter/FileConverterClientRoot';
export const metadata = {
  title: 'Localkit — File Converter',
  description: 'Convert images (PNG, JPG, WebP) and audio (MP3, WAV, OGG) entirely in your browser.',
};
export default function FileConverterPage() {
  return (
    <ToolLayout title="File Converter" description="Convert between image and audio formats — all in your browser. No uploads, no limits." toolId="file-converter">
      <FileConverterClientRoot />
    </ToolLayout>
  );
}
