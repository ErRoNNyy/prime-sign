import { getMySigningHistory, openHistorySigningAction } from "@/app/history-actions";
import type { EnvelopeStatus, RecipientStatus } from "@/lib/types/database";

const envelopeStyles: Record<EnvelopeStatus, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  sent: "bg-sky-100 text-sky-800",
  in_progress: "bg-amber-100 text-amber-900",
  completed: "bg-teal-100 text-teal-900",
  declined: "bg-red-100 text-red-800",
  voided: "bg-zinc-200 text-zinc-600",
};

function canSign(status: RecipientStatus) {
  return status !== "completed" && status !== "declined";
}

export default async function HistoryPage() {
  const items = await getMySigningHistory();
  const actionNeeded = items.filter((i) => canSign(i.recipient.status));
  const finished = items.filter((i) => !canSign(i.recipient.status));

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        History
      </h1>
      <p className="mt-1 text-sm text-muted">
        Envelopes sent to your account email — waiting for you or already
        signed.
      </p>

      {!items.length ? (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <p className="font-display text-xl font-semibold">No signing history</p>
          <p className="mt-2 mx-auto max-w-md text-sm text-muted">
            When someone sends you an envelope using this login email, it
            appears here.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Action needed ({actionNeeded.length})
            </h2>
            {!actionNeeded.length ? (
              <p className="mt-3 text-sm text-muted">Nothing waiting for you.</p>
            ) : (
              <HistoryList items={actionNeeded} showSign />
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Completed / declined ({finished.length})
            </h2>
            {!finished.length ? (
              <p className="mt-3 text-sm text-muted">No finished items yet.</p>
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
    <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {items.map(({ recipient, envelope }) => (
        <li
          key={recipient.id}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
        >
          <div>
            <p className="font-medium">{envelope.subject}</p>
            <p className="mt-1 text-sm text-muted">
              Your role: {recipient.role} · your status:{" "}
              {recipient.status.replaceAll("_", " ")}
              {envelope.sent_at
                ? ` · sent ${new Date(envelope.sent_at).toLocaleDateString()}`
                : ""}
            </p>
            <span
              className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${envelopeStyles[envelope.status]}`}
            >
              Envelope: {envelope.status.replace("_", " ")}
            </span>
          </div>
          {showSign && (
            <form action={openHistorySigningAction}>
              <input type="hidden" name="recipientId" value={recipient.id} />
              <button
                type="submit"
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                Review &amp; sign
              </button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}
