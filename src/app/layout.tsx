import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UDH - Universidad del Helado",
  description: "Sistema de seguimiento de escuelas de formación - Bogati",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
