import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrepareEnvelopeClient } from "@/components/pdf-dynamic";
import type { Contact, Field, Recipient } from "@/lib/types/database";

export default async function PrepareEnvelopePage({
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
    .select("*, documents(*), recipients(*), fields(*)")
    .eq("id", id)
    .single();

  if (!envelope) notFound();
  if (envelope.status !== "draft") redirect(`/envelopes/${id}`);

  const document =
    envelope.documents.find((d: { is_final: boolean }) => !d.is_final) ??
    envelope.documents[0];
  if (!document) notFound();

  const { data: signed } = await supabase.storage
    .from("documents")
    .createSignedUrl(document.storage_path, 60 * 60);

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .order("name");

  return (
    <PrepareEnvelopeClient
      envelopeId={envelope.id}
      subject={envelope.subject}
      message={envelope.message ?? ""}
      documentId={document.id}
      pdfUrl={signed?.signedUrl ?? ""}
      pageCount={document.page_count}
      contacts={(contacts ?? []) as Contact[]}
      initialRecipients={(envelope.recipients ?? []) as Recipient[]}
      initialFields={(envelope.fields ?? []) as Field[]}
    />
  );
}
