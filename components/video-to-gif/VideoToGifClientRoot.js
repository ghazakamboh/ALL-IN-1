'use client';
import dynamic from 'next/dynamic';
const VideoToGifTool = dynamic(() => import('@/components/video-to-gif/VideoToGifTool'), { ssr: false });
export default function VideoToGifClientRoot() {
  return <VideoToGifTool />;
}
