import { useState, useEffect } from "react";

export default function Countdown({ deadline }) {
  const [remaining, setRemaining] = useState(getRemaining(deadline));

  useEffect(() => {
    const t = setInterval(() => setRemaining(getRemaining(deadline)), 1000);
    return () => clearInterval(t);
  }, [deadline]);

  if (remaining.expired) {
    return <span className="text-red-400 font-mono text-sm">Deadline passed</span>;
  }

  return (
    <span className="font-mono text-sm text-purple-300">
      {pad(remaining.h)}:{pad(remaining.m)}:{pad(remaining.s)}
    </span>
  );
}

function getRemaining(deadline) {
  const diff = deadline - Math.floor(Date.now() / 1000);
  if (diff <= 0) return { expired: true };
  return {
    expired: false,
    h: Math.floor(diff / 3600),
    m: Math.floor((diff % 3600) / 60),
    s: diff % 60,
  };
}

const pad = (n) => String(n).padStart(2, "0");
