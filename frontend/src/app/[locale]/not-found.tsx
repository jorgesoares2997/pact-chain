import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="text-8xl font-extrabold text-primary/20 mb-4">404</div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-4">
        {t("title")}
      </h1>
      <p className="text-muted-foreground max-w-md mb-8">
        {t("description")}
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
      >
        {t("button")}
      </Link>
    </div>
  );
}
