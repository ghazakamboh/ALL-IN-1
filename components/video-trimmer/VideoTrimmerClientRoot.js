'use client';

import dynamic from 'next/dynamic';

const VideoTrimmerTool = dynamic(() => import('@/components/video-trimmer/VideoTrimmerTool'), { ssr: false });

export default function VideoTrimmerClientRoot() {
  return <VideoTrimmerTool />;
}
