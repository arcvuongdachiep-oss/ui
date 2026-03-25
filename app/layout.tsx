import type { Metadata } from 'next'
import { Geist, Geist_Mono, Be_Vietnam_Pro } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Header } from '@/components/header'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const _beVietnamPro = Be_Vietnam_Pro({ 
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-vietnamese"
});

export const metadata: Metadata = {
  title: 'HIEPD5.COM - Scientific Prompt Architect',
  description: 'AI-powered architectural visualization prompt generator. Transform your Sketchup/Revit renders with cinematic lighting and materials.',
  generator: 'v0.app',
  icons: {
    icon: '/icon.ico',
    shortcut: '/icon.ico',
    apple: '/icon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${_beVietnamPro.variable}`}>
        <Header />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
