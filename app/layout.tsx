import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0F172A',
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Simulador de Examen de Ascenso PNP',
  description: 'Simulador oficial para el examen de ascenso de la Policía Nacional del Perú - 1,500 preguntas reales',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SIMULADOR PNP',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icon-192.svg',
    apple: '/icon-192.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
