"use client";

import { useState } from "react";
import { createEnvelope } from "@/app/actions";

export default function NewEnvelopePage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createEnvelope(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        New envelope
      </h1>
      <p className="mt-1 text-sm text-muted">
        Upload a PDF to start. You will add recipients and fields next.
      </p>

      <form
        action={onSubmit}
        className="mt-8 space-y-5 rounded-xl border border-border bg-surface p-6"
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Subject</span>
          <input
            name="subject"
            placeholder="e.g. Q3 Vendor Agreement"
            className="w-full rounded-md border border-border px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Message (optional)</span>
          <textarea
            name="message"
            rows={3}
            className="w-full rounded-md border border-border px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">PDF document</span>
          <div className="rounded-md border border-dashed border-border bg-teal-50/40 px-4 py-8 text-center">
            <input
              name="file"
              type="file"
              accept="application/pdf"
              required
              className="mx-auto block w-full max-w-xs text-sm"
              onChange={(e) =>
                setFileName(e.target.files?.[0]?.name ?? null)
              }
            />
            {fileName && (
              <p className="mt-2 text-sm text-muted">Selected: {fileName}</p>
            )}
          </div>
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Uploading…" : "Continue to prepare"}
        </button>
      </form>
    </div>
  );
}
