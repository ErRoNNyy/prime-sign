"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAccessToken, hashToken } from "@/lib/otp";
import { writeAudit } from "@/lib/envelope/actions";
import type { Envelope, Recipient } from "@/lib/types/database";

export type InboxItem = {
  recipient: Recipient;
  envelope: Pick<
    Envelope,
    "id" | "subject" | "status" | "created_at" | "sent_at"
  >;
};

export async function getMySigningInbox(): Promise<InboxItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("recipients")
    .select("*, envelopes(id, subject, status, created_at, sent_at)")
    .ilike("email", user.email)
    .not("status", "in", '("completed","declined")');

  if (error || !data) return [];

  const items: InboxItem[] = [];
  for (const row of data) {
    const { envelopes, ...recipient } = row as Recipient & {
      envelopes: InboxItem["envelope"] | null;
    };
    if (!envelopes) continue;
    if (envelopes.status !== "sent" && envelopes.status !== "in_progress") {
      continue;
    }
    items.push({
      recipient: recipient as Recipient,
      envelope: envelopes,
    });
  }

  return items.sort(
    (a, b) => a.recipient.routing_order - b.recipient.routing_order,
  );
}

export async function openMySigningFormAction(formData: FormData) {
  const recipientId = String(formData.get("recipientId") ?? "");
  if (!recipientId) return { error: "Missing recipient" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { data: recipient, error } = await admin
    .from("recipients")
    .select("*")
    .eq("id", recipientId)
    .maybeSingle();

  if (error || !recipient) return { error: "Invitation not found" };
  if (recipient.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: "This invitation is not for your account" };
  }
  if (recipient.status === "completed") {
    return { error: "Already completed" };
  }

  const token = generateAccessToken();
  const { error: updateErr } = await admin
    .from("recipients")
    .update({ access_token_hash: hashToken(token) })
    .eq("id", recipient.id);
  if (updateErr) return { error: updateErr.message };

  await writeAudit(
    recipient.envelope_id,
    "inbox_opened",
    user.email,
    { recipient_id: recipient.id },
    true,
  );

  redirect(`/sign/${token}`);
}
