import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'DesarrollosMX — Vivienda nueva en CDMX',
    template: '%s | DesarrollosMX',
  },
  description: 'Marketplace de vivienda nueva en Ciudad de México. Encuentra departamentos en preventa y entrega inmediata con precios reales, planos y lista de precios.',
  keywords: ['departamentos cdmx', 'vivienda nueva', 'preventa cdmx', 'desarrollos inmobiliarios', 'departamentos preventa mexico', 'benito juarez', 'roma norte', 'del valle', 'condesa', 'narvarte'],
  authors: [{ name: 'DesarrollosMX' }],
  creator: 'DesarrollosMX',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://desarrollosmx.io'),
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    siteName: 'DesarrollosMX',
    title: 'DesarrollosMX — Vivienda nueva en CDMX',
    description: 'Marketplace de vivienda nueva en Ciudad de México. Preventa y entrega inmediata con precios reales.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'DesarrollosMX — Vivienda nueva en CDMX' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DesarrollosMX — Vivienda nueva en CDMX',
    description: 'Marketplace de vivienda nueva en Ciudad de México.',
    images: ['/og-default.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={dmSans.variable}>
      <body>{children}</body>
    </html>
  )
}
