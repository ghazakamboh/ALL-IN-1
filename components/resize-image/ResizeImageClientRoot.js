'use client';
import dynamic from 'next/dynamic';
const ResizeImageTool = dynamic(() => import('@/components/resize-image/ResizeImageTool'), { ssr: false });
export default function ResizeImageClientRoot() {
  return <ResizeImageTool />;
}
