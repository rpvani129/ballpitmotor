import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Grid | Ball Pit Motorsports",
  description: "Track events, sessions, vehicles and checklists—handled by Ball Pit Motorsports.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
