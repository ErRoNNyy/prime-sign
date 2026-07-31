"use client";

import { useState } from "react";
import { getCompletedEnvelopeDownloadUrl } from "@/app/actions";

export function DownloadCompletedButton({
  envelopeId,
  label = "Download PDF",
  className,
}: {
  envelopeId: string;
  label?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDownload() {
    setPending(true);
    setError(null);
    const result = await getCompletedEnvelopeDownloadUrl(envelopeId);
    setPending(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("url" in result && result.url) {
      const a = document.createElement("a");
      a.href = result.url;
      a.download = result.fileName ?? "agreement-completed.pdf";
      a.target = "_blank";
      a.rel = "noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => void onDownload()}
        className={
          className ??
          "border border-ink/25 px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:border-sage hover:text-sage disabled:opacity-60"
        }
      >
        {pending ? "Preparing…" : label}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
