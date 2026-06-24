"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import ConnectWalletGate from "@/components/ConnectWalletGate";
import Spinner from "@/components/Spinner";
import { useWallet } from "@/context/WalletContext";
import { api } from "@/lib/api";
import type { ResolutionMode } from "@/types/pact";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function CreatePactPage() {
  return (
    <ConnectWalletGate>
      <CreatePactForm />
    </ConnectWalletGate>
  );
}

function CreatePactForm() {
  const t = useTranslations("Create");
  const { address } = useWallet();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    stakeAmount: "10",
    maxParticipants: "5",
    deadlineDate: "",
    deadlineTime: "23:59",
    mode: "MAJORITY" as ResolutionMode,
    judge: "",
  });

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error(t("errors.titleRequired"));
    if (!form.deadlineDate) return toast.error(t("errors.deadlineRequired"));
    if (form.mode === "JUDGE" && !form.judge.trim()) return toast.error(t("errors.judgeRequired"));

    const deadlineUnix = Math.floor(
      new Date(`${form.deadlineDate}T${form.deadlineTime}:00`).getTime() / 1000
    );
    if (deadlineUnix <= Math.floor(Date.now() / 1000)) {
      return toast.error(t("errors.deadlineFuture"));
    }

    setLoading(true);
    try {
      const result = await api.createPact({
        contractId: process.env.NEXT_PUBLIC_CONTRACT_ID ?? "TESTNET_PLACEHOLDER",
        title: form.title,
        description: form.description,
        creator: address!,
        stakeAmount: Math.round(parseFloat(form.stakeAmount) * 1e7),
        maxParticipants: parseInt(form.maxParticipants),
        deadline: deadlineUnix,
        resolutionMode: form.mode,
        judge: form.judge || undefined,
      });

      await api.logInteraction(address!, "pact_created", result.id);
      
      toast.success(t("success"));
      router.push(`/pact/${result.id}?invite=${result.code}`);
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to create pact");
    } finally {
      setLoading(false);
    }
  }

  const modes: ResolutionMode[] = ["MAJORITY", "JUDGE", "UNANIMITY"];

  return (
    <main className="max-w-lg mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Field label={t("labels.title")}>
          <Input
            placeholder={t("placeholders.title")}
            value={form.title}
            onChange={set("title")}
            maxLength={80}
            required
          />
        </Field>

        <Field label={t("labels.description")}>
          <textarea
            className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            placeholder={t("placeholders.description")}
            value={form.description}
            onChange={set("description")}
            maxLength={500}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("labels.stake")}>
            <Input type="number" min="1" step="1" value={form.stakeAmount} onChange={set("stakeAmount")} required />
          </Field>
          <Field label={t("labels.maxParticipants")}>
            <Input type="number" min="2" max="20" value={form.maxParticipants} onChange={set("maxParticipants")} required />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("labels.deadlineDate")}>
            <Input type="date" value={form.deadlineDate} onChange={set("deadlineDate")} required />
          </Field>
          <Field label={t("labels.deadlineTime")}>
            <Input type="time" value={form.deadlineTime} onChange={set("deadlineTime")} required />
          </Field>
        </div>

        <Field label={t("labels.mode")}>
          <div className="flex flex-col gap-3 mt-1">
            {modes.map((m) => (
              <label
                key={m}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                  form.mode === m
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  checked={form.mode === m}
                  onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as ResolutionMode }))}
                  className="mt-1 h-4 w-4 shrink-0 text-primary focus:ring-primary border-input bg-background"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none text-foreground mb-1.5">{t(`modes.${m}.label`)}</span>
                  <span className="text-xs text-muted-foreground">{t(`modes.${m}.desc`)}</span>
                </div>
              </label>
            ))}
          </div>
        </Field>

        {form.mode === "JUDGE" && (
          <Field label={t("labels.judge")}>
            <Input
              className="font-mono"
              placeholder={t("placeholders.judge")}
              value={form.judge}
              onChange={set("judge")}
              required
            />
          </Field>
        )}

        <Button
          type="submit"
          disabled={loading}
          size="lg"
          className="mt-4 w-full"
        >
          {loading && <Spinner size="sm" />}
          {loading ? t("submitting") : t("submit")}
        </Button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium leading-none text-foreground">{label}</label>
      {children}
    </div>
  );
}
