import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { EnvelopeStatus } from "@/lib/types/database";

const statusStyles: Record<EnvelopeStatus, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  sent: "bg-sky-100 text-sky-800",
  in_progress: "bg-amber-100 text-amber-900",
  completed: "bg-teal-100 text-teal-900",
  declined: "bg-red-100 text-red-800",
  voided: "bg-zinc-200 text-zinc-600",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: envelopes } = await supabase
    .from("envelopes")
    .select("id, subject, status, created_at, sent_at, completed_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Envelopes
          </h1>
          <p className="mt-1 text-sm text-muted">
            Create, send, and track document workflows.
          </p>
        </div>
        <Link
          href="/envelopes/new"
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          New envelope
        </Link>
      </div>

      {!envelopes?.length ? (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <p className="font-display text-xl font-semibold">No envelopes yet</p>
          <p className="mt-2 text-sm text-muted">
            Upload a PDF and invite people to sign or approve.
          </p>
          <Link
            href="/envelopes/new"
            className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Create your first envelope
          </Link>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-teal-50/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {envelopes.map((env) => (
                <tr
                  key={env.id}
                  className="border-b border-border last:border-0 hover:bg-teal-50/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={
                        env.status === "draft"
                          ? `/envelopes/${env.id}/prepare`
                          : `/envelopes/${env.id}`
                      }
                      className="font-medium text-foreground hover:text-accent"
                    >
                      {env.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[env.status as EnvelopeStatus]}`}
                    >
                      {String(env.status).replace("_", " ")}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {new Date(env.created_at).toLocaleDateString()}
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
