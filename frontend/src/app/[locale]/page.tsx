import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ShieldCheck, Gavel, Zap } from "lucide-react";

export default function Home() {
  const t = useTranslations("Index");

  return (
    <section className="max-w-4xl mx-auto px-4 py-12 sm:py-24">
      <div className="text-center mb-16">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground mb-6">
          {t("title")}
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t("description")}
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild className="w-full sm:w-auto font-semibold">
            <Link href="/create">{t("createPact")}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="w-full sm:w-auto font-semibold">
            <Link href="/join/demo">{t("seeExample")}</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <ShieldCheck className="h-8 w-8 text-primary mb-2" />
            <CardTitle>{t("features.trustless.title")}</CardTitle>
            <CardDescription>{t("features.trustless.desc")}</CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader>
            <Gavel className="h-8 w-8 text-primary mb-2" />
            <CardTitle>{t("features.resolution.title")}</CardTitle>
            <CardDescription>{t("features.resolution.desc")}</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Zap className="h-8 w-8 text-primary mb-2" />
            <CardTitle>{t("features.payout.title")}</CardTitle>
            <CardDescription>{t("features.payout.desc")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>
  );
}
