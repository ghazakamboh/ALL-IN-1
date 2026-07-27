'use client';
import dynamic from 'next/dynamic';
const FileConverterTool = dynamic(() => import('@/components/file-converter/FileConverterTool'), { ssr: false });
export default function FileConverterClientRoot() {
  return <FileConverterTool />;
}
