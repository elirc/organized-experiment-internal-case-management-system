import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import { Providers } from "@/app/providers";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Internal Case Management System",
  description: "Queue-driven case tracking for internal operations teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="app-grid font-[var(--font-sans)] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
