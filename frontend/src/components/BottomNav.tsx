"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Home, Activity, FileText, User } from "lucide-react";

export default function BottomNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  // Basic path matching to avoid complicated regexes
  const isActive = (path: string) => {
    // pathname includes the locale e.g. /en/something
    if (path === "/") return pathname.endsWith("/en") || pathname.endsWith("/pt") || pathname === "/";
    return pathname.includes(path);
  };

  const navItems = [
    { label: t("home"), icon: Home, href: "/" },
    { label: t("activity"), icon: Activity, href: "/activity" },
    { label: t("pacts"), icon: FileText, href: "/pacts" },
    { label: t("profile"), icon: User, href: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t bg-background/80 backdrop-blur-md pb-safe pt-2 px-6 sm:hidden">
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-1 p-2 ${
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
