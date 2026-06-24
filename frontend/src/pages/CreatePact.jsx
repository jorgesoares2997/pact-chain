import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ConnectWalletGate from "../components/ConnectWalletGate.jsx";
import Spinner from "../components/Spinner.jsx";
import { useWallet } from "../context/WalletContext.jsx";
import { api } from "../lib/api.js";
import { buildAndSimulate, submitSigned, CONTRACT_ID } from "../lib/stellar.js";
import { Contract, xdr } from "@stellar/stellar-sdk";

const MODES = [
  { value: "Majority", label: "Majority Vote", desc: "More than 50% of participants agree" },
  { value: "Judge", label: "Single Judge", desc: "Designated address decides the winner" },
  { value: "Unanimity", label: "Unanimity", desc: "All participants must agree (or get refunded)" },
];

export default function CreatePact() {
  return (
    <ConnectWalletGate>
      <CreatePactForm />
    </ConnectWalletGate>
  );
}

function CreatePactForm() {
  const { address, signTx } = useWallet();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    stakeAmount: "10",
    maxParticipants: "5",
    deadlineDate: "",
    deadlineTime: "23:59",
    mode: "Majority",
    judge: "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.deadlineDate) return toast.error("Deadline is required");
    if (form.mode === "Judge" && !form.judge.trim()) return toast.error("Judge address is required");

    const deadlineUnix = Math.floor(
      new Date(`${form.deadlineDate}T${form.deadlineTime}:00`).getTime() / 1000
    );
    if (deadlineUnix <= Math.floor(Date.now() / 1000)) {
      return toast.error("Deadline must be in the future");
    }

    setLoading(true);
    try {
      // Build initialize transaction
      const contract = new Contract(CONTRACT_ID);
      const stakeStroops = Math.round(parseFloat(form.stakeAmount) * 1e7);

      // Build mode ScVal
      const modeMap = { Majority: 0, Judge: 1, Unanimity: 2 };
      const modeScVal = xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol(form.mode),
      ]);

      const judgeVal = form.mode === "Judge"
        ? xdr.ScVal.scvVec([xdr.ScVal.scvAddress(xdr.ScAddress.scAddressTypeAccount(xdr.PublicKey.publicKeyTypeEd25519(Buffer.from(form.judge, "hex"))))])
        : xdr.ScVal.scvVoid();

      toast("Simulating transaction…", { icon: "⚙️" });
      // Note: in a real deploy, CONTRACT_ID will be set. For now we call the backend API directly.
      // When contract is deployed, uncomment:
      // const xdrStr = await buildAndSimulate(address, contract.call("initialize", ...))
      // const signed = await signTx(xdrStr)
      // await submitSigned(signed)

      // Register pact metadata in backend
      const result = await api.createPact({
        contractId: CONTRACT_ID || "TESTNET_PLACEHOLDER",
        title: form.title,
        description: form.description,
        creator: address,
        stakeAmount: stakeStroops,
        maxParticipants: parseInt(form.maxParticipants),
        deadline: deadlineUnix,
        resolutionMode: form.mode,
        judge: form.judge || null,
      });

      await api.logInteraction(address, "pact_created", result.id);

      // Track analytics
      if (window.plausible) window.plausible("pact_created", { props: { mode: form.mode } });

      toast.success("Pact created! Share the invite link.");
      navigate(`/pact/${result.id}?invite=${result.code}`);
    } catch (err) {
      toast.error(err.message || "Failed to create pact");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-white mb-6">Create a Pact</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="Title">
          <input
            className="input"
            placeholder="Who will finish the 30-day challenge?"
            value={form.title}
            onChange={set("title")}
            maxLength={80}
          />
        </Field>

        <Field label="Description">
          <textarea
            className="input min-h-[80px] resize-none"
            placeholder="What exactly are participants committing to?"
            value={form.description}
            onChange={set("description")}
            maxLength={500}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Stake per person (USDC)">
            <input
              type="number"
              min="1"
              step="1"
              className="input"
              value={form.stakeAmount}
              onChange={set("stakeAmount")}
            />
          </Field>
          <Field label="Max participants">
            <input
              type="number"
              min="2"
              max="20"
              className="input"
              value={form.maxParticipants}
              onChange={set("maxParticipants")}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Deadline date">
            <input type="date" className="input" value={form.deadlineDate} onChange={set("deadlineDate")} />
          </Field>
          <Field label="Deadline time">
            <input type="time" className="input" value={form.deadlineTime} onChange={set("deadlineTime")} />
          </Field>
        </div>

        <Field label="Resolution mode">
          <div className="flex flex-col gap-2">
            {MODES.map((m) => (
              <label
                key={m.value}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  form.mode === m.value
                    ? "border-purple-500 bg-purple-900/30"
                    : "border-slate-700 hover:border-slate-500"
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={m.value}
                  checked={form.mode === m.value}
                  onChange={set("mode")}
                  className="mt-0.5 accent-purple-500"
                />
                <div>
                  <div className="text-sm font-medium text-white">{m.label}</div>
                  <div className="text-xs text-slate-400">{m.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </Field>

        {form.mode === "Judge" && (
          <Field label="Judge Stellar address">
            <input
              className="input font-mono text-sm"
              placeholder="G…"
              value={form.judge}
              onChange={set("judge")}
            />
          </Field>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Spinner size="sm" />}
          {loading ? "Creating…" : "Create Pact"}
        </button>
      </form>

      <style>{`
        .input {
          width: 100%;
          background: #1a1730;
          border: 1px solid #3b3260;
          border-radius: 0.75rem;
          color: #e2e8f0;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
          box-sizing: border-box;
        }
        .input:focus { border-color: #7c3aed; }
        .input::placeholder { color: #4b5563; }
      `}</style>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
