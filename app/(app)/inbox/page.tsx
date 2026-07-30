import Link from "next/link";
import { getMySigningInbox, openMySigningFormAction } from "@/app/inbox-actions";

export default async function InboxPage() {
  const items = await getMySigningInbox();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Inbox
      </h1>
      <p className="mt-1 text-sm text-muted">
        Documents sent to your account email that are waiting for your
        signature or approval.
      </p>

      {!items.length ? (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <p className="font-display text-xl font-semibold">Nothing to sign</p>
          <p className="mt-2 mx-auto max-w-md text-sm text-muted">
            Add the second account&apos;s <strong>exact login email</strong> as
            a recipient, click <strong>Send envelope</strong>, then refresh this
            page on that account.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block text-sm font-medium text-accent hover:underline"
          >
            Back to envelopes you created
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {items.map(({ recipient, envelope }) => (
            <li
              key={recipient.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
            >
              <div>
                <p className="font-medium">{envelope.subject}</p>
                <p className="text-sm text-muted">
                  Your role: {recipient.role} · status:{" "}
                  {recipient.status.replaceAll("_", " ")}
                  {envelope.sent_at
                    ? ` · sent ${new Date(envelope.sent_at).toLocaleString()}`
                    : ""}
                </p>
              </div>
              <form action={openMySigningFormAction}>
                <input type="hidden" name="recipientId" value={recipient.id} />
                <button
                  type="submit"
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
                >
                  Review &amp; sign
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
