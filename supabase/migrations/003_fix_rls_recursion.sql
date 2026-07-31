-- Fix: drop recursive recipient RLS policies that hid owners' envelopes.
-- Those policies queried recipients ↔ envelopes under RLS and broke SELECTs.

drop policy if exists "Recipients view envelopes sent to them" on public.envelopes;
drop policy if exists "Recipients view own recipient rows" on public.recipients;
drop policy if exists "Recipients view audit of their envelopes" on public.audit_events;
