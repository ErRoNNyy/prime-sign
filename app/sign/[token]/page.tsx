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
    <div className="min-h-full flex-1 bg-[radial-gradient(ellipse_at_top,_#ccfbf1,_#f4f7f6_55%)] px-3 py-8 sm:px-6">
      <SignClient
        token={token}
        recipientName={recipient.name}
        recipientEmail={recipient.email}
        subject={envelope.subject}
        pdfUrl={signed?.signedUrl ?? ""}
        fields={(fields ?? []) as Field[]}
        alreadyVerified={recipient.status === "otp_verified"}
        alreadyCompleted={recipient.status === "completed"}
      />
    </div>
  );
}
