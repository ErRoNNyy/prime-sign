import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  AuditEvent,
  EnvelopeStatus,
  Recipient,
} from "@/lib/types/database";

const statusStyles: Record<EnvelopeStatus, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  sent: "bg-sky-100 text-sky-800",
  in_progress: "bg-amber-100 text-amber-900",
  completed: "bg-teal-100 text-teal-900",
  declined: "bg-red-100 text-red-800",
  voided: "bg-zinc-200 text-zinc-600",
};

export default async function EnvelopeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: envelope } = await supabase
    .from("envelopes")
    .select("*, documents(*), recipients(*), audit_events(*)")
    .eq("id", id)
    .single();

  if (!envelope) notFound();
  if (envelope.status === "draft") redirect(`/envelopes/${id}/prepare`);

  const recipients = ([...(envelope.recipients ?? [])] as Recipient[]).sort(
    (a, b) => a.routing_order - b.routing_order,
  );
  const audits = ([...(envelope.audit_events ?? [])] as AuditEvent[]).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const finalDoc = envelope.documents.find(
    (d: { is_final: boolean }) => d.is_final,
  );
  const workingDoc =
    envelope.documents.find((d: { is_final: boolean }) => !d.is_final) ??
    envelope.documents[0];

  let downloadUrl: string | null = null;
  const path = finalDoc?.storage_path ?? workingDoc?.storage_path;
  if (path) {
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, 60 * 30);
    downloadUrl = data?.signedUrl ?? null;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-muted hover:text-accent"
          >
            ← Envelopes
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {envelope.subject}
          </h1>
          <span
            className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[envelope.status as EnvelopeStatus]}`}
          >
            {String(envelope.status).replace("_", " ")}
          </span>
        </div>
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-teal-50"
          >
            {finalDoc ? "Download completed PDF" : "Download current PDF"}
          </a>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold">Recipients</h2>
          <ul className="mt-4 space-y-3">
            {recipients.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0"
              >
                <div>
                  <p className="font-medium">
                    {r.routing_order}. {r.name}
                  </p>
                  <p className="text-sm text-muted">
                    {r.email} · {r.role}
                  </p>
                </div>
                <span className="text-xs font-medium capitalize text-muted">
                  {r.status.replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold">Audit trail</h2>
          {!audits.length ? (
            <p className="mt-4 text-sm text-muted">No events yet.</p>
          ) : (
            <ol className="mt-4 max-h-96 space-y-3 overflow-auto">
              {audits.map((event) => (
                <li
                  key={event.id}
                  className="border-b border-border pb-3 last:border-0"
                >
                  <p className="text-sm font-medium capitalize">
                    {event.action.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-muted">
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
