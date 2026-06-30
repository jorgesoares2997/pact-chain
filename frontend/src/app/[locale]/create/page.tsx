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
import { deployAndInitializePact } from "@/lib/stellar";
import type { PactType, ResolutionMode } from "@/types/pact";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, MessageSquare, Target } from "lucide-react";

export default function CreatePactPage() {
  return (
    <ConnectWalletGate>
      <CreatePactFlow />
    </ConnectWalletGate>
  );
}

type Step = "select" | "form";

function CreatePactFlow() {
  const [step, setStep] = useState<Step>("select");
  const [pactType, setPactType] = useState<PactType>("OPINION");

  if (step === "select") {
    return <TypeSelectionScreen onSelect={(type) => { setPactType(type); setStep("form"); }} />;
  }

  return (
    <CreatePactForm
      pactType={pactType}
      onBack={() => setStep("select")}
    />
  );
}

function TypeSelectionScreen({ onSelect }: { onSelect: (type: PactType) => void }) {
  const t = useTranslations("Create");

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 sm:py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
          {t("selectType.title")}
        </h1>
        <p className="text-muted-foreground text-base">
          {t("selectType.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Opinion Pact */}
        <button
          onClick={() => onSelect("OPINION")}
          className="group flex flex-col items-start gap-4 p-6 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-foreground">
                {t("selectType.opinion.title")}
              </span>
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                {t("selectType.opinion.subtitle")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {t("selectType.opinion.desc")}
            </p>
            <p className="text-xs text-muted-foreground/70 italic">
              {t("selectType.opinion.examples")}
            </p>
          </div>
          <span className="mt-auto inline-flex items-center justify-center w-full rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2.5 group-hover:bg-primary/90 transition-colors">
            {t("selectType.opinion.cta")}
          </span>
        </button>

        {/* Commitment Pact */}
        <button
          onClick={() => onSelect("COMMITMENT")}
          className="group flex flex-col items-start gap-4 p-6 rounded-2xl border-2 border-border bg-card hover:border-amber-500 hover:bg-amber-500/5 transition-all text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
            <Target className="h-6 w-6 text-amber-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-foreground">
                {t("selectType.commitment.title")}
              </span>
              <span className="text-xs font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                {t("selectType.commitment.subtitle")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {t("selectType.commitment.desc")}
            </p>
            <p className="text-xs text-muted-foreground/70 italic">
              {t("selectType.commitment.examples")}
            </p>
          </div>
          <span className="mt-auto inline-flex items-center justify-center w-full rounded-lg bg-amber-500 text-white text-sm font-semibold py-2.5 group-hover:bg-amber-600 transition-colors">
            {t("selectType.commitment.cta")}
          </span>
        </button>
      </div>
    </main>
  );
}

function CreatePactForm({ pactType, onBack }: { pactType: PactType; onBack: () => void }) {
  const t = useTranslations("Create");
  const { address, signTx } = useWallet();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isCommitment = pactType === "COMMITMENT";

  const [form, setForm] = useState({
    title: "",
    description: "",
    stakeAmount: "10",
    maxParticipants: "5",
    deadlineDate: "",
    deadlineTime: "23:59",
    mode: (isCommitment ? "JUDGE" : "MAJORITY") as ResolutionMode,
    judge: "",
    successCriteria: "",
    evidenceRequirements: "",
  });
  const [skipDescription, setSkipDescription] = useState(false);
  const [voteOptions, setVoteOptions] = useState<string[]>(["Yes", "No"]);
  const [customOptionInput, setCustomOptionInput] = useState("");

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error(t("errors.titleRequired"));
    if (!form.deadlineDate) return toast.error(t("errors.deadlineRequired"));
    if (form.mode === "JUDGE" && !form.judge.trim()) return toast.error(t("errors.judgeRequired"));
    if (isCommitment && !form.successCriteria.trim()) return toast.error(t("errors.successCriteriaRequired"));

    const deadlineUnix = Math.floor(
      new Date(`${form.deadlineDate}T${form.deadlineTime}:00`).getTime() / 1000
    );
    if (deadlineUnix <= Math.floor(Date.now() / 1000)) {
      return toast.error(t("errors.deadlineFuture"));
    }

    const finalOptions = isCommitment ? ["Yes", "No"] : voteOptions;

    setLoading(true);
    try {
      const contractId = await deployAndInitializePact({
        creatorAddress: address!,
        stakeAmountStroops: BigInt(Math.round(parseFloat(form.stakeAmount) * 1e7)),
        maxParticipants: parseInt(form.maxParticipants),
        deadlineUnix,
        resolutionMode: form.mode,
        judge: form.judge || undefined,
        optionsCount: finalOptions.length,
        usdcToken: process.env.NEXT_PUBLIC_USDC_TOKEN_ID ?? "",
        treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? "",
        signTransaction: signTx,
      });

      const result = await api.createPact({
        contractId,
        title: form.title,
        description: form.description,
        creator: address!,
        stakeAmount: Math.round(parseFloat(form.stakeAmount) * 1e7),
        maxParticipants: parseInt(form.maxParticipants),
        deadline: deadlineUnix,
        resolutionMode: form.mode,
        judge: form.judge || undefined,
        voteOptions: finalOptions,
        pactType,
        successCriteria: isCommitment ? form.successCriteria : undefined,
        evidenceRequirements: isCommitment && form.evidenceRequirements ? form.evidenceRequirements : undefined,
      });

      await api.logInteraction(address!, "pact_created", result.id, form.title);

      toast.success(t("success"));
      router.push(`/pact/${result.id}`);
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to create pact");
    } finally {
      setLoading(false);
    }
  }

  const modes: ResolutionMode[] = ["MAJORITY", "JUDGE", "UNANIMITY"];
  const accentClass = isCommitment ? "text-amber-600" : "text-primary";
  const badgeBg = isCommitment
    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
    : "bg-primary/10 text-primary border-primary/20";

  return (
    <main className="max-w-lg mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isCommitment
              ? t("selectType.commitment.title")
              : t("selectType.opinion.title")}
          </h1>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeBg}`}>
            {isCommitment
              ? t("selectType.commitment.subtitle")
              : t("selectType.opinion.subtitle")}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Field label={t("labels.title")}>
          <Input
            placeholder={isCommitment ? t("placeholders.titleCommitment") : t("placeholders.titleOpinion")}
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

        {/* Commitment-specific fields */}
        {isCommitment && (
          <>
            <Field label={t("labels.successCriteria")}>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder={t("placeholders.successCriteria")}
                value={form.successCriteria}
                onChange={set("successCriteria")}
                maxLength={2000}
                required
              />
            </Field>

            <Field label={t("labels.evidenceRequirements")}>
              <Input
                placeholder={t("placeholders.evidenceRequirements")}
                value={form.evidenceRequirements}
                onChange={set("evidenceRequirements")}
                maxLength={200}
              />
            </Field>
          </>
        )}

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
          <JudgeField
            judge={form.judge}
            setJudge={(v) => setForm((f) => ({ ...f, judge: v }))}
            creatorAddress={address!}
            t={t}
          />
        )}

        {/* Vote options: only for Opinion pacts */}
        {!isCommitment && (
          <VoteOptionsField
            options={voteOptions}
            setOptions={setVoteOptions}
            customInput={customOptionInput}
            setCustomInput={setCustomOptionInput}
            t={t}
          />
        )}

        <Button
          type="submit"
          disabled={loading}
          size="lg"
          className={`mt-4 w-full ${isCommitment ? "bg-amber-500 hover:bg-amber-600" : ""}`}
        >
          {loading && <Spinner size="sm" />}
          {loading ? t("submitting") : t("submit")}
        </Button>
      </form>
    </main>
  );
}

type DeadlinePreset = "5m" | "1h" | "4h" | "1d" | "1w" | "custom";

function addMinutes(minutes: number): { date: string; time: string } {
  const d = new Date(Date.now() + minutes * 60_000);
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
    successCriteria: string;
    evidenceRequirements: string;
  }>>;
  t: ReturnType<typeof useTranslations<"Create">>;
}) {
  const [preset, setPreset] = React.useState<DeadlinePreset | null>(null);

  function applyPreset(p: DeadlinePreset) {
    setPreset(p);
    const minutesMap: Record<DeadlinePreset, number | null> = {
      "5m": 5,
      "1h": 60,
      "4h": 240,
      "1d": 1440,
      "1w": 10080,
      "custom": null,
    };
    const mins = minutesMap[p];
    if (mins !== null) {
      const { date, time } = addMinutes(mins);
      setForm((f) => ({ ...f, deadlineDate: date, deadlineTime: time }));
    } else {
      setForm((f) => ({ ...f, deadlineDate: "", deadlineTime: "23:59" }));
    }
  }

  const presets: { key: DeadlinePreset; label: string }[] = [
    { key: "5m", label: "5 min" },
    { key: "1h", label: "1 hour" },
    { key: "4h", label: "4 hours" },
    { key: "1d", label: t("deadline.presets.1d") },
    { key: "1w", label: t("deadline.presets.1w") },
    { key: "custom", label: t("deadline.presets.custom") },
  ];

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium leading-none text-foreground">
        {t("labels.deadline")}
      </label>

      <div className="grid grid-cols-3 gap-2">
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

      {preset !== null && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">
              {t("labels.deadlineDate")}
            </span>
            <Input
              type="date"
              value={form.deadlineDate}
              onChange={(e) => setForm((f) => ({ ...f, deadlineDate: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, deadlineTime: e.target.value }))}
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

function JudgeField({
  judge,
  setJudge,
  creatorAddress,
  t,
}: {
  judge: string;
  setJudge: (v: string) => void;
  creatorAddress: string;
  t: ReturnType<typeof useTranslations<"Create">>;
}) {
  const [isMe, setIsMe] = React.useState(false);

  function toggleIsMe(checked: boolean) {
    setIsMe(checked);
    setJudge(checked ? creatorAddress : "");
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium leading-none text-foreground">{t("labels.judge")}</label>

      <label className="flex items-center gap-3 cursor-pointer select-none rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted transition-colors">
        <input
          type="checkbox"
          checked={isMe}
          onChange={(e) => toggleIsMe(e.target.checked)}
          className="h-4 w-4 rounded border-input text-primary focus:ring-primary bg-background"
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">It&apos;s me</span>
          <span className="text-xs text-muted-foreground">I will verify this pact myself</span>
        </div>
      </label>

      {!isMe && (
        <Input
          className="font-mono"
          placeholder={t("placeholders.judge")}
          value={judge}
          onChange={(e) => setJudge(e.target.value)}
          required
        />
      )}
    </div>
  );
}

function VoteOptionsField({
  options,
  setOptions,
  customInput,
  setCustomInput,
  t,
}: {
  options: string[];
  setOptions: React.Dispatch<React.SetStateAction<string[]>>;
  customInput: string;
  setCustomInput: React.Dispatch<React.SetStateAction<string>>;
  t: ReturnType<typeof useTranslations<"Create">>;
}) {
  const DEFAULT_PRESETS = [
    ["Yes", "No"],
    ["Completed", "Not completed"],
    ["Win", "Lose", "Draw"],
  ];

  function applyPreset(preset: string[]) {
    setOptions([...preset]);
  }

  function addCustom() {
    const trimmed = customInput.trim();
    if (!trimmed || options.includes(trimmed)) return;
    setOptions((o) => [...o, trimmed]);
    setCustomInput("");
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions((o) => o.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium leading-none text-foreground">
        {t("labels.voteOptions")}
      </label>
      <p className="text-xs text-muted-foreground -mt-1">{t("labels.voteOptionsHint")}</p>

      <div className="flex flex-wrap gap-2">
        {DEFAULT_PRESETS.map((preset) => {
          const label = preset.join(" / ");
          const active = JSON.stringify(options) === JSON.stringify(preset);
          return (
            <button
              key={label}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                active
                  ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {options.map((opt, idx) => (
          <span
            key={opt}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20"
          >
            {opt}
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(idx)}
                className="hover:text-destructive transition-colors leading-none"
                aria-label={`Remove ${opt}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder={t("placeholders.voteOption")}
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          maxLength={40}
        />
        <Button type="button" variant="outline" size="sm" onClick={addCustom} className="shrink-0">
          {t("labels.addOption")}
        </Button>
      </div>
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
