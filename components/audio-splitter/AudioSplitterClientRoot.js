'use client';

import dynamic from 'next/dynamic';

const AudioSplitterTool = dynamic(() => import('@/components/audio-splitter/AudioSplitterTool'), { ssr: false });

export default function AudioSplitterClientRoot() {
  return <AudioSplitterTool />;
}
