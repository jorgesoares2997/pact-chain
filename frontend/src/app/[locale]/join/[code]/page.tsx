"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import { api } from "@/lib/api";

// Legacy invite-code links (e.g. /join/b6f4833f) — resolve to /pact/[id]
export default function JoinRedirectPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.resolveInvite(code)
      .then((pact) => router.replace(`/pact/${pact.id}`))
      .catch((e: Error) => setError(e.message));
  }, [code]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4">
        <p className="text-muted-foreground text-sm">Invalid link: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <Spinner size="lg" />
    </div>
  );
}
