import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ADMS Server - eSSL Biomatrix",
  description: "Automatic Data Master Server for eSSL Biomatrix Devices",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

