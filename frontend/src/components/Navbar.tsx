"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Menu, X, Globe, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { Button } from "./ui/Button";

export default function Navbar() {
  const t = useTranslations("Nav");
  const { address, connecting, connect, disconnect } = useWallet();
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();
  
  // Basic i18n locale switcher logic
  const pathname = usePathname();
  const router = useRouter();
  const currentLocale = pathname.startsWith("/pt") ? "pt" : "en";
  const toggleLocale = () => {
    const newLocale = currentLocale === "en" ? "pt" : "en";
    router.replace(pathname.replace(`/${currentLocale}`, `/${newLocale}`));
  };

  const short = (addr: string) => `${addr.slice(0, 4)}…${addr.slice(-4)}`;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              className="sm:hidden -ml-2 p-2"
              onClick={() => setIsDrawerOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <span>PactChain</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-4 text-sm font-medium">
              <Link href="/pacts" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("pacts")}
              </Link>
              <Link href="/activity" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("activity")}
              </Link>
            </div>
            
            {address ? (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full font-mono border border-border hidden sm:inline-block">
                  {short(address)}
                </span>
                <Button variant="outline" size="sm" onClick={disconnect} className="hidden sm:flex">
                  {t("disconnect")}
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={connect} disabled={connecting}>
                {connecting ? t("connecting") : t("connectWallet")}
              </Button>
            )}

            <button
              className="hidden sm:flex p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setIsDrawerOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Drawer Content */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-3/4 max-w-sm border-r bg-background p-6 shadow-lg transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-8">
          <span className="font-bold text-lg">Menu</span>
          <button onClick={() => setIsDrawerOpen(false)} className="p-2 -mr-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Settings</h4>
            
            <button 
              onClick={toggleLocale}
              className="flex items-center justify-between w-full p-3 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Language</span>
              </div>
              <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{currentLocale.toUpperCase()}</span>
            </button>

            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center justify-between w-full p-3 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                {theme === "dark" ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
                <span className="font-medium">Theme</span>
              </div>
              <span className="text-sm text-muted-foreground capitalize">{theme}</span>
            </button>
          </div>

          {address && (
            <div className="flex flex-col gap-2 mt-auto">
              <div className="p-3 bg-muted rounded-lg border border-border flex items-center justify-between">
                <span className="text-sm font-medium">Wallet</span>
                <span className="text-xs font-mono">{short(address)}</span>
              </div>
              <Button variant="outline" className="w-full justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/50" onClick={() => { disconnect(); setIsDrawerOpen(false); }}>
                {t("disconnect")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
