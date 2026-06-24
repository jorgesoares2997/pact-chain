import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { WalletProvider } from "@/context/WalletContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import "../globals.css";

export const metadata: Metadata = {
  title: "PactChain — Make commitments that stick",
  description:
    "Social commitment dApp on Stellar. Lock USDC in escrow, vote on the winner, get paid automatically.",
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
                position="top-center"
                toastOptions={{
                  style: {
                    background: "var(--card)",
                    color: "var(--card-foreground)",
                    border: "1px solid var(--border)",
                  },
                }}
              />
              <Navbar />
              <main className="flex-1 pb-20 sm:pb-0">{children}</main>
              <BottomNav />
            </WalletProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
