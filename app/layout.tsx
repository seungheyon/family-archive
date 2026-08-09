import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSeason, SEASON_OVERRIDE_KEY } from "@/lib/season";
import { SeasonParticles } from "@/components/SeasonParticles";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "가족 아카이브",
    template: "%s · 가족 아카이브",
  },
  description: "가족 여행/행사 사진 아카이브",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const season = getSeason();

  return (
    <html
      lang="ko"
      data-season={season}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/*
          계절을 수동으로 고정해둔 경우, 첫 페인트 전에 그 값으로 갈아끼운다.
          이게 없으면 서버가 심은 '오늘의 계절'이 잠깐 보였다가 바뀌어 깜빡인다.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem(${JSON.stringify(
              SEASON_OVERRIDE_KEY,
            )});if(s)document.documentElement.setAttribute('data-season',s)}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* 계절 입자는 배경 레이어라 본문보다 먼저 그린다 */}
        <SeasonParticles />
        <div className="app-shell min-h-full flex flex-col">{children}</div>
      </body>
    </html>
  );
}
