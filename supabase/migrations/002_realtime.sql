-- Enable realtime for live UI updates without full page reload.
-- NOTE: Do not add cross-table recipient RLS here — querying recipients
-- from envelopes policies (and vice versa) causes infinite recursion and
-- makes owner envelope lists return empty.
alter publication supabase_realtime add table public.envelopes;
alter publication supabase_realtime add table public.recipients;
alter publication supabase_realtime add table public.audit_events;
alter publication supabase_realtime add table public.contacts;
