import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import { getSiteUrl } from '@/lib/site';
import './globals.css';

const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  axes: ['wdth'],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: '¿Qué subió más? — el juego diario de precios del INDEC',
  description: 'Cada día, 5 rondas: adiviná qué producto aumentó más en el último año. Datos oficiales del INDEC.',
};

export const viewport: Viewport = {
  themeColor: '#f2f1ec',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es-AR" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}
