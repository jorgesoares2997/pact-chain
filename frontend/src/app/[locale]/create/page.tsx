"use client";

import * as React from "react";
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
  const [skipDescription, setSkipDescription] = useState(false);

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

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium leading-none text-foreground">
              {t("labels.description")}
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={skipDescription}
                onChange={(e) => {
                  setSkipDescription(e.target.checked);
                  if (e.target.checked) setForm((f) => ({ ...f, description: "" }));
                }}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary bg-background"
              />
              <span className="text-xs text-muted-foreground">{t("labels.noDescription")}</span>
            </label>
          </div>
          {!skipDescription && (
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder={t("placeholders.description")}
              value={form.description}
              onChange={set("description")}
              maxLength={500}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("labels.stake")}>
            <Input type="number" min="1" step="1" value={form.stakeAmount} onChange={set("stakeAmount")} required />
          </Field>
          <Field label={t("labels.maxParticipants")}>
            <Input type="number" min="2" max="20" value={form.maxParticipants} onChange={set("maxParticipants")} required />
          </Field>
        </div>

        <DeadlineField form={form} setForm={setForm} t={t} />

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

type DeadlinePreset = "1d" | "1w" | "1mo" | "custom";

function addDays(days: number): { date: string; time: string } {
  const d = new Date(Date.now() + days * 86_400_000);
  const date = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 5);
  return { date, time };
}

function DeadlineField({
  form,
  setForm,
  t,
}: {
  form: { deadlineDate: string; deadlineTime: string };
  setForm: React.Dispatch<React.SetStateAction<{
    title: string;
    description: string;
    stakeAmount: string;
    maxParticipants: string;
    deadlineDate: string;
    deadlineTime: string;
    mode: ResolutionMode;
    judge: string;
  }>>;
  t: ReturnType<typeof useTranslations<"Create">>;
}) {
  const [preset, setPreset] = React.useState<DeadlinePreset | null>(null);

  function applyPreset(p: DeadlinePreset) {
    setPreset(p);
    if (p === "1d") {
      const { date, time } = addDays(1);
      setForm((f) => ({ ...f, deadlineDate: date, deadlineTime: time }));
    } else if (p === "1w") {
      const { date, time } = addDays(7);
      setForm((f) => ({ ...f, deadlineDate: date, deadlineTime: time }));
    } else if (p === "1mo") {
      const { date, time } = addDays(30);
      setForm((f) => ({ ...f, deadlineDate: date, deadlineTime: time }));
    } else {
      setForm((f) => ({ ...f, deadlineDate: "", deadlineTime: "23:59" }));
    }
  }

  const presets: { key: DeadlinePreset; label: string }[] = [
    { key: "1d", label: t("deadline.presets.1d") },
    { key: "1w", label: t("deadline.presets.1w") },
    { key: "1mo", label: t("deadline.presets.1mo") },
    { key: "custom", label: t("deadline.presets.custom") },
  ];

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium leading-none text-foreground">
        {t("labels.deadline")}
      </label>

      {/* Preset pills */}
      <div className="grid grid-cols-4 gap-2">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => applyPreset(p.key)}
            className={`py-2 px-2 rounded-lg border text-xs font-semibold transition-colors text-center ${
              preset === p.key
                ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom calendar — shown when preset is custom or when a preset was applied (so user can fine-tune) */}
      {preset !== null && (
        <div className={`grid gap-3 ${preset === "custom" ? "grid-cols-2" : "grid-cols-2"}`}>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">
              {t("labels.deadlineDate")}
            </span>
            <Input
              type="date"
              value={form.deadlineDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, deadlineDate: e.target.value }))
              }
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">
              {t("labels.deadlineTime")}
            </span>
            <Input
              type="time"
              value={form.deadlineTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, deadlineTime: e.target.value }))
              }
              required
            />
          </div>
        </div>
      )}

      {preset === null && (
        <p className="text-xs text-muted-foreground">
          {t("deadline.hint")}
        </p>
      )}
    </div>
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
