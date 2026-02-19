import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { CommandPaletteProvider } from "@/components/layout/command-palette"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Ironheart",
    template: "%s | Ironheart",
  },
  description: "Enterprise booking management platform",
  robots: {
    index: false,
    follow: false,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={inter.variable}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <Providers>
          <CommandPaletteProvider>
            {children}
          </CommandPaletteProvider>
        </Providers>
      </body>
    </html>
  )
}
