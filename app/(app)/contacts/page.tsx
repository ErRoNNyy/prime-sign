import { createClient } from "@/lib/supabase/server";
import { ContactsClient } from "@/components/contacts-client";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import type { Contact } from "@/lib/types/database";

export default async function ContactsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .order("name", { ascending: true });

  return (
    <div>
      <RealtimeRefresh tables={["contacts"]} />
      <h1 className="font-display text-3xl font-medium italic tracking-tight text-ink">
        Contacts
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Pick recipients from your contact base when preparing envelopes.
      </p>
      <ContactsClient contacts={(data ?? []) as Contact[]} />
    </div>
  );
}
