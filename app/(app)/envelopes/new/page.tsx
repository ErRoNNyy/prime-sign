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

  const inputClass =
    "w-full border border-border bg-black/40 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-sage";

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl font-medium italic tracking-tight text-ink">
        New envelope
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Upload a PDF to start. You will add recipients and fields next.
      </p>

      <form
        action={onSubmit}
        className="mt-8 space-y-5 border border-border bg-surface/70 p-6 backdrop-blur-sm"
      >
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
            Subject
          </span>
          <input
            name="subject"
            placeholder="e.g. Q3 Vendor Agreement"
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
            Message (optional)
          </span>
          <textarea name="message" rows={3} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
            PDF document
          </span>
          <div className="border border-dashed border-border bg-black/30 px-4 py-8 text-center">
            <input
              name="file"
              type="file"
              accept="application/pdf"
              required
              className="mx-auto block w-full max-w-xs text-sm text-ink file:mr-3 file:border-0 file:bg-sage file:px-3 file:py-1.5 file:text-[0.68rem] file:font-bold file:uppercase file:tracking-[0.1em] file:text-on-accent"
              onChange={(e) =>
                setFileName(e.target.files?.[0]?.name ?? null)
              }
            />
            {fileName && (
              <p className="mt-2 text-sm text-ink-soft">Selected: {fileName}</p>
            )}
          </div>
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-sage py-2.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-on-accent transition-colors hover:bg-sage-hover disabled:opacity-60"
        >
          {pending ? "Uploading…" : "Continue to prepare"}
        </button>
      </form>
    </div>
  );
}
