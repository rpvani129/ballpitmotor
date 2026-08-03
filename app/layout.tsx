import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Grid | Ball Pit Motorsports",
  description: "The motorsports operating system by Ball Pit Motorsports.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
