import type { Metadata, Viewport } from "next";
import { Inter_Tight, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F9F9FB' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0B' },
  ],
};

export const metadata: Metadata = {
  title: {
    default: 'Personal OS — Run your life on quiet rails',
    template: '%s · Personal OS',
  },
  description: 'A calm, structured home for tasks, habits, deep work, studies, and the errands you keep putting off.',
  appleWebApp: {
    capable: true,
    title: 'Personal OS',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'Personal OS',
    description: 'Run your life on quiet rails.',
    type: 'website',
    siteName: 'Personal OS',
    images: ['/opengraph-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Personal OS',
    description: 'Run your life on quiet rails.',
  },
};

// Inline script runs synchronously before first paint to prevent flash
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`.trim();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans`}>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
