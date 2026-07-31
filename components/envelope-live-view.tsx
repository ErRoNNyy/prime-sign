"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DownloadCompletedButton } from "@/components/download-completed-button";
import type {
  AuditEvent,
  EnvelopeStatus,
  Recipient,
} from "@/lib/types/database";

const statusStyles: Record<EnvelopeStatus, string> = {
  draft: "bg-white/10 text-ink-soft",
  sent: "bg-sky-500/20 text-sky-200",
  in_progress: "bg-amber-500/20 text-amber-200",
  completed: "bg-sage/25 text-sage-hover",
  declined: "bg-red-500/20 text-red-300",
  voided: "bg-white/10 text-ink-soft",
};

type Props = {
  envelopeId: string;
  subject: string;
  initialStatus: EnvelopeStatus;
  initialRecipients: Recipient[];
  initialAudits: AuditEvent[];
  currentPdfUrl: string | null;
};

export function EnvelopeLiveView({
  envelopeId,
  subject,
  initialStatus,
  initialRecipients,
  initialAudits,
  currentPdfUrl,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [recipients, setRecipients] = useState(initialRecipients);
  const [audits, setAudits] = useState(initialAudits);
  const [live, setLive] = useState(false);

  useEffect(() => {
    setStatus(initialStatus);
    setRecipients(initialRecipients);
    setAudits(initialAudits);
  }, [initialStatus, initialRecipients, initialAudits]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`envelope-live:${envelopeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_events",
          filter: `envelope_id=eq.${envelopeId}`,
        },
        (payload) => {
          const row = payload.new as AuditEvent;
          setAudits((prev) => {
            if (prev.some((e) => e.id === row.id)) return prev;
            return [row, ...prev];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "recipients",
          filter: `envelope_id=eq.${envelopeId}`,
        },
        (payload) => {
          const row = payload.new as Recipient;
          setRecipients((prev) =>
            prev
              .map((r) => (r.id === row.id ? { ...r, ...row } : r))
              .sort((a, b) => a.routing_order - b.routing_order),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "envelopes",
          filter: `id=eq.${envelopeId}`,
        },
        (payload) => {
          const row = payload.new as { status: EnvelopeStatus };
          setStatus(row.status);
        },
      )
      .subscribe((state) => {
        setLive(state === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [envelopeId]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-ink-soft transition-colors hover:text-sage"
          >
            ← Envelopes
          </Link>
          <h1 className="mt-2 font-display text-3xl font-medium italic tracking-tight text-ink">
            {subject}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-block px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[status]}`}
            >
              {String(status).replace("_", " ")}
            </span>
            <span
              className={`text-[0.65rem] uppercase tracking-[0.14em] ${
                live ? "text-sage" : "text-ink-soft"
              }`}
            >
              {live ? "Live" : "Connecting…"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {status === "completed" ? (
            <DownloadCompletedButton
              envelopeId={envelopeId}
              label="Download completed PDF"
              className="bg-sage px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-on-accent transition-colors hover:bg-sage-hover disabled:opacity-60"
            />
          ) : currentPdfUrl ? (
            <a
              href={currentPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="border border-border bg-surface/70 px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-ink transition-colors hover:border-sage hover:text-sage"
            >
              Download current PDF
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="border border-border bg-surface/70 p-5 backdrop-blur-sm">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink">
            Recipients
          </h2>
          <ul className="mt-4 space-y-3">
            {recipients.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0"
              >
                <div>
                  <p className="font-medium text-ink">
                    {r.routing_order}. {r.name}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {r.email} · {r.role}
                  </p>
                </div>
                <span className="text-xs font-medium capitalize text-ink-soft">
                  {r.status.replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-border bg-surface/70 p-5 backdrop-blur-sm">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink">
            Audit trail
          </h2>
          {!audits.length ? (
            <p className="mt-4 text-sm text-ink-soft">No events yet.</p>
          ) : (
            <ol className="mt-4 max-h-96 space-y-3 overflow-auto">
              {audits.map((event) => (
                <li
                  key={event.id}
                  className="border-b border-border pb-3 last:border-0"
                >
                  <p className="text-sm font-medium capitalize text-ink">
                    {event.action.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {event.actor_email ?? "system"} ·{" "}
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
