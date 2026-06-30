import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { WalletProvider } from "@/context/WalletContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import FeedbackModal from "@/components/FeedbackModal";
import "../globals.css";

export const metadata: Metadata = {
  title: "PactChain",
  description:
    "PactChain lets groups make binding decisions and hold each other accountable with USDC on Stellar.",
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <WalletProvider>
              <Toaster
                position="bottom-left"
                gutter={8}
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: "var(--card)",
                    color: "var(--card-foreground)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    fontSize: "14px",
                    padding: "12px 16px",
                    maxWidth: "360px",
                  },
                  success: {
                    iconTheme: { primary: "var(--primary)", secondary: "var(--primary-foreground)" },
                  },
                  error: {
                    duration: 6000,
                    iconTheme: { primary: "#ef4444", secondary: "#fff" },
                  },
                }}
              />
              <Navbar />
              <main className="flex-1 pb-20 sm:pb-0">{children}</main>
              <BottomNav />
              <FeedbackModal />
            </WalletProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
