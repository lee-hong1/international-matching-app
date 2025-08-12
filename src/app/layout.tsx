import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "GlobalMatch - 국제 매칭 플랫폼",
  description: "전 세계의 특별한 인연을 만나는 신뢰할 수 있는 국제 매칭 서비스",
  keywords: "국제연애, 매칭, 데이팅, 외국인친구, 글로벌매칭",
  authors: [{ name: "GlobalMatch Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#9333ea",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
