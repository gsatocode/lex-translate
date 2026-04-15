import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lex Translate",
  description: "AI-assisted legal document translation workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
