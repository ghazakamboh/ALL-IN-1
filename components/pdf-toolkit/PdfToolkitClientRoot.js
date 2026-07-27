'use client';

import dynamic from 'next/dynamic';

const PdfToolkit = dynamic(() => import('@/components/pdf-toolkit/PdfToolkit'), { ssr: false });

export default function PdfToolkitClientRoot() {
  return <PdfToolkit />;
}
