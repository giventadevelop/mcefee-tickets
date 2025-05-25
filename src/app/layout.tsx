"use client";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import TrpcProvider from "@/lib/trpc/Provider";
import Script from "next/script";
import { Header } from "@/components/Header";
import { ProfileBootstrapper } from "@/components/ProfileBootstrapper";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css?family=Epilogue:300,400,500,600,700|Sora:400,500,600,700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ClerkProvider
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
          <ProfileBootstrapper />
          <TrpcProvider>
            <Header />
            {children}
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