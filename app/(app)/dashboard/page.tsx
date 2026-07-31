import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DownloadCompletedButton } from "@/components/download-completed-button";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import type { EnvelopeStatus } from "@/lib/types/database";

const statusStyles: Record<EnvelopeStatus, string> = {
  draft: "bg-white/10 text-ink-soft",
  sent: "bg-sky-500/20 text-sky-200",
  in_progress: "bg-amber-500/20 text-amber-200",
  completed: "bg-sage/25 text-sage-hover",
  declined: "bg-red-500/20 text-red-300",
  voided: "bg-white/10 text-ink-soft",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: envelopes } = await supabase
    .from("envelopes")
    .select("id, subject, status, created_at, sent_at, completed_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <RealtimeRefresh tables={["envelopes", "recipients", "audit_events"]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium italic tracking-tight text-ink">
            Envelopes
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Documents you created and sent. Signing activity for you is under
            History.
          </p>
        </div>
        <Link
          href="/envelopes/new"
          className="bg-sage px-4 py-2.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-on-accent transition-colors hover:bg-sage-hover"
        >
          New envelope
        </Link>
      </div>

      {!envelopes?.length ? (
        <div className="mt-10 border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
          <p className="font-display text-xl font-medium italic text-ink">
            No envelopes yet
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            Upload a PDF and invite people to sign or approve.
          </p>
          <Link
            href="/envelopes/new"
            className="mt-6 inline-block bg-sage px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-on-accent hover:bg-sage-hover"
          >
            Create your first envelope
          </Link>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden border border-border bg-surface/70 backdrop-blur-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-black/30 text-ink-soft">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em]">
                  Subject
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em]">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] sm:table-cell">
                  Created
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em]">
                  Download
                </th>
              </tr>
            </thead>
            <tbody>
              {envelopes.map((env) => (
                <tr
                  key={env.id}
                  className="border-b border-border last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={
                        env.status === "draft"
                          ? `/envelopes/${env.id}/prepare`
                          : `/envelopes/${env.id}`
                      }
                      className="font-medium text-ink transition-colors hover:text-sage"
                    >
                      {env.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[env.status as EnvelopeStatus]}`}
                    >
                      {String(env.status).replace("_", " ")}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft sm:table-cell">
                    {new Date(env.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {env.status === "completed" ? (
                      <DownloadCompletedButton
                        envelopeId={env.id}
                        label="Download"
                        className="border border-ink/25 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-ink transition-colors hover:border-sage hover:text-sage disabled:opacity-60"
                      />
                    ) : (
                      <span className="text-xs text-ink-soft">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
