import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Atom } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SimForge Studio",
  description: "Turn any question into an interactive simulation.",
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
              <span className="brand-icon"><Atom size={17} strokeWidth={1.8} /></span>
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
