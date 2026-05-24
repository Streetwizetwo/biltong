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
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
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
        <script src="https://js.yoco.com/sdk/v1/yoco-sdk-web.js" async></script>
      </head>
      <body className="antialiased bg-[#0A0301] text-[#FEF3DF]">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
