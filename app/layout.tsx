import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { PinGate } from "@/components/PinGate";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Karfeshha POS",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>
        <PinGate>
          <div style={{ padding: 16 }}>{children}</div>
        </PinGate>
      </body>
    </html>
  );
}
