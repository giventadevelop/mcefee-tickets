import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import TrpcProvider from "@/lib/trpc/Provider";
import Script from "next/script";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { Metadata } from 'next';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'MCEFEE - Event Management Platform',
  description: 'Professional event management and ticketing platform for Malayalee Cultural Events and Entertainment Foundation',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    shortcut: '/favicon-32x32.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    other: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
    ]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MCEFEE',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://mcefee.com',
    title: 'MCEFEE - Event Management Platform',
    description: 'Professional event management and ticketing platform for Malayalee Cultural Events and Entertainment Foundation',
    siteName: 'MCEFEE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MCEFEE - Event Management Platform',
    description: 'Professional event management and ticketing platform for Malayalee Cultural Events and Entertainment Foundation',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const themeColor = '#0f766e';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // For server components, we can't use usePathname, so we'll handle auth routes differently
  const isAuthRoute = false; // We'll handle this in the Header component

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css?family=Epilogue:300,400,500,600,700|Sora:400,500,600,700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
      </head>
      <body className={inter.className + " flex flex-col min-h-screen"} suppressHydrationWarning>
        <ClerkProvider
          localization={{
            signUp: {
              start: {
                subtitle: ""
              }
            },
            signIn: {
              start: {
                subtitle: ""
              }
            }
          }}
          appearance={{
            layout: {
              socialButtonsPlacement: "bottom",
              socialButtonsVariant: "iconButton",
              shimmer: true,
            },
            elements: {
              formButtonPrimary: "bg-[#39E079] hover:bg-[#32c96d]",
              card: "bg-white dark:bg-gray-800",
              navbar: "bg-white dark:bg-gray-800",
              userButtonBox: "hover:bg-gray-100 dark:hover:bg-gray-700",
              userButtonTrigger: "rounded-full",
              userButtonAvatarBox: "rounded-full",
              avatarBox: "h-10 w-10",
              userButtonPopoverCard: "shadow-lg border dark:border-gray-700",
              userPreviewMainIdentifier: "font-semibold",
              userPreviewSecondaryIdentifier: "text-gray-500 dark:text-gray-400",
            },
            variables: {
              borderRadius: "0.5rem",
              colorPrimary: "#39E079",
            },
          }}
        >
          <TrpcProvider>
            <Header hideMenuItems={isAuthRoute} />
            <div className="flex-1 flex flex-col">
              {children}
            </div>
            <Footer />
          </TrpcProvider>
        </ClerkProvider>
        <Script
          id="hcaptcha-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.hcaptchaConfig = {
                passive: true,
                usePassiveEventListeners: true
              };
            `,
          }}
        />
      </body>
    </html>
  );
}