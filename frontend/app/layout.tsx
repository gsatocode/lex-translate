import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lex Translate",
  description: "Professional legal document translation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
