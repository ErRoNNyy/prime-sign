import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMySigningHistory, openHistorySigningAction } from "@/app/history-actions";
import { DownloadCompletedButton } from "@/components/download-completed-button";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import type { EnvelopeStatus, RecipientStatus } from "@/lib/types/database";

export const dynamic = "force-dynamic";

const envelopeStyles: Record<EnvelopeStatus, string> = {
  draft: "bg-white/10 text-ink-soft",
  sent: "bg-sky-500/20 text-sky-200",
  in_progress: "bg-amber-500/20 text-amber-200",
  completed: "bg-sage/25 text-sage-hover",
  declined: "bg-red-500/20 text-red-300",
  voided: "bg-white/10 text-ink-soft",
};

function canSign(status: RecipientStatus) {
  return status !== "completed" && status !== "declined";
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const items = await getMySigningHistory();
  const actionNeeded = items.filter((i) => canSign(i.recipient.status));
  const finished = items.filter((i) => !canSign(i.recipient.status));

  return (
    <div>
      <RealtimeRefresh tables={["envelopes", "recipients", "audit_events"]} />
      <h1 className="font-display text-3xl font-medium italic tracking-tight text-ink">
        History
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Invitations sent to{" "}
        <span className="text-ink">{user?.email ?? "your email"}</span> — waiting
        for you to sign, or already finished.
      </p>

      {!items.length ? (
        <div className="mt-10 border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
          <p className="font-display text-xl font-medium italic text-ink">
            No signing history
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            This page lists envelopes where <em>you</em> are a recipient. Ones
            you created stay under{" "}
            <Link href="/dashboard" className="text-sage hover:underline">
              Envelopes
            </Link>
            . To see an item here, someone must send an envelope to{" "}
            {user?.email ?? "your login email"}.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Action needed ({actionNeeded.length})
            </h2>
            {!actionNeeded.length ? (
              <p className="mt-3 text-sm text-ink-soft">Nothing waiting for you.</p>
            ) : (
              <HistoryList items={actionNeeded} showSign />
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Completed / declined ({finished.length})
            </h2>
            {!finished.length ? (
              <p className="mt-3 text-sm text-ink-soft">No finished items yet.</p>
            ) : (
              <HistoryList items={finished} showSign={false} />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function HistoryList({
  items,
  showSign,
}: {
  items: Awaited<ReturnType<typeof getMySigningHistory>>;
  showSign: boolean;
}) {
  return (
    <ul className="mt-3 divide-y divide-border overflow-hidden border border-border bg-surface/70 backdrop-blur-sm">
      {items.map(({ recipient, envelope }) => (
        <li
          key={recipient.id}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
        >
          <div>
            <p className="font-medium text-ink">{envelope.subject}</p>
            <p className="mt-1 text-sm text-ink-soft">
              Your role: {recipient.role} · your status:{" "}
              {recipient.status.replaceAll("_", " ")}
              {envelope.sent_at
                ? ` · sent ${new Date(envelope.sent_at).toLocaleDateString()}`
                : ""}
            </p>
            <span
              className={`mt-2 inline-block px-2.5 py-0.5 text-xs font-medium capitalize ${envelopeStyles[envelope.status]}`}
            >
              Envelope: {envelope.status.replace("_", " ")}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {envelope.status === "completed" && (
              <DownloadCompletedButton
                envelopeId={envelope.id}
                label="Download PDF"
              />
            )}
            {showSign && (
              <form action={openHistorySigningAction}>
                <input type="hidden" name="recipientId" value={recipient.id} />
                <button
                  type="submit"
                  className="bg-sage px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-on-accent transition-colors hover:bg-sage-hover"
                >
                  Review &amp; sign
                </button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
