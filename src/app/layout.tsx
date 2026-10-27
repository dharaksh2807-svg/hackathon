import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FairShift",
  description: "Worker-first shift and earnings transparency",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
