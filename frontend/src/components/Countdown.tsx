"use client";

import { useState, useEffect } from "react";

function getRemaining(deadline: number) {
  const diff = deadline - Math.floor(Date.now() / 1000);
  if (diff <= 0) return { expired: true, h: 0, m: 0, s: 0 };
  return { expired: false, h: Math.floor(diff / 3600), m: Math.floor((diff % 3600) / 60), s: diff % 60 };
}

const pad = (n: number) => String(n).padStart(2, "0");

export default function Countdown({ deadline }: { deadline: number }) {
  const [rem, setRem] = useState(getRemaining(deadline));

  useEffect(() => {
    const t = setInterval(() => setRem(getRemaining(deadline)), 1000);
    return () => clearInterval(t);
  }, [deadline]);

  if (rem.expired) return <span className="text-red-400 font-mono text-sm">Deadline passed</span>;

  return (
    <span className="font-mono text-sm text-purple-300">
      {pad(rem.h)}:{pad(rem.m)}:{pad(rem.s)}
    </span>
  );
}
