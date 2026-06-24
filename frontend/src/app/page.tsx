import Link from "next/link";

export default function Home() {
  return (
    <section className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-6">⛓</div>
      <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
        Make commitments<br className="hidden sm:block" /> that stick
      </h1>
      <p className="text-slate-400 text-lg mb-10 max-w-md mx-auto">
        PactChain lets groups create binding social commitments backed by USDC on Stellar.
        Winners get paid automatically — no middleman.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/create"
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-base"
        >
          Create a Pact
        </Link>
        <Link
          href="/join/demo"
          className="border border-purple-700 text-purple-300 hover:bg-purple-900/30 font-semibold px-8 py-3 rounded-xl transition-colors text-base"
        >
          See an example
        </Link>
      </div>

      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
        {features.map((f) => (
          <div key={f.title} className="bg-[#1a1730] border border-purple-900/40 rounded-xl p-5">
            <div className="text-2xl mb-2">{f.icon}</div>
            <h3 className="font-semibold text-white mb-1">{f.title}</h3>
            <p className="text-slate-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const features = [
  { icon: "🔒", title: "Trustless escrow", desc: "USDC locked in a Soroban smart contract on Stellar testnet." },
  { icon: "🗳️", title: "3 resolution modes", desc: "Majority vote, single judge, or full unanimity — your choice." },
  { icon: "⚡", title: "Auto-payout", desc: "Winner receives funds instantly. 2% fee funds the protocol treasury." },
];
