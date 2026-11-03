import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { getSiteUrl, SITE_NAME } from '@/lib/site';
import './globals.css';

const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  axes: ['wdth'],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: `${SITE_NAME} | ¿Qué subió más en el súper?`,
  description: 'Cada día, 5 rondas: adiviná qué producto del súper aumentó más en el último año. Datos oficiales del INDEC.',
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, locale: 'es_AR', type: 'website' },
};

export const viewport: Viewport = {
  themeColor: '#f2f1ec',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es-AR" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-paper text-ink">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
