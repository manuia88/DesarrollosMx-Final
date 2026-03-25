import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DesarrollosMX — Vivienda nueva en CDMX',
  description: 'Encuentra departamentos en preventa y entrega inmediata en Ciudad de México.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
