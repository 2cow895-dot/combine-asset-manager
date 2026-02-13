import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Combine Asset Manager',
  description: 'Google Sheets 기반 다중 사용자 자산 통합 및 잉여금 배분 시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50">
        {children}
      </body>
    </html>
  );
}
