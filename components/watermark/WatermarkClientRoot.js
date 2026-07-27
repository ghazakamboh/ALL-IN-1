'use client';
import dynamic from 'next/dynamic';
const WatermarkTool = dynamic(() => import('@/components/watermark/WatermarkTool'), { ssr: false });
export default function WatermarkClientRoot() {
  return <WatermarkTool />;
}
