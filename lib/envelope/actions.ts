import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  generateAccessToken,
  hashToken,
  generateOtpCode,
  hashOtp,
  OTP_TTL_MS,
  MAX_OTP_ATTEMPTS,
} from "@/lib/otp";
import {
  sendInviteEmail,
  sendOtpEmail,
  sendCompletedEmail,
} from "@/lib/email";
import { stampFieldsOntoPdf } from "@/lib/pdf/stamp";
import type { Field, Recipient } from "@/lib/types/database";

export async function writeAudit(
  envelopeId: string,
  action: string,
  actorEmail: string | null,
  meta: Record<string, unknown> = {},
  useAdmin = false,
) {
  const client = useAdmin ? createAdminClient() : await createClient();
  await client.from("audit_events").insert({
    envelope_id: envelopeId,
    action,
    actor_email: actorEmail,
    meta,
  });
}

export async function sendEnvelope(envelopeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: envelope, error: envErr } = await supabase
    .from("envelopes")
    .select("*, documents(*), recipients(*), fields(*)")
    .eq("id", envelopeId)
    .single();

  if (envErr || !envelope) throw new Error("Envelope not found");
  if (envelope.status !== "draft") throw new Error("Envelope already sent");
  if (!envelope.documents?.length) throw new Error("Upload a PDF first");
  if (!envelope.recipients?.length) throw new Error("Add at least one recipient");

  const recipients = [...envelope.recipients].sort(
    (a: Recipient, b: Recipient) => a.routing_order - b.routing_order,
  );

  for (const r of recipients) {
    const hasField = envelope.fields.some(
      (f: Field) => f.recipient_id === r.id,
    );
    if (!hasField) {
      throw new Error(`Place at least one field for ${r.email}`);
    }
  }

  const tokens = new Map<string, string>();
  for (const r of recipients) {
    const token = generateAccessToken();
    tokens.set(r.id, token);
    const { error } = await supabase
      .from("recipients")
      .update({
        access_token_hash: hashToken(token),
        status: "pending",
      })
      .eq("id", r.id);
    if (error) throw new Error(error.message);
  }

  const now = new Date().toISOString();
  const { error: statusErr } = await supabase
    .from("envelopes")
    .update({ status: "sent", sent_at: now, updated_at: now })
    .eq("id", envelopeId);
  if (statusErr) throw new Error(statusErr.message);

  await writeAudit(envelopeId, "envelope_sent", user.email ?? null, {
    recipient_count: recipients.length,
  });

  // Upsert contacts from recipients
  for (const r of recipients) {
    await supabase.from("contacts").upsert(
      {
        owner_id: user.id,
        name: r.name,
        email: r.email.toLowerCase(),
      },
      { onConflict: "owner_id,email", ignoreDuplicates: true },
    );
  }

  const first = recipients[0];
  const token = tokens.get(first.id)!;
  const notifyResult = await notifyRecipient({
    recipient: first,
    token,
    subject: envelope.subject,
    senderEmail: user.email ?? "sender",
  });

  return {
    ok: true as const,
    signingUrl: notifyResult.signingUrl,
    emailSent: notifyResult.emailSent,
    emailError: notifyResult.emailError,
  };
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function notifyRecipient(params: {
  recipient: Recipient;
  token: string;
  subject: string;
  senderEmail: string;
}) {
  const admin = createAdminClient();
  const signingUrl = `${appUrl()}/sign/${params.token}`;
  let emailSent = true;
  let emailError: string | undefined;

  try {
    await sendInviteEmail({
      to: params.recipient.email,
      recipientName: params.recipient.name,
      subject: params.subject,
      token: params.token,
      senderEmail: params.senderEmail,
    });
  } catch (e) {
    emailSent = false;
    emailError = e instanceof Error ? e.message : "Failed to send invite email";
  }

  await admin
    .from("recipients")
    .update({
      status: "notified",
      notified_at: new Date().toISOString(),
    })
    .eq("id", params.recipient.id);

  await writeAudit(
    params.recipient.envelope_id,
    "recipient_notified",
    params.recipient.email,
    {
      recipient_id: params.recipient.id,
      email_sent: emailSent,
      ...(emailError ? { email_error: emailError } : {}),
    },
    true,
  );

  return { signingUrl, emailSent, emailError };
}

export async function getRecipientByToken(token: string) {
  const admin = createAdminClient();
  const { data: recipient, error } = await admin
    .from("recipients")
    .select("*")
    .eq("access_token_hash", hashToken(token))
    .maybeSingle();
  if (error) throw new Error(error.message);
  return recipient as Recipient | null;
}

export async function requestOtp(
  token: string,
  options?: { force?: boolean },
) {
  const force = Boolean(options?.force);
  const recipient = await getRecipientByToken(token);
  if (!recipient) throw new Error("Invalid signing link");
  if (recipient.status === "completed") throw new Error("Already completed");
  if (recipient.status === "declined") throw new Error("Already declined");

  const admin = createAdminClient();

  // Ensure this recipient is the current one in routing order
  const { data: siblings } = await admin
    .from("recipients")
    .select("*")
    .eq("envelope_id", recipient.envelope_id)
    .order("routing_order", { ascending: true });

  const current = (siblings as Recipient[] | null)?.find(
    (r) => r.status !== "completed" && r.status !== "declined",
  );
  if (!current || current.id !== recipient.id) {
    throw new Error("It is not your turn to sign yet");
  }

  // Reuse a freshly issued challenge so double-mount / duplicate requests
  // don't invalidate the code the user already received.
  const { data: existing } = await admin
    .from("otp_challenges")
    .select("*")
    .eq("recipient_id", recipient.id)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const OTP_REUSE_WINDOW_MS = 90_000;
  if (
    !force &&
    existing &&
    Date.now() - new Date(existing.created_at).getTime() < OTP_REUSE_WINDOW_MS
  ) {
    return {
      ok: true as const,
      email: recipient.email,
      emailSent: true,
      reused: true as const,
    };
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  await admin
    .from("otp_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("recipient_id", recipient.id)
    .is("consumed_at", null);

  const { error } = await admin.from("otp_challenges").insert({
    recipient_id: recipient.id,
    code_hash: hashOtp(code),
    expires_at: expiresAt,
  });
  if (error) throw new Error(error.message);

  let emailSent = true;
  let emailError: string | undefined;
  try {
    await sendOtpEmail({
      to: recipient.email,
      recipientName: recipient.name,
      code,
    });
  } catch (e) {
    emailSent = false;
    emailError = e instanceof Error ? e.message : "Failed to send OTP email";
  }

  await writeAudit(
    recipient.envelope_id,
    "otp_sent",
    recipient.email,
    {
      recipient_id: recipient.id,
      email_sent: emailSent,
      ...(emailError ? { email_error: emailError } : {}),
    },
    true,
  );

  return {
    ok: true as const,
    email: recipient.email,
    emailSent,
    emailError,
    // Shown only when email fails so local testing still works
    ...(emailSent ? {} : { debugCode: code }),
  };
}

export async function verifyOtp(token: string, code: string) {
  const recipient = await getRecipientByToken(token);
  if (!recipient) throw new Error("Invalid signing link");

  const admin = createAdminClient();
  const { data: challenge } = await admin
    .from("otp_challenges")
    .select("*")
    .eq("recipient_id", recipient.id)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!challenge) throw new Error("No active OTP. Request a new code.");
  if (new Date(challenge.expires_at) < new Date()) {
    throw new Error("OTP expired. Request a new code.");
  }
  if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
    throw new Error("Too many attempts. Request a new code.");
  }

  if (challenge.code_hash !== hashOtp(code.trim())) {
    await admin
      .from("otp_challenges")
      .update({ attempts: challenge.attempts + 1 })
      .eq("id", challenge.id);
    throw new Error("Invalid code");
  }

  await admin
    .from("otp_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", challenge.id);

  await admin
    .from("recipients")
    .update({ status: "otp_verified" })
    .eq("id", recipient.id);

  await admin
    .from("envelopes")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", recipient.envelope_id)
    .in("status", ["sent", "in_progress"]);

  await writeAudit(
    recipient.envelope_id,
    "otp_verified",
    recipient.email,
    { recipient_id: recipient.id },
    true,
  );

  return { ok: true as const };
}

export async function completeRecipientSigning(params: {
  token: string;
  fieldValues: Array<{ fieldId: string; value: string }>;
}) {
  const recipient = await getRecipientByToken(params.token);
  if (!recipient) throw new Error("Invalid signing link");
  if (recipient.status !== "otp_verified") {
    throw new Error("Verify OTP before signing");
  }

  const admin = createAdminClient();

  const { data: fields } = await admin
    .from("fields")
    .select("*")
    .eq("recipient_id", recipient.id);

  const fieldList = (fields ?? []) as Field[];
  for (const field of fieldList) {
    if (!field.required) continue;
    const submitted = params.fieldValues.find((f) => f.fieldId === field.id);
    if (!submitted?.value) {
      throw new Error(`Missing required field (${field.type})`);
    }
  }

  for (const fv of params.fieldValues) {
    await admin
      .from("fields")
      .update({ value: fv.value })
      .eq("id", fv.fieldId)
      .eq("recipient_id", recipient.id);
  }

  const { data: envelope } = await admin
    .from("envelopes")
    .select("*, documents(*), fields(*), recipients(*)")
    .eq("id", recipient.envelope_id)
    .single();

  if (!envelope) throw new Error("Envelope not found");

  const workingDoc =
    envelope.documents.find((d: { is_final: boolean }) => !d.is_final) ??
    envelope.documents[0];

  const { data: fileData, error: downloadErr } = await admin.storage
    .from("documents")
    .download(workingDoc.storage_path);
  if (downloadErr || !fileData) {
    throw new Error("Could not download PDF");
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer());

  // Stamp all fields that have values (including previous recipients)
  const { data: allFields } = await admin
    .from("fields")
    .select("*")
    .eq("envelope_id", recipient.envelope_id);

  const recipientsById = Object.fromEntries(
    (envelope.recipients as Recipient[]).map((r) => [r.id, r]),
  );

  const stampedFields = ((allFields ?? []) as Field[]).map((f) => {
    const match = params.fieldValues.find((fv) => fv.fieldId === f.id);
    return {
      ...f,
      value: match?.value ?? f.value,
      recipientName: recipientsById[f.recipient_id]?.name,
    };
  });

  const stamped = await stampFieldsOntoPdf(bytes, stampedFields);

  // Overwrite working PDF with stamped version so next recipient sees progress
  const { error: uploadErr } = await admin.storage
    .from("documents")
    .upload(workingDoc.storage_path, stamped, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadErr) throw new Error(uploadErr.message);

  const now = new Date().toISOString();
  await admin
    .from("recipients")
    .update({ status: "completed", completed_at: now })
    .eq("id", recipient.id);

  const signed = fieldList.some((f) => f.type === "signature");
  const approved = params.fieldValues.some(
    (fv) =>
      fieldList.some((f) => f.id === fv.fieldId && f.type === "approve") &&
      fv.value === "true",
  );
  const denied = params.fieldValues.some(
    (fv) =>
      fieldList.some((f) => f.id === fv.fieldId && f.type === "approve") &&
      fv.value === "false",
  );
  if (signed) {
    await writeAudit(
      recipient.envelope_id,
      "signed",
      recipient.email,
      { recipient_id: recipient.id },
      true,
    );
  }
  if (approved) {
    await writeAudit(
      recipient.envelope_id,
      "approved",
      recipient.email,
      { recipient_id: recipient.id },
      true,
    );
  }
  if (denied) {
    await writeAudit(
      recipient.envelope_id,
      "denied",
      recipient.email,
      { recipient_id: recipient.id },
      true,
    );
  }
  await writeAudit(
    recipient.envelope_id,
    "recipient_completed",
    recipient.email,
    { recipient_id: recipient.id },
    true,
  );

  const { data: allRecipients } = await admin
    .from("recipients")
    .select("*")
    .eq("envelope_id", recipient.envelope_id)
    .order("routing_order", { ascending: true });

  const list = (allRecipients ?? []) as Recipient[];
  const next = list.find(
    (r) => r.status !== "completed" && r.status !== "declined",
  );

  if (next) {
    // Need plaintext token — regenerate for next recipient
    const token = generateAccessToken();
    await admin
      .from("recipients")
      .update({ access_token_hash: hashToken(token) })
      .eq("id", next.id);

    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", envelope.created_by)
      .single();

    await notifyRecipient({
      recipient: next,
      token,
      subject: envelope.subject,
      senderEmail: profile?.email ?? "sender",
    });
  } else {
    // Mark final copy
    const finalPath = workingDoc.storage_path.replace(
      /\.pdf$/i,
      "-final.pdf",
    );
    await admin.storage
      .from("documents")
      .upload(finalPath, stamped, {
        contentType: "application/pdf",
        upsert: true,
      });

    await admin.from("documents").insert({
      envelope_id: recipient.envelope_id,
      storage_path: finalPath,
      file_name: workingDoc.file_name.replace(/\.pdf$/i, "-completed.pdf"),
      page_count: workingDoc.page_count,
      is_final: true,
    });

    await admin
      .from("envelopes")
      .update({
        status: "completed",
        completed_at: now,
        updated_at: now,
      })
      .eq("id", recipient.envelope_id);

    await writeAudit(
      recipient.envelope_id,
      "envelope_completed",
      recipient.email,
      {},
      true,
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", envelope.created_by)
      .single();

    if (profile?.email) {
      try {
        await sendCompletedEmail({
          to: profile.email,
          subject: envelope.subject,
        });
      } catch {
        // non-fatal
      }
    }
  }

  return { ok: true as const, completed: !next };
}
