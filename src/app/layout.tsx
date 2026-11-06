import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/shared/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "ENS — Entorno de Navegación Supervisado",
  description: "Supervisión de navegación web en clase para el piloto del Colegio Santa María",
  appleWebApp: { capable: true, title: "ENS", statusBarStyle: "black-translucent" },
  icons: { apple: "/apple-touch-icon.png" },
};

// viewportFit cover + env(safe-area-inset-*) en la barra inferior: la PWA
// instalada ocupa toda la pantalla sin quedar debajo del home indicator.
export const viewport: Viewport = {
  themeColor: "#14342b",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
