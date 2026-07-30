"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAccessToken, hashToken } from "@/lib/otp";
import { writeAudit } from "@/lib/envelope/actions";
import type { Envelope, Recipient } from "@/lib/types/database";

export type HistoryItem = {
  recipient: Recipient;
  envelope: Pick<
    Envelope,
    "id" | "subject" | "status" | "created_at" | "sent_at" | "completed_at"
  >;
};

export async function getMySigningHistory(): Promise<HistoryItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("recipients")
    .select(
      "*, envelopes(id, subject, status, created_at, sent_at, completed_at)",
    )
    .ilike("email", user.email)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const items: HistoryItem[] = [];
  for (const row of data) {
    const { envelopes, ...recipient } = row as Recipient & {
      envelopes: HistoryItem["envelope"] | null;
    };
    if (!envelopes) continue;
    // Skip drafts the user somehow appears on; only sent/in progress/completed/etc.
    if (envelopes.status === "draft") continue;
    items.push({
      recipient: recipient as Recipient,
      envelope: envelopes,
    });
  }

  return items;
}

export async function openHistorySigningAction(formData: FormData) {
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
    "history_opened",
    user.email,
    { recipient_id: recipient.id },
    true,
  );

  redirect(`/sign/${token}`);
}
