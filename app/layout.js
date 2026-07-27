import './globals.css';

export const metadata = {
  title: '{{SITE_NAME}} — Free Browser-Based File Tools',
  description: 'Background removal, PDF editing, image conversion, audio splitting, and video trimming — free, private, and 100% on your device. No uploads, no accounts, no watermarks.',
  keywords: 'background remover, pdf editor, image converter, audio splitter, video trimmer, free tools, privacy, no upload',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#111113" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
