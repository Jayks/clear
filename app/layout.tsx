import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { ServiceWorkerRegistration } from "@/components/shared/service-worker-registration";
import { IOSInstallHint } from "@/components/shared/ios-install-hint";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { NavProgress } from "@/components/shared/nav-progress";
import Script from "next/script";
import "./globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
  preload: false, // display font used sparingly — preloading causes "not used in time" warning
});

export const metadata: Metadata = {
  title: "Clear — Split it. Clear it.",
  description:
    "Group expense splitting for any group. Log what you spent, who paid, and let Clear figure out who owes whom.",
  icons: {
    apple: [{ url: "/api/pwa-icon?size=192", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0891B2" },
    { media: "(prefers-color-scheme: dark)", color: "#0e7490" },
  ],
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} h-full`} suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NavProgress />
          <OfflineBanner />
          <ServiceWorkerRegistration />
          {/* Decorative background blobs */}
          <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-cyan-300/20 dark:bg-cyan-800/20 blur-3xl" />
            <div className="absolute top-1/3 -left-48 w-[500px] h-[500px] rounded-full bg-teal-300/20 dark:bg-teal-800/20 blur-3xl" />
            <div className="absolute -bottom-48 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-300/15 dark:bg-blue-800/20 blur-3xl" />
            <div className="absolute top-2/3 right-1/3 w-80 h-80 rounded-full bg-emerald-300/15 dark:bg-emerald-800/15 blur-3xl" />
          </div>
          {children}
          {modal}
          <Toaster richColors position="bottom-center" />
          <IOSInstallHint />
        </ThemeProvider>
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script
              id="ga-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{ __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { send_page_view: true });
              ` }}
            />
          </>
        )}
      </body>
    </html>
  );
}
