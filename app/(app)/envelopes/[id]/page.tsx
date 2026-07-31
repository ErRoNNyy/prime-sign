import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EnvelopeLiveView } from "@/components/envelope-live-view";
import type {
  AuditEvent,
  EnvelopeStatus,
  Recipient,
} from "@/lib/types/database";

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

  let currentPdfUrl: string | null = null;
  if (envelope.status !== "completed") {
    const path = workingDoc?.storage_path;
    if (path) {
      const { data } = await supabase.storage
        .from("documents")
        .createSignedUrl(path, 60 * 30);
      currentPdfUrl = data?.signedUrl ?? null;
    }
  } else if (finalDoc?.storage_path) {
    // completed downloads use the button + admin signed URL
    currentPdfUrl = null;
  }

  return (
    <EnvelopeLiveView
      envelopeId={envelope.id}
      subject={envelope.subject}
      initialStatus={envelope.status as EnvelopeStatus}
      initialRecipients={recipients}
      initialAudits={audits}
      currentPdfUrl={currentPdfUrl}
    />
  );
}
