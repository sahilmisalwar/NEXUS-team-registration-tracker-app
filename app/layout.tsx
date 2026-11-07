import type { Metadata } from "next";
import "./globals.css";
import "./polish.css";
import "./refinement.css";
import "./detail-refinement.css";
import "./plant-refinement.css";

export const metadata: Metadata = {
  title: "NEXUS Progress Tracker",
  description: "Grow every team's progress, one registration at a time.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
