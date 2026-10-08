import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SimForge Studio",
  description: "Turn any question into an interactive simulation.",
  icons: {
    icon: [
      { url: "/simforge-favicon.png", type: "image/png", sizes: "256x256" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link href="/" className="brand-mark" aria-label="SimForge home">
              <span className="brand-icon"><Image src="/simforge-logo.png" alt="" width={34} height={34} className="brand-image" priority /></span>
              <span>simforge</span>
            </Link>
            <nav className="site-nav" aria-label="Main navigation">
              <Link href="/gallery">Gallery</Link>
              <Link href="/create" className="nav-create">Create <ArrowUpRight size={14} /></Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
