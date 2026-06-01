import type { Metadata, Viewport } from "next";
import { Playfair_Display, Lato, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/components/shared/auth-provider";
import { ToastContainer } from "@/components/shared/toast-container";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lato",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Villa Amor — Gestão Operacional",
  description: "Sistema de gestão assistencial para a Villa Amor Marília",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Villa Amor",
  },
};

export const viewport: Viewport = {
  themeColor: "#B8864E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={cn(
        "min-height-screen bg-cream-50 font-body text-dark-800 antialiased",
        playfair.variable,
        lato.variable,
        jetbrains.variable
      )}>
        <AuthProvider>
          {children}
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
