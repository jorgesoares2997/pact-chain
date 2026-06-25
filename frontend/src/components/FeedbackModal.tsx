"use client";

import { useState } from "react";
import { MessageSquarePlus, X } from "lucide-react";

// To get the embed URL: open the form → Send → embed icon (<>) → copy src
// Short link below works but replace with the ?embedded=true version to hide the header bar
const FORM_URL = "https://forms.gle/9FtvpTpyxHemBzVD7";

export default function FeedbackModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 sm:bottom-6"
        aria-label="Give feedback"
      >
        <MessageSquarePlus className="h-4 w-4" />
        Feedback
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-x-4 bottom-0 top-auto z-50 mx-auto max-w-lg rounded-t-2xl border border-border bg-background shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Share your feedback</h2>
              <p className="text-xs text-muted-foreground">Help us improve PactChain ✦</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Embedded form */}
          <div className="h-[480px] sm:h-[520px]">
            <iframe
              src={FORM_URL}
              className="h-full w-full rounded-b-2xl"
              frameBorder="0"
              title="PactChain Feedback Form"
            >
              Loading form…
            </iframe>
          </div>
        </div>
      )}
    </>
  );
}
