import { createClient } from "@/lib/supabase/server";
import { ContactsClient } from "@/components/contacts-client";
import type { Contact } from "@/lib/types/database";

export default async function ContactsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .order("name", { ascending: true });

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Contacts
      </h1>
      <p className="mt-1 text-sm text-muted">
        Pick recipients from your contact base when preparing envelopes.
      </p>
      <ContactsClient contacts={(data ?? []) as Contact[]} />
    </div>
  );
}
