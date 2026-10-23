import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sugar Platform Diagnostic",
  description: "Evidence-backed platform diagnostics for technology leaders."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a className="brand" href="/">Sugar Platforms</a>
          <nav>
            <a href="/sample">Sample diagnostic</a>
            <a className="button button-small" href="/assessment/new">Analyze my platform</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">Architecture metadata only. Never upload customer records or credentials.</footer>
      </body>
    </html>
  );
}
