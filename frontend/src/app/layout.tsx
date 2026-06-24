import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { WalletProvider } from "@/context/WalletContext";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "PactChain — Make commitments that stick",
  description:
    "Social commitment dApp on Stellar. Lock USDC in escrow, vote on the winner, get paid automatically.",
  openGraph: {
    title: "PactChain",
    description: "Binding social commitments on Stellar",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <WalletProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#1e1b2e",
                color: "#e2e8f0",
                border: "1px solid #3b3260",
              },
            }}
          />
          <Navbar />
          <main className="flex-1">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
