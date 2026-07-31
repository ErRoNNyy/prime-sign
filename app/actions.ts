"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPdfPageCount } from "@/lib/pdf/stamp";
import {
  sendEnvelope as sendEnvelopeCore,
  requestOtp as requestOtpCore,
  verifyOtp as verifyOtpCore,
  completeRecipientSigning,
  getRecipientByToken,
  writeAudit,
} from "@/lib/envelope/actions";

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(254),
});

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createContact(formData: FormData) {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: "Invalid name or email" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("contacts").insert({
    owner_id: user.id,
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
  });
  if (error) return { error: error.message };
  revalidatePath("/contacts");
  return { ok: true as const };
}

export async function deleteContact(contactId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", contactId);
  if (error) return { error: error.message };
  revalidatePath("/contacts");
  return { ok: true as const };
}

export async function createEnvelope(formData: FormData) {
  const subject = String(formData.get("subject") ?? "Untitled envelope").trim();
  const message = String(formData.get("message") ?? "").trim() || null;
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please upload a PDF" };
  }
  if (file.type !== "application/pdf") {
    return { error: "Only PDF files are supported" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: envelope, error: envErr } = await supabase
    .from("envelopes")
    .insert({
      created_by: user.id,
      subject: subject || "Untitled envelope",
      message,
      status: "draft",
    })
    .select()
    .single();

  if (envErr || !envelope) return { error: envErr?.message ?? "Failed to create" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  let pageCount = 1;
  try {
    pageCount = await getPdfPageCount(bytes);
  } catch {
    pageCount = 1;
  }

  const storagePath = `${user.id}/${envelope.id}/${Date.now()}-${file.name}`;
  const { error: uploadErr } = await supabase.storage
    .from("documents")
    .upload(storagePath, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadErr) {
    await supabase.from("envelopes").delete().eq("id", envelope.id);
    return { error: uploadErr.message };
  }

  const { error: docErr } = await supabase.from("documents").insert({
    envelope_id: envelope.id,
    storage_path: storagePath,
    file_name: file.name,
    page_count: pageCount,
    is_final: false,
  });

  if (docErr) return { error: docErr.message };

  await writeAudit(envelope.id, "envelope_created", user.email ?? null, {
    file_name: file.name,
  });

  redirect(`/envelopes/${envelope.id}/prepare`);
}

const recipientInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["signer", "approver"]),
  routing_order: z.number().int().min(1),
});

export async function saveRecipients(
  envelopeId: string,
  recipients: z.infer<typeof recipientInputSchema>[],
) {
  const parsed = z.array(recipientInputSchema).min(1).safeParse(recipients);
  if (!parsed.success) return { error: "Add at least one valid recipient" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: envelope } = await supabase
    .from("envelopes")
    .select("id, status")
    .eq("id", envelopeId)
    .eq("created_by", user.id)
    .single();

  if (!envelope || envelope.status !== "draft") {
    return { error: "Envelope not editable" };
  }

  await supabase.from("fields").delete().eq("envelope_id", envelopeId);
  await supabase.from("recipients").delete().eq("envelope_id", envelopeId);

  const { data: inserted, error } = await supabase
    .from("recipients")
    .insert(
      parsed.data.map((r) => ({
        envelope_id: envelopeId,
        name: r.name,
        email: r.email.toLowerCase(),
        role: r.role,
        routing_order: r.routing_order,
        status: "pending",
      })),
    )
    .select();

  if (error) return { error: error.message };
  revalidatePath(`/envelopes/${envelopeId}/prepare`);
  return { ok: true as const, recipients: inserted };
}

const fieldInputSchema = z.object({
  recipient_id: z.string().uuid(),
  document_id: z.string().uuid(),
  type: z.enum(["signature", "approve"]),
  page: z.number().int().min(1),
  x_pct: z.number().min(0).max(100),
  y_pct: z.number().min(0).max(100),
  w_pct: z.number().min(5).max(100),
  h_pct: z.number().min(3).max(50),
  required: z.boolean(),
});

export async function saveFields(
  envelopeId: string,
  fields: z.infer<typeof fieldInputSchema>[],
) {
  const parsed = z.array(fieldInputSchema).safeParse(fields);
  if (!parsed.success) return { error: "Invalid fields" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: envelope } = await supabase
    .from("envelopes")
    .select("id, status")
    .eq("id", envelopeId)
    .eq("created_by", user.id)
    .single();

  if (!envelope || envelope.status !== "draft") {
    return { error: "Envelope not editable" };
  }

  await supabase.from("fields").delete().eq("envelope_id", envelopeId);

  if (parsed.data.length) {
    const { error } = await supabase.from("fields").insert(
      parsed.data.map((f) => ({
        envelope_id: envelopeId,
        ...f,
      })),
    );
    if (error) return { error: error.message };
  }

  revalidatePath(`/envelopes/${envelopeId}/prepare`);
  return { ok: true as const };
}

export async function updateEnvelopeMeta(
  envelopeId: string,
  subject: string,
  message: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("envelopes")
    .update({
      subject: subject.trim() || "Untitled envelope",
      message: message.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", envelopeId);
  if (error) return { error: error.message };
  return { ok: true as const };
}

export async function sendEnvelopeAction(envelopeId: string) {
  try {
    await sendEnvelopeCore(envelopeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send" };
  }
  revalidatePath("/dashboard");
  revalidatePath(`/envelopes/${envelopeId}`);
  redirect(`/envelopes/${envelopeId}`);
}

export async function requestOtpAction(
  token: string,
  options?: { force?: boolean },
) {
  try {
    const result = await requestOtpCore(token, options);
    revalidatePath("/dashboard");
    revalidatePath("/history");
    return result;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send OTP" };
  }
}

export async function verifyOtpAction(token: string, code: string) {
  try {
    const result = await verifyOtpCore(token, code);
    revalidatePath("/dashboard");
    revalidatePath("/history");
    return result;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Verification failed" };
  }
}

export async function submitSigningAction(
  token: string,
  fieldValues: Array<{ fieldId: string; value: string }>,
) {
  try {
    const result = await completeRecipientSigning({ token, fieldValues });
    const recipient = await getRecipientByToken(token);
    revalidatePath("/dashboard");
    revalidatePath("/history");
    if (recipient?.envelope_id) {
      revalidatePath(`/envelopes/${recipient.envelope_id}`);
    }
    if (result.completed) {
      const download = await createFinalDownloadForToken(token);
      if ("url" in download && download.url) {
        return {
          ...result,
          url: download.url,
          fileName: download.fileName,
        };
      }
    }
    return result;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Signing failed" };
  }
}

export async function getCompletedEnvelopeDownloadUrl(envelopeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { data: envelope } = await admin
    .from("envelopes")
    .select("id, created_by, status, documents(id, storage_path, file_name, is_final)")
    .eq("id", envelopeId)
    .maybeSingle();

  if (!envelope) return { error: "Envelope not found" };

  const isOwner = envelope.created_by === user.id;
  if (!isOwner) {
    const { data: recipient } = await admin
      .from("recipients")
      .select("id")
      .eq("envelope_id", envelopeId)
      .ilike("email", user.email)
      .maybeSingle();
    if (!recipient) return { error: "Unauthorized" };
  }

  if (envelope.status !== "completed") {
    return { error: "Agreement is not fully completed yet" };
  }

  return createSignedDownloadFromDocuments(envelope.documents ?? []);
}

export async function getCompletedDocumentByToken(token: string) {
  try {
    return await createFinalDownloadForToken(token);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Download failed" };
  }
}

async function createFinalDownloadForToken(token: string) {
  const recipient = await getRecipientByToken(token);
  if (!recipient) return { error: "Invalid signing link" };

  const admin = createAdminClient();
  const { data: envelope } = await admin
    .from("envelopes")
    .select("status, documents(id, storage_path, file_name, is_final)")
    .eq("id", recipient.envelope_id)
    .maybeSingle();

  if (!envelope) return { error: "Envelope not found" };
  if (envelope.status !== "completed") {
    return { error: "Agreement is not fully completed yet" };
  }

  return createSignedDownloadFromDocuments(envelope.documents ?? []);
}

async function createSignedDownloadFromDocuments(
  documents: Array<{
    storage_path: string;
    file_name: string;
    is_final: boolean;
  }>,
) {
  const finalDoc =
    documents.find((d) => d.is_final) ??
    documents[0];
  if (!finalDoc) return { error: "No document available" };

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("documents")
    .createSignedUrl(finalDoc.storage_path, 60 * 30);
  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "Could not create download link" };
  }

  return {
    url: data.signedUrl,
    fileName: finalDoc.file_name || "agreement-completed.pdf",
  };
}

export async function getSignedDocumentUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 60 * 60);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}
