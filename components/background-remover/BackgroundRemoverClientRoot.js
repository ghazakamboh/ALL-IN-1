'use client';

import dynamic from 'next/dynamic';

const BackgroundRemoverTool = dynamic(
  () => import('@/components/background-remover/BackgroundRemoverTool'),
  { ssr: false }
);

export default function BackgroundRemoverClientRoot() {
  return <BackgroundRemoverTool />;
}
