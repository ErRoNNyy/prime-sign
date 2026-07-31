import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRecipientByToken, writeAudit } from "@/lib/envelope/actions";
import { SignClient } from "@/components/pdf-dynamic";
import type { Field } from "@/lib/types/database";

export default async function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const recipient = await getRecipientByToken(token);
  if (!recipient) notFound();

  const admin = createAdminClient();
  const { data: envelope } = await admin
    .from("envelopes")
    .select("*, documents(*)")
    .eq("id", recipient.envelope_id)
    .single();

  if (!envelope) notFound();

  const { data: fields } = await admin
    .from("fields")
    .select("*")
    .eq("recipient_id", recipient.id);

  const document =
    envelope.documents.find((d: { is_final: boolean }) => !d.is_final) ??
    envelope.documents[0];

  const { data: signed } = await admin.storage
    .from("documents")
    .createSignedUrl(document.storage_path, 60 * 60);

  if (recipient.status === "notified" || recipient.status === "pending") {
    const { data: existingOpen } = await admin
      .from("audit_events")
      .select("id")
      .eq("envelope_id", envelope.id)
      .eq("action", "opened")
      .eq("actor_email", recipient.email)
      .limit(1)
      .maybeSingle();

    if (!existingOpen) {
      await writeAudit(
        envelope.id,
        "opened",
        recipient.email,
        { recipient_id: recipient.id },
        true,
      );
    }
  }

  return (
    <div className="relative isolate min-h-dvh flex-1 overflow-x-hidden bg-[#0a0a0a] px-3 py-8 text-ink sm:px-6">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 15% 0%, rgba(122,139,105,0.14), transparent 55%), radial-gradient(ellipse 60% 45% at 90% 10%, rgba(212,198,185,0.08), transparent 50%), linear-gradient(180deg, #0c0b0a 0%, #0a0a0a 45%, #0e0d0b 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-2.5 z-30 border border-ink/15 sm:inset-3"
        aria-hidden
      />
      <div className="relative z-10">
        <SignClient
          token={token}
          recipientName={recipient.name}
          recipientEmail={recipient.email}
          subject={envelope.subject}
          pdfUrl={signed?.signedUrl ?? ""}
          fields={(fields ?? []) as Field[]}
          alreadyVerified={recipient.status === "otp_verified"}
          alreadyCompleted={recipient.status === "completed"}
          envelopeCompleted={envelope.status === "completed"}
        />
      </div>
    </div>
  );
}
