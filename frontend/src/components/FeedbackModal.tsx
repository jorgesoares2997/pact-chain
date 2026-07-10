"use client";

import { useState } from "react";
import { MessageSquarePlus, X, ExternalLink } from "lucide-react";

// Embed URL: Google Forms → Send → embed icon (<>) → copy src
// Replace with full viewform URL + ?embedded=true for cleanest embed
const FORM_EMBED_URL = "https://docs.google.com/forms/d/e/1FAIpQLSe-agYdbdHXQrazs4rT8/viewform?embedded=true";
const FORM_EXTERNAL_URL = "https://forms.gle/agYdbdHXQrazs4rT8";

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
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-x-3 bottom-0 top-auto z-50 mx-auto max-w-3xl rounded-t-2xl border border-border bg-background shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:w-[780px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Share your feedback</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Help us improve PactChain — takes 2 minutes ✦</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={FORM_EXTERNAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Open form in new tab"
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Embedded form */}
          <div className="h-[560px] sm:h-[620px]">
            <iframe
              src={FORM_EXTERNAL_URL}
              className="h-full w-full rounded-b-2xl"
              frameBorder="0"
              title="PactChain Feedback Form"
            >
              Loading…
            </iframe>
          </div>
        </div>
      )}
    </>
  );
}
