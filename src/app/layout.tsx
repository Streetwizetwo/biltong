import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Biltong & Bytes — Premium Halaal Biltong | Stanger KZN",
  description:
    "Premium wet biltong, hand-cured Halaal, made with love in Stanger KZN. Order online with iKhokha or WhatsApp delivery.",
  keywords: [
    "biltong",
    "halaal",
    "Stanger",
    "KZN",
    "wet biltong",
    "online order",
    "iKhokha",
  ],
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Biltong & Bytes — Premium Halaal Biltong | Stanger KZN",
    description:
      "Premium wet biltong, hand-cured Halaal, made with love in Stanger KZN. Order online with iKhokha or WhatsApp delivery.",
    images: ["/images/og-image.png"],
    type: "website",
    locale: "en_ZA",
    siteName: "Biltong & Bytes",
  },
  twitter: {
    card: "summary_large_image",
    title: "Biltong & Bytes — Premium Halaal Biltong | Stanger KZN",
    description:
      "Premium wet biltong, hand-cured Halaal, made with love in Stanger KZN.",
    images: ["/images/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,500;1,600&family=Syne:wght@400;500;600;700;800&family=Bebas+Neue&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#0A0301" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased bg-[#0A0301] text-[#FEF3DF]">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
