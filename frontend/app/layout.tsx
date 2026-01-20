import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

import { Toaster } from 'react-hot-toast';
import { NotificationListener } from "@/components/NotificationListener";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Helpdesk - Sistema de Atendimento",
  description: "Sistema de Help-Desk integrado ao WhatsApp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased bg-gray-50 dark:bg-gray-900`}>
        <AuthProvider>
          {children}
          <NotificationListener />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
