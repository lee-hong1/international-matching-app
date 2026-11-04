import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "GlobalMatch - 국제 매칭 플랫폼",
  description: "전 세계의 특별한 인연을 만나는 신뢰할 수 있는 국제 매칭 서비스",
  keywords: "국제연애, 매칭, 데이팅, 외국인친구, 글로벌매칭",
  authors: [{ name: "GlobalMatch Team" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GlobalMatch",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#9333ea",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        {/* SW 등록 — 프로덕션 전용, 외부 스크립트 없이 inline */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch(function() {});
  });
}
            `.trim(),
          }}
        />
      </body>
    </html>
  );
}
